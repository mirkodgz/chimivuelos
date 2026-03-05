'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"
import { uploadFileToR2, getFileUrl, type StorageType } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { createClient } from "@/lib/supabase/server"
import { getActivePermissionDetails, consumeEditPermission } from "./manage-permissions"
import { recordAuditLog } from "@/lib/audit"

export interface ParcelDocument {
    title: string
    path: string
    name: string
    type: string
    size: number
    storage: 'r2' | 'images'
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

export interface Parcel {
    id: string
    created_at: string
    sender_id: string
    recipient_name: string
    recipient_phone: string
    recipient_address: string
    origin_address: string
    origin_address_client: string
    destination_address: string
    destination_address_client: string
    package_type: string
    package_weight: string
    package_description: string
    shipping_cost: number
    on_account: number
    status: 'pending' | 'in_transit' | 'delivered' | 'returned' | 'cancelled'
    tracking_code: string
    client_note?: string
    internal_note?: string
    documents?: ParcelDocument[]
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
}

export async function getParcels() {
    const supabase = supabaseAdmin
    const { data, error } = await supabase
        .from('parcels')
        .select(`
            *,
            origin_address,
            origin_address_client,
            destination_address,
            destination_address_client,
            payment_details,
            profiles:sender_id (
                first_name,
                last_name,
                email,
                phone,
                document_number
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching parcels:', error)
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

export async function createParcel(formData: FormData) {
    const supabase = supabaseAdmin
    
    // 1. Core Data
    const sender_id = formData.get('sender_id') as string
    const recipient_name = formData.get('recipient_name') as string
    const recipient_phone = formData.get('recipient_phone') as string
    const recipient_address = formData.get('recipient_address') as string
    const origin_address = formData.get('origin_address') as string
    const origin_address_client = formData.get('origin_address_client') as string
    const destination_address = formData.get('destination_address') as string
    const destination_address_client = formData.get('destination_address_client') as string
    
    // 2. Package Details (Simplified)
    const package_type = formData.get('package_type') as string
    const package_weight = formData.get('package_weight') as string
    const package_description = formData.get('package_description') as string
    const client_note = formData.get('client_note') as string
    const internal_note = formData.get('internal_note') as string
    
    // 3. Economics (Simplified)
    const shipping_cost = parseFloat(String(formData.get('shipping_cost')).replace(',', '.')) || 0
    const on_account = parseFloat(String(formData.get('on_account')).replace(',', '.')) || 0
    // Balance is auto-generated but we calculate client-side too
    
    // 3. Multi-Payments & Proofs
    const paymentDetailsRaw = formData.get('payment_details') as string
    const payment_details = paymentDetailsRaw ? JSON.parse(paymentDetailsRaw) : []

    for (let i = 0; i < payment_details.length; i++) {
        const file = formData.get(`payment_proof_${i}`) as File
        if (file && file.size > 0) {
            const path = `parcels/payments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            await uploadFileToR2(file, path)
            payment_details[i].proof_path = path
        }
    }

    const status = formData.get('status') as string || 'pending'
    
    // Generate Tracking Code (Simple)
    const tracking_code = formData.get('tracking_code') as string || `ENC-${Date.now().toString().slice(-4)}`

