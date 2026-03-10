'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"
import { uploadFileToR2, getFileUrl, type StorageType } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { createClient } from "@/lib/supabase/server"
import { getActivePermissionDetails, consumeEditPermission } from "./manage-permissions"
import { recordAuditLog } from "@/lib/audit"
import type { CorporateExpense } from "./manage-expenses"

export interface TranslationDocument {
    title: string
    path: string
    name: string
    type: string
    size: number
    storage: StorageType
    uploaded_at?: string
}

export interface PaymentDetail {
    sede_it: string
    sede_pe: string
    metodo_it: string
    metodo_pe: string
    cantidad: string
    tipo_cambio: number
    total: string
    moneda?: string
    monto_original?: string
    created_at?: string
    proof_path?: string
}

export interface Translation {
    id: string
    created_at: string
    client_id: string
    tracking_code: string
    document_types: string[]
    document_types_other?: string
    work_types: string[]
    work_types_other?: string
    source_language: string
    target_language: string
    delivery_date: string
    status: 'pending' | 'in_process' | 'completed' | 'delivered' | 'cancelled'
    total_amount: number
    on_account: number
    balance: number
    client_note?: string
    internal_note?: string
    documents?: TranslationDocument[]
    payment_details?: PaymentDetail[]
    agent_id?: string
    profiles?: {
        first_name: string
        last_name: string
        email: string
        phone: string
        document_number: string
    }
    agent?: {
        first_name: string
        last_name: string
    }
    linked_expenses?: CorporateExpense[]
}

export async function getTranslations() {
    const supabase = supabaseAdmin
    const { data, error } = await supabase
        .from('translations')
        .select(`
            *,
            profiles:client_id (
                first_name,
                last_name,
                email,
                phone,
                document_number
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching translations:', error)
        return []
    }

    if (data && data.length > 0) {
        const agentIds = [...new Set(data.map(d => d.agent_id).filter(Boolean))] as string[];
        if (agentIds.length > 0) {
            const { data: agents } = await supabase.from('profiles').select('id, first_name, last_name').in('id', agentIds);
            if (agents) {
                const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
                data.forEach(d => {
                    if (d.agent_id && agentMap[d.agent_id]) {
                        d.agent = agentMap[d.agent_id];
                    }
                })
            }
        }
    }

    return data
}

export async function createTranslation(formData: FormData) {
    const supabase = supabaseAdmin
    
    // 1. Core Data
    const client_id = formData.get('client_id') as string
    const document_types = JSON.parse(formData.get('document_types') as string || '[]')
    const document_types_other = formData.get('document_types_other') as string
    const work_types = JSON.parse(formData.get('work_types') as string || '[]')
    const work_types_other = formData.get('work_types_other') as string
    const source_language = formData.get('source_language') as string
    const target_language = formData.get('target_language') as string
    const delivery_date = formData.get('delivery_date') as string
    const client_note = formData.get('client_note') as string
    const internal_note = formData.get('internal_note') as string
    
    // 2. Economics
    const total_amount = parseFloat(String(formData.get('total_amount')).replace(',', '.')) || 0
    const on_account = parseFloat(String(formData.get('on_account')).replace(',', '.')) || 0
    const balance = total_amount - on_account

    const paymentDetailsRaw = formData.get('payment_details') as string
    const payment_details = paymentDetailsRaw ? JSON.parse(paymentDetailsRaw) : []
    
    for (let i = 0; i < payment_details.length; i++) {
        const file = formData.get(`payment_proof_${i}`) as File
        if (file && file.size > 0) {
            const path = `translations/payments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            await uploadFileToR2(file, path)
            payment_details[i].proof_path = path
        }
    }

    const status = formData.get('status') as string || 'pending'
    const tracking_code = formData.get('tracking_code') as string || `TRAD-${Date.now().toString().slice(-4)}`

    // 3. File Uploads
    const documents = []
    let index = 0
    while (formData.has(`document_title_${index}`)) {
        const title = formData.get(`document_title_${index}`) as string
        const file = formData.get(`document_file_${index}`) as File
        
        if (file && file.size > 0) {
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const path = `translations/${client_id}/${Date.now()}_${safeName}`
            await uploadFileToR2(file, path)
            
            documents.push({
                title: title || file.name,
                path: path,
                name: file.name,
                size: file.size,
                type: file.type,
                storage: 'r2',
                uploaded_at: new Date().toISOString()
            })
        }
        index++
    }

    const { data: { user } } = await createClient().then(c => c.auth.getUser())

    const insertData = {
        client_id,
        agent_id: user?.id,
        document_types,
        document_types_other,
        work_types,
        work_types_other,
        source_language,
        target_language,
        delivery_date,
        total_amount,
        on_account,
        balance,
        status,
        tracking_code,
        client_note,
        internal_note,
        documents,
        payment_details
    }

    const { error } = await supabase.from('translations').insert(insertData)
    if (error) return { error: error.message }

    if (user) {
        await recordAuditLog({
            actorId: user.id,
            action: 'create',
            resourceType: 'translations',
            resourceId: tracking_code || 'new',
            newValues: insertData as unknown as Record<string, unknown>,
            metadata: { 
                method: 'createTranslation',
                displayId: tracking_code || 'Traducción Nueva'
            }
        })
    }

    revalidatePath('/chimi-traducciones')
    return { success: true }
}