    // 4. File Upload Logic
    const documents = []
    let index = 0
    while (formData.has(`document_title_${index}`)) {
        const title = formData.get(`document_title_${index}`) as string
        const file = formData.get(`document_file_${index}`) as File
        
        if (file && file.size > 0) {
            // Upload to 'parcels' folder in bucket manually
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const path = `parcels/${sender_id}/${Date.now()}_${safeName}`
            
            // We use the raw R2 uploader now to control the path fully
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
        sender_id,
        agent_id: user?.id,
        recipient_name,
        recipient_phone,
        recipient_address,
        origin_address,
        origin_address_client,
        destination_address,
        destination_address_client,
        package_type,
        package_weight,
        package_description,
        shipping_cost,
        on_account,
        status,
        tracking_code,
        client_note,
        internal_note,
        documents,
        payment_details
    }

    const { error } = await supabase
        .from('parcels')
        .insert(insertData)

    if (error) {
        return { error: error.message }
    }

    // Record Audit Log (Need to get user first, usually parcels has it)
    if (user) {
        await recordAuditLog({
            actorId: user.id,
            action: 'create',
            resourceType: 'parcels',
            resourceId: tracking_code || 'new',
            newValues: insertData as unknown as Record<string, unknown>,
            metadata: { 
                method: 'createParcel',
                displayId: tracking_code || 'Encomienda Nueva'
            }
        })
    }

    revalidatePath('/chimi-encomiendas')
    return { success: true }
}

export async function updateParcel(formData: FormData) {
    const supabase = await createClient()
    const adminSupabase = supabaseAdmin
    const id = formData.get('id') as string

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
        const userRole = profile?.role || 'client'

        let activeRequestId = 'admin_direct';
        let activeReason = 'Edición Directa';
        const isDraft = formData.get('isDraft') === 'true'

        if (userRole === 'agent' || userRole === 'usuario') {
            if (!isDraft) {
                const permission = await getActivePermissionDetails('parcels', id)
                if (!permission.hasPermission) {
                    throw new Error('No tienes permiso para editar esta encomienda. Debes solicitar autorización.')
                }
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
                // Consumir permiso inmediatamente en la acción principal de guardado
                await consumeEditPermission('parcels', id)
            } else {
                activeRequestId = 'agent_proposal'
                activeReason = 'Propuesta de Borrador'
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('parcels', id)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        } else {
            throw new Error('Acceso denegado')
        }

        const { data: existing } = await adminSupabase
            .from('parcels')
            .select('*')
            .eq('id', id)
            .single()
            
        if (!existing) throw new Error('Parcel not found')

        // Deep clone for audit log comparison
        const oldValues = JSON.parse(JSON.stringify(existing))
        const currentDocs = existing.documents || []

    // 1. Core Data
    // Sender ID is locked in UI but we might receive it anyway, usually we don't update it
    const recipient_name = formData.get('recipient_name') as string
    const recipient_phone = formData.get('recipient_phone') as string
    const recipient_address = formData.get('recipient_address') as string
    const origin_address = formData.get('origin_address') as string
    const origin_address_client = formData.get('origin_address_client') as string
    const destination_address = formData.get('destination_address') as string
    const destination_address_client = formData.get('destination_address_client') as string
    
    const package_type = formData.get('package_type') as string
    const package_weight = formData.get('package_weight') as string
    const package_description = formData.get('package_description') as string
    const client_note = formData.get('client_note') as string
    const internal_note = formData.get('internal_note') as string
    
    const shipping_cost = parseFloat(String(formData.get('shipping_cost')).replace(',', '.')) || 0
    const on_account = parseFloat(String(formData.get('on_account')).replace(',', '.')) || 0
    const status = formData.get('status') as string

    // 2. Multi-Payments & Proofs
    const paymentDetailsRaw = formData.get('payment_details') as string
    const payment_details = paymentDetailsRaw ? JSON.parse(paymentDetailsRaw) : []

    for (let i = 0; i < payment_details.length; i++) {
        const file = formData.get(`payment_proof_${i}`) as File
        if (file && file.size > 0) {
            const path = `parcels/payments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            await uploadFileToR2(file, path)
            payment_details[i].proof_path = path
        }
    }

    // 3. New Files Upload
    let index = 0
    while (formData.has(`document_title_${index}`)) {
        const title = formData.get(`document_title_${index}`) as string
        const file = formData.get(`document_file_${index}`) as File
        
        if (file && file.size > 0) {
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const path = `parcels/updates/${Date.now()}_${safeName}`
            
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
        recipient_name,
        recipient_phone,
        recipient_address,
        origin_address,
        origin_address_client,
        destination_address,
        destination_address_client,
        package_type,
        package_weight,
        package_description,
        shipping_cost,
        on_account,
        status,
        client_note,
        internal_note,
        documents: currentDocs,
        payment_details
    }

    // --- NEW DRAFT MODE ---
    if (isDraft) {
        return { success: true, draftData: updateData }
    }

    const { error } = await adminSupabase
        .from('parcels')
        .update(updateData)
        .eq('id', id)

    if (error) {
        throw error
    }

    await recordAuditLog({
        actorId: user.id,
        action: 'update',
        resourceType: 'parcels',
        resourceId: id,
        oldValues: oldValues,
        newValues: updateData,
        metadata: { 
            method: 'updateParcel',
            displayId: existing?.tracking_code || undefined,
            requestId: activeRequestId,
            reason: activeReason
        }
    })

    revalidatePath('/chimi-encomiendas')

    return { success: true }
    } catch (error: unknown) {
        console.error('Error updating parcel:', error)
        return { error: error instanceof Error ? error.message : 'Error al actualizar encomienda' }
    }
}

export async function deleteParcel(id: string) {
    const supabase = await createClient()
    const adminSupabase = supabaseAdmin

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'supervisor') {
            throw new Error('Solo los administradores o supervisores pueden eliminar encomiendas.')
        }

        const { data: parcel } = await adminSupabase.from('parcels').select('*').eq('id', id).single()
        if (!parcel) throw new Error('Encomienda no encontrada')

        const { error } = await adminSupabase
            .from('parcels')
            .delete()
            .eq('id', id)

        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'delete',
            resourceType: 'parcels',
            resourceId: id,
            oldValues: parcel,
            metadata: { 
                method: 'deleteParcel',
                displayId: parcel?.tracking_code || undefined
            }
        })

        revalidatePath('/chimi-encomiendas')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error deleting parcel:', error)
        return { error: error instanceof Error ? error.message : 'Error al eliminar encomienda' }
    }
}

export async function deleteParcelDocument(id: string, docPath: string) {
    const supabase = supabaseAdmin
    
    const { data: existing } = await supabase
        .from('parcels')
        .select('documents')
        .eq('id', id)
        .single()
        
    if (!existing) return { error: 'Parcel not found' }

    const newDocs = existing.documents.filter((d: {path: string}) => d.path !== docPath)
    
    // We update the array in DB. File remains in bucket (soft delete) or implement bucket delete logic.

    const { error } = await supabase
        .from('parcels')
        .update({ documents: newDocs })
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/chimi-encomiendas')
    return { success: true }
}

export async function updateParcelStatus(id: string, status: string) {
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
            const permission = await getActivePermissionDetails('parcels', id)
            if (permission.hasPermission) {
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
            } else {
                throw new Error('No tienes permiso para editar esta encomienda.')
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('parcels', id)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        }

        // Fetch parcel info for audit log
        const { data: parcelRecord } = await adminSupabase.from('parcels').select('*').eq('id', id).single()

        const { error } = await adminSupabase
            .from('parcels')
            .update({ status })
            .eq('id', id)

        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'update',
            resourceType: 'parcels',
            resourceId: id,
            oldValues: parcelRecord,
            newValues: { status },
            metadata: { 
                method: 'updateParcelStatus',
                displayId: parcelRecord?.tracking_code || undefined,
                requestId: activeRequestId,
                reason: activeReason
            }
        })

        revalidatePath('/chimi-encomiendas')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error updating status:', error)
        return { error: error instanceof Error ? error.message : 'Error al actualizar estado' }
    }
}

export async function getParcelDocumentUrl(path: string, storage: StorageType = 'r2') {
    try {
        const url = await getFileUrl(path, storage)
        return { url }
    } catch (error) {
        console.error('Error generating parcel URL:', error)
        return { error: 'Failed to generate download URL' }
    }
}

/**
 * Get parcel full details for the single page
 */
export async function getParcelFullDetails(id: string) {
    const supabase = supabaseAdmin
    try {
        const { data: parcel, error } = await supabase
            .from('parcels')
            .select(`
                *,
                profiles:sender_id (
                    first_name,
                    last_name,
                    email,
                    phone,
                    document_number
                )
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching parcel:', error)
            return { success: false, error: 'Encomienda no encontrada' }
        }

        // Fetch agent details separately if agent_id exists
        if (parcel.agent_id) {
            const { data: agentData } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', parcel.agent_id)
                .single()
            
            if (agentData) {
                (parcel as unknown as Parcel).agent = agentData
            }
        }

        return { success: true, parcel: parcel as unknown as Parcel }
    } catch (error) {
        console.error('Error fetching parcel details:', error)
        return { success: false, error: (error as Error).message }
    }
}

/**
 * Public Track Parcel by Code
 */
export async function getParcelByCode(code: string) {
    const supabase = supabaseAdmin
    
    // Clean code
    const cleanCode = code.trim().toUpperCase()

    const { data, error } = await supabase
        .from('parcels')
        .select(`
            id,
            created_at,
            package_description,
            package_weight,
            package_type,
            recipient_name,
            recipient_address,
            origin_address,
            origin_address_client,
            destination_address,
            destination_address_client,
            tracking_code,
            status,
            profiles:sender_id (
                first_name,
                last_name
            )
        `)
        .ilike('tracking_code', cleanCode) // Case insensitive match
        .single()
    
    if (error || !data) {
        return { error: 'Encomienda no encontrada' }
    }

    // Return limited data for privacy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = data.profiles as any
    const senderName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : '***'

    return {
        success: true,
        data: {
            id: data.id,
            created_at: data.created_at,
            description: data.package_description,
            weight: data.package_weight,
            type: data.package_type,
            recipient_name: maskName(data.recipient_name),
            recipient_address: maskAddress(data.recipient_address),
            origin_address: data.origin_address,
            origin_address_client: maskAddress(data.origin_address_client),
            destination_address: data.destination_address,
            destination_address_client: maskAddress(data.destination_address_client),
            sender_name: maskName(senderName),
            code: data.tracking_code,
            status: data.status
        }
    }
}

export async function getParcelHistoryPublic(id: string) {
    const supabase = supabaseAdmin
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_id', id)
        .eq('resource_type', 'parcels')
        .eq('action', 'update')
        .order('created_at', { ascending: true })

    if (error) return []

    return data
        .filter(log => log.new_values && log.new_values.status)
        .map(log => ({
            status: log.new_values.status,
            created_at: log.created_at
        }))
}

function maskName(name: string) {
    if (!name) return '***'
    const parts = name.split(' ')
    return parts.map((part, index) => {
        if (index === 0) return part // Show first name
        return part.charAt(0) + '***' // Mask others
    }).join(' ')
}

function maskAddress(address: string) {
    if (!address) return '***'
    // Show only the last part (city/country) or first few chars
    // Simple strategy: Show first 5 chars then ***
    if (address.length <= 5) return address
    return address.substring(0, 5) + '***'
}