export async function updateTranslation(formData: FormData) {
    const supabase = await createClient()
    const adminSupabase = supabaseAdmin
    const id = formData.get('id') as string

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
        const userRole = profile?.role || 'client'

        let activeRequestId = 'admin_direct'
        let activeReason = 'Edición Directa'
        const isDraft = formData.get('isDraft') === 'true'

        if (userRole === 'agent' || userRole === 'usuario') {
            if (!isDraft) {
                const permission = await getActivePermissionDetails('translations', id)
                if (!permission.hasPermission) throw new Error('No tienes permiso para editar esta traducción.')
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
                await consumeEditPermission('translations', id)
            } else {
                activeRequestId = 'agent_proposal'
                activeReason = 'Propuesta de Borrador'
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('translations', id)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        }

        const { data: existing } = await adminSupabase.from('translations').select('*').eq('id', id).single()
        if (!existing) throw new Error('Translation not found')

        const oldValues = JSON.parse(JSON.stringify(existing))
        const currentDocs = existing.documents || []

        const document_types = JSON.parse(formData.get('document_types') as string || '[]')
        const document_types_other = formData.get('document_types_other') as string
        const work_types = JSON.parse(formData.get('work_types') as string || '[]')
        const work_types_other = formData.get('work_types_other') as string
        const source_language = formData.get('source_language') as string
        const target_language = formData.get('target_language') as string
        const delivery_date = formData.get('delivery_date') as string
        const client_note = formData.get('client_note') as string
        const internal_note = formData.get('internal_note') as string
        
        const total_amount = parseFloat(String(formData.get('total_amount')).replace(',', '.')) || 0
        const on_account = parseFloat(String(formData.get('on_account')).replace(',', '.')) || 0
        const status = formData.get('status') as string

        const paymentDetailsRaw = formData.get('payment_details') as string
        const payment_details = paymentDetailsRaw ? JSON.parse(paymentDetailsRaw) : []
        
        for (let i = 0; i < payment_details.length; i++) {
            const file = formData.get(`payment_proof_${i}`) as File
            if (file && file.size > 0) {
                const path = `translations/payments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
                await uploadFileToR2(file, path)
                payment_details[i].proof_path = path
            }
        }

        let index = 0
        while (formData.has(`document_title_${index}`)) {
            const title = formData.get(`document_title_${index}`) as string
            const file = formData.get(`document_file_${index}`) as File
            if (file && file.size > 0) {
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const path = `translations/updates/${Date.now()}_${safeName}`
                await uploadFileToR2(file, path)
                currentDocs.push({
                    title: title || file.name,
                    path: path,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    storage: 'r2',
                    uploaded_at: new Date().toISOString()
                })
            }
            index++
        }

        const updateData = {
            document_types,
            document_types_other,
            work_types,
            work_types_other,
            source_language,
            target_language,
            delivery_date,
            total_amount,
            on_account,
            balance: total_amount - on_account,
            status,
            client_note,
            internal_note,
            documents: currentDocs,
            payment_details
        }

        if (isDraft) return { success: true, draftData: updateData }

        const { error } = await adminSupabase.from('translations').update(updateData).eq('id', id)
        if (error) throw error

        await recordAuditLog({
            actorId: user.id,
            action: 'update',
            resourceType: 'translations',
            resourceId: id,
            oldValues: oldValues,
            newValues: updateData,
            metadata: { 
                method: 'updateTranslation',
                displayId: existing?.tracking_code || undefined,
                requestId: activeRequestId,
                reason: activeReason
            }
        })

        revalidatePath('/chimi-traducciones')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error updating translation:', error)
        return { error: error instanceof Error ? error.message : 'Error al actualizar traducción' }
    }
}

export async function deleteTranslation(id: string) {
    const supabase = await createClient()
    const adminSupabase = supabaseAdmin
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')
        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'supervisor') {
            throw new Error('Solo los administradores o supervisores pueden eliminar traducciones.')
        }
        const { data: translation } = await adminSupabase.from('translations').select('*').eq('id', id).single()
        if (!translation) throw new Error('Traducción no encontrada')
        const { error } = await adminSupabase.from('translations').delete().eq('id', id)
        if (error) throw error
        await recordAuditLog({
            actorId: user.id,
            action: 'delete',
            resourceType: 'translations',
            resourceId: id,
            oldValues: translation,
            metadata: { 
                method: 'deleteTranslation',
                displayId: translation?.tracking_code || undefined
            }
        })
        revalidatePath('/chimi-traducciones')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error deleting translation:', error)
        return { error: error instanceof Error ? error.message : 'Error al eliminar traducción' }
    }
}

export async function updateTranslationStatus(id: string, status: string) {
    const supabase = await createClient()
    const adminSupabase = supabaseAdmin
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')
        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
        const userRole = profile?.role || 'client'
        let activeRequestId = 'admin_direct';
        let activeReason = 'Actualización de Estado Rápida';
        if (userRole === 'agent' || userRole === 'usuario') {
            const permission = await getActivePermissionDetails('translations', id)
            if (permission.hasPermission) {
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
            } else {
                throw new Error('No tienes permiso para editar esta traducción.')
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('translations', id)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        }
        const { data: translationRecord } = await adminSupabase.from('translations').select('*').eq('id', id).single()
        const { error } = await adminSupabase.from('translations').update({ status }).eq('id', id)
        if (error) throw error
        await recordAuditLog({
            actorId: user.id,
            action: 'update',
            resourceType: 'translations',
            resourceId: id,
            oldValues: translationRecord,
            newValues: { status },
            metadata: { 
                method: 'updateTranslationStatus',
                displayId: translationRecord?.tracking_code || undefined,
                requestId: activeRequestId,
                reason: activeReason
            }
        })
        revalidatePath('/chimi-traducciones')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error updating status:', error)
        return { error: error instanceof Error ? error.message : 'Error al actualizar estado' }
    }
}

export async function deleteTranslationDocument(id: string, docPath: string) {
    const supabase = supabaseAdmin
    const { data: existing } = await supabase.from('translations').select('documents').eq('id', id).single()
    if (!existing) return { error: 'Translation not found' }
    const newDocs = existing.documents.filter((d: {path: string}) => d.path !== docPath)
    const { error } = await supabase.from('translations').update({ documents: newDocs }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/chimi-traducciones')
    return { success: true }
}

export async function getTranslationDocumentUrl(path: string, storage: StorageType = 'r2') {
    try {
        const url = await getFileUrl(path, storage)
        return { url }
    } catch (error) {
        console.error('Error generating document URL:', error)
        return { error: 'Failed' }
    }
}

export async function getTranslationFullDetails(id: string) {
    const supabase = supabaseAdmin
    try {
        const { data: translation, error } = await supabase
            .from('translations')
            .select(`
                *,
                profiles:client_id (
                    first_name,
                    last_name,
                    email,
                    phone,
                    document_number
                )
            `)
            .eq('id', id)
            .single()

        if (error || !translation) {
            console.error('Error fetching translation:', error)
            return { success: false, error: 'Traducción no encontrada' }
        }

        if (translation.agent_id) {
            const { data: agentData } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', translation.agent_id)
                .single()
            if (agentData) {
                (translation as Translation).agent = agentData
            }
        }

        const { data: linkedExpenses } = await supabase
            .from('corporate_expenses')
            .select('*')
            .eq('connected_record_id', id)
            .order('expense_date', { ascending: false })
        
        ; (translation as Translation).linked_expenses = (linkedExpenses || []) as CorporateExpense[]

        return { success: true, translation: translation as Translation }
    } catch (error) {
        console.error('Error in getTranslationFullDetails:', error)
        return { success: false, error: (error as Error).message }
    }
}

export async function getTranslationByCode(code: string) {
    const supabase = supabaseAdmin
    const cleanCode = code.trim().toUpperCase()
    const { data, error } = await supabase
        .from('translations')
        .select(`
            id,
            created_at,
            source_language,
            target_language,
            delivery_date,
            tracking_code,
            status,
            total_amount,
            on_account,
            balance,
            profiles:client_id (
                first_name,
                last_name
            )
        `)
        .ilike('tracking_code', cleanCode)
        .single()
    if (error || !data) return { error: 'Traducción no encontrada' }
    const senderName = getSenderName(data.profiles)
    return {
        success: true,
        data: {
            id: data.id,
            created_at: data.created_at,
            source_language: data.source_language,
            target_language: data.target_language,
            delivery_date: data.delivery_date,
            sender_name: maskName(senderName),
            code: data.tracking_code,
            status: data.status,
            total_amount: data.total_amount,
            on_account: data.on_account,
            balance: data.balance
        }
    }
}

function maskName(name: string) {
    if (!name) return '***'
    const parts = name.split(' ')
    return parts.map((part, index) => {
        if (index === 0) return part
        return part.charAt(0) + '***'
    }).join(' ')
}

function getSenderName(profiles: unknown) {
    if (!profiles) return '***'
    if (Array.isArray(profiles)) {
        const profile = profiles[0] as { first_name?: string; last_name?: string } | undefined
        return profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '***'
    } else {
        const profile = profiles as { first_name?: string; last_name?: string }
        return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '***'
    }
}
