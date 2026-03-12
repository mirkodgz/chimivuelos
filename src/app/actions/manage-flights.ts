'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { uploadClientFile, deleteFileFromR2, deleteImageFromCloudflare, getFileUrl } from "@/lib/storage"
import { getActivePermissionDetails, consumeEditPermission } from "./manage-permissions"
import { getPaymentMethodsIT, getPaymentMethodsPE } from "./manage-payment-methods"
import { recordAuditLog } from "@/lib/audit"
import type { CorporateExpense } from "./manage-expenses"

/**
 * Interface for Flight Document
 */
export interface FlightDocument {
    title: string
    path: string
    name: string
    type: string
    size: number
    storage: 'r2' | 'images'
}

export interface DateHistoryEntry {
    date: string
    changed_at: string
    changed_by: string
}

/**
 * Creates a new flight record
 */
export interface PaymentDetail {
    sede_it: string
    sede_pe: string
    metodo_it: string
    metodo_pe: string
    cantidad: string       // EUR amount (affects accounting)
    tipo_cambio: number    // Exchange rate used
    total: string          // Formatted original amount (e.g. "S/ 400.00")
    moneda?: string        // 'EUR', 'PEN', 'USD'
    monto_original?: string
    created_at?: string
    updated_at?: string
    proof_path?: string
}

export interface Flight {
    id: string
    created_at: string
    updated_at?: string
    client_id: string
    agent_id: string
    pnr: string
    itinerary: string
    travel_date: string
    return_date?: string
    cost: number
    sold_price: number
    on_account: number
    balance: number
    linked_other_services?: {
        id: string
        tracking_code: string
        service_type: string
        service_type_other: string
    }[]
    fee_agv: number
    status: string
    payment_method_it?: string
    payment_method_pe?: string
    payment_details?: PaymentDetail[]
    payment_proof_path?: string
    documents?: FlightDocument[]
    details?: Record<string, boolean | string | number | null>
    exchange_rate?: number
    ticket_type?: string
    pax_adt?: number
    pax_chd?: number
    pax_inf?: number
    pax_total?: number
    iata_gds?: string
    minor_travel_with?: string
    required_documents?: Record<string, { required: boolean; status: string; extra?: string }>
    client_note?: string
    internal_note?: string
    flight_date_history?: DateHistoryEntry[]
    profiles?: {
        first_name: string | null
        last_name: string | null
        email: string | null
        phone: string | null
        document_number: string | null
    } | null
    agent?: {
        first_name: string | null
        last_name: string | null
    } | null
    linked_expenses?: CorporateExpense[]
}

export async function createFlight(formData: FormData) {
    const supabase = await createClient()
    const adminSupabase = supabaseAdmin

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const client_id = formData.get('client_id') as string
        const travel_date = formData.get('travel_date') as string || null
        const pnr = formData.get('pnr') as string
        const itinerary = formData.get('itinerary') as string
        const cost = parseFloat(formData.get('cost') as string) || 0
        const statusValue = formData.get('status') as string || 'PROGRAMADO'
        const statusMap: Record<string, string> = {
            'PROGRAMADO': 'Programado',
            'EN TRÁNSITO': 'En tránsito',
            'REPROGRAMADO POR CLIENTE': 'Reprogramado',
            'REPROGRAMADO POR AEROLÍNEA': 'Reprogramado',
            'CAMBIO DE HORARIO': 'Cambio de horario',
            'CANCELADO': 'Cancelado',
            'NO-SHOW (NO SE PRESENTÓ)': 'No-show (no se presentó)',
            'EN MIGRACIÓN': 'En migración',
            'DEPORTADO': 'Deportado',
            'FINALIZADO': 'Finalizado'
        }
        const status = statusMap[statusValue] || statusValue
        
        const return_date = formData.get('return_date') as string || null
        const sold_price = parseFloat(formData.get('sold_price') as string) || 0
        const payment_method_it = formData.get('payment_method_it') as string
        const payment_method_pe = formData.get('payment_method_pe') as string
        const client_note = formData.get('client_note') as string || ''
        const internal_note = formData.get('internal_note') as string || ''
        
        let details = {}
        try {
            const detailsStr = formData.get('details') as string
            if (detailsStr) details = JSON.parse(detailsStr)
        } catch (e) {
            console.error('Error parsing details:', e)
        }

        const minor_travel_with = formData.get('minor_travel_with') as string || null
        let required_documents: Record<string, unknown> = {}
        try {
            const reqDocsStr = formData.get('required_documents') as string
            if (reqDocsStr) required_documents = JSON.parse(reqDocsStr)
        } catch (e) {
            console.error('Error parsing required_documents:', e)
        }

        // Handle Payment Details
        const payment_quantity_str = formData.get('payment_quantity') as string
        const payment_quantity = parseFloat(payment_quantity_str) || 0
        const payment_exchange_rate = parseFloat(formData.get('payment_exchange_rate') as string) || 1.0
        
        let payment_proof_path = null
        const payment_details: PaymentDetail[] = []
        
        // Handle Multi Payments if sent as JSON
        const multiPaymentsStr = formData.get('multi_payments') as string
        if (multiPaymentsStr) {
            try {
                const multiPayments = JSON.parse(multiPaymentsStr) as PaymentDetail[]
                
                // For each temp payment, check if there's a corresponding proof file
                for (let i = 0; i < multiPayments.length; i++) {
                    const tempFile = formData.get(`payment_proof_${i}`) as File
                    if (tempFile && tempFile.size > 0) {
                        const uploadResult = await uploadClientFile(tempFile, client_id)
                        multiPayments[i].proof_path = uploadResult.path
                        // If multiple proofs, the "main" one for the flight record will be the last one assigned here
                        // though each payment detail has its own path.
                        payment_proof_path = uploadResult.path
                    }
                }
                
                payment_details.push(...multiPayments)
            } catch (e) {
                console.error('Error parsing multi_payments:', e)
            }
        }

        // Handle Single Payment (legacy/fallback)
        if (payment_quantity > 0) {
            const proofFile = formData.get('payment_proof_file') as File
            if (proofFile && proofFile.size > 0) {
                const uploadResult = await uploadClientFile(proofFile, client_id)
                payment_proof_path = uploadResult.path
            }

            const currency = formData.get('payment_currency') as string || 'EUR'
            const original_amount = formData.get('payment_original_amount') as string || payment_quantity_str
            
            payment_details.push({
                sede_it: formData.get('sede_it') as string,
                sede_pe: formData.get('sede_pe') as string,
                metodo_it: payment_method_it,
                metodo_pe: payment_method_pe,
                cantidad: payment_quantity.toString(),
                tipo_cambio: payment_exchange_rate,
                total: formData.get('payment_total_display') as string || `${currency} ${original_amount}`,
                moneda: currency,
                monto_original: original_amount,
                created_at: new Date().toISOString(),
                proof_path: payment_proof_path || undefined
            })
        }

        let totalOnAccount = 0
        payment_details.forEach(p => totalOnAccount += parseFloat(p.cantidad) || 0)

        const on_account = totalOnAccount
        const balance = sold_price - on_account
        const fee_agv = sold_price - cost

        // Handle Documents
        const documents: FlightDocument[] = []
        let index = 0
        while (formData.has(`document_title_${index}`)) {
            const title = formData.get(`document_title_${index}`) as string
            const file = formData.get(`document_file_${index}`) as File

            if (file && file.size > 0) {
                const uploadResult = await uploadClientFile(file, client_id)
                documents.push({
                    title: title || file.name,
                    path: uploadResult.path,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    storage: uploadResult.storage
                })
            }
            index++
        }

        const ticket_type = formData.get('ticket_type') as string

        const insertData = {
            client_id,
            travel_date,
            pnr,
            itinerary,
            cost,
            on_account,
            balance,
            status,
            agent_id: user.id,
            details,
            return_date,
            sold_price,
            fee_agv,
            payment_method_it,
            payment_method_pe,
            payment_details,
            payment_proof_path,
            exchange_rate: payment_exchange_rate,
            ticket_type,
            pax_adt: parseInt(formData.get('pax_adt') as string) || 0,
            pax_chd: parseInt(formData.get('pax_chd') as string) || 0,
            pax_inf: parseInt(formData.get('pax_inf') as string) || 0,
            pax_total: parseInt(formData.get('pax_total') as string) || 0,
            iata_gds: formData.get('iata_gds') as string,
            minor_travel_with,
            required_documents,
            client_note,
            internal_note,
            documents,
            created_at: new Date().toISOString()
        }

        const { error } = await adminSupabase.from('flights').insert(insertData)

        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'create',
            resourceType: 'flights',
            resourceId: pnr || 'new',
            newValues: insertData,
            metadata: { 
                method: 'createFlight',
                displayId: pnr || 'Vuelo Nuevo'
            }
        })

        if (error) throw error

        revalidatePath('/chimi-vuelos')
        return { success: true }

    } catch (error: unknown) {
        console.error('Error creating flight:', error)
        const errorMessage = error instanceof Error ? error.message : 'Error creating flight'
        return { error: errorMessage }
    }
}

/**
 * Updates an existing flight
 */
export async function updateFlight(formData: FormData, isDraft: boolean = false) {
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

        if (userRole === 'agent' || userRole === 'usuario') {
            if (!isDraft) {
                const permission = await getActivePermissionDetails('flights', id)
                if (!permission.hasPermission) {
                    throw new Error('No tienes permiso para editar este vuelo directamente. Se requiere guardarlo como borrador para aprobación.')
                }
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
                // Consumir permiso inmediatamente en la acción principal de guardado
                await consumeEditPermission('flights', id)
            } else {
                activeRequestId = 'agent_proposal'
                activeReason = 'Propuesta de Borrador'
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('flights', id)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        } else {
            throw new Error('Acceso denegado')
        }

        const { data: existingFlight } = await adminSupabase.from('flights').select('*').eq('id', id).single()
        if (!existingFlight) throw new Error('Flight not found')

        // Deep clone for audit log comparison
        const oldValues = JSON.parse(JSON.stringify(existingFlight))

        const client_id = existingFlight.client_id
        const travel_date = formData.get('travel_date') as string || null
        const pnr = formData.get('pnr') as string
        const itinerary = formData.get('itinerary') as string
        const cost = parseFloat(formData.get('cost') as string) || 0
        const status = formData.get('status') as string

        const return_date = formData.get('return_date') as string || null
        const sold_price = parseFloat(formData.get('sold_price') as string) || 0
        const payment_method_it = formData.get('payment_method_it') as string
        const payment_method_pe = formData.get('payment_method_pe') as string
        const client_note = formData.get('client_note') as string || ''
        const internal_note = formData.get('internal_note') as string || ''

        let details = {}
        try {
            const detailsStr = formData.get('details') as string
            if (detailsStr) details = JSON.parse(detailsStr)
        } catch (e) {
            console.error('Error parsing details:', e)
        }

        const minor_travel_with = formData.get('minor_travel_with') as string || null
        let required_documents: Record<string, unknown> = {}
        try {
            const reqDocsStr = formData.get('required_documents') as string
            if (reqDocsStr) required_documents = JSON.parse(reqDocsStr)
        } catch (e) {
            console.error('Error parsing required_documents:', e)
        }

        // Handle Payment Details
        const payment_quantity_str = formData.get('payment_quantity') as string
        const payment_quantity = parseFloat(payment_quantity_str) || 0
        const payment_exchange_rate = parseFloat(formData.get('payment_exchange_rate') as string) || 1.0
        
        const currentPayments = (existingFlight.payment_details as PaymentDetail[]) || []

        // Handle Multi Payments if sent as JSON
        const multiPaymentsStr = formData.get('multi_payments') as string
        if (multiPaymentsStr) {
            try {
                const multiPayments = JSON.parse(multiPaymentsStr) as PaymentDetail[]
                
                // For each temp payment, check if there's a corresponding proof file
                for (let i = 0; i < multiPayments.length; i++) {
                    const tempFile = formData.get(`payment_proof_${i}`) as File
                    if (tempFile && tempFile.size > 0) {
                        const uploadResult = await uploadClientFile(tempFile, client_id)
                        multiPayments[i].proof_path = uploadResult.path
                    }
                }

                currentPayments.push(...multiPayments)
            } catch (e) {
                console.error('Error parsing multi_payments:', e)
            }
        }

        // Handle Payment Proof
        let payment_proof_path = existingFlight.payment_proof_path
        const proofFile = formData.get('payment_proof_file') as File
        if (proofFile && proofFile.size > 0) {
            const uploadResult = await uploadClientFile(proofFile, client_id)
            payment_proof_path = uploadResult.path
        }

        // Handle Single Payment (legacy/fallback)
        if (payment_quantity > 0) {
            const currency = formData.get('payment_currency') as string || 'EUR'
            const original_amount = formData.get('payment_original_amount') as string || payment_quantity_str

            const newPayment: PaymentDetail = {
                sede_it: (formData.get('sede_it') as string) || '',
                sede_pe: (formData.get('sede_pe') as string) || '',
                metodo_it: (formData.get('payment_method_it') as string) || '',
                metodo_pe: (formData.get('payment_method_pe') as string) || '',
                cantidad: payment_quantity.toString(),
                tipo_cambio: payment_exchange_rate,
                total: formData.get('payment_total_display') as string || `${currency} ${original_amount}`,
                moneda: currency,
                monto_original: original_amount,
                created_at: new Date().toISOString(),
                proof_path: payment_proof_path || undefined
            }
            currentPayments.push(newPayment)
        }

        let totalOnAccount = 0
        currentPayments.forEach((p: PaymentDetail) => {
            totalOnAccount += parseFloat(p.cantidad) || 0
        })



        const currentDocuments: FlightDocument[] = (existingFlight.documents as unknown as FlightDocument[]) || []
        let docIndex = 0
        while (formData.has(`document_title_${docIndex}`)) {
            const title = formData.get(`document_title_${docIndex}`) as string
            const file = formData.get(`document_file_${docIndex}`) as File

            if (file && file.size > 0) {
                 const uploadResult = await uploadClientFile(file, client_id)
                 currentDocuments.push({
                    title: title || file.name,
                    path: uploadResult.path,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    storage: uploadResult.storage
                })
            }
            docIndex++
        }

        const on_account = totalOnAccount 
        const balance = sold_price - on_account
        const fee_agv = sold_price - cost

        const ticket_type = formData.get('ticket_type') as string


        const updateData = {
            client_id,
            travel_date,
            pnr,
            itinerary,
            cost,
            on_account,
            balance,
            status,
            details,
            return_date,
            sold_price,
            fee_agv,
            payment_method_it,
            payment_method_pe,
            payment_details: currentPayments,
            payment_proof_path,
            exchange_rate: payment_exchange_rate,
            documents: currentDocuments as unknown,
            ticket_type,
            pax_adt: parseInt(formData.get('pax_adt') as string) || 0,
            pax_chd: parseInt(formData.get('pax_chd') as string) || 0,
            pax_inf: parseInt(formData.get('pax_inf') as string) || 0,
            pax_total: parseInt(formData.get('pax_total') as string) || 0,
            iata_gds: formData.get('iata_gds') as string,
            minor_travel_with,
            required_documents,
            client_note,
            internal_note,
            updated_at: new Date().toISOString()
        }

        if (isDraft) {
            return { success: true, draftData: updateData }
        }

        const { error } = await adminSupabase.from('flights').update(updateData).eq('id', id)

        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'update',
            resourceType: 'flights',
            resourceId: id,
            oldValues: oldValues,
            newValues: updateData,
            metadata: { 
                method: 'updateFlight',
                displayId: pnr || undefined,
                requestId: activeRequestId,
                reason: activeReason
            }
        })

        revalidatePath('/chimi-vuelos')

        return { success: true }


    } catch (error: unknown) {
        console.error('Error updating flight:', error)
        const errorMessage = error instanceof Error ? error.message : 'Error updating flight'
        return { error: errorMessage }
    }
}

/**
 * Update only the status of a flight (Inline Edit)
 */
export async function updateFlightStatus(id: string, status: string) {
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
            const permission = await getActivePermissionDetails('flights', id)
            if (permission.hasPermission) {
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
            } else {
                throw new Error('No tienes permiso para editar este vuelo.')
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('flights', id)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        }

        // Fetch flight info for audit log
        const { data: flightRecord } = await adminSupabase.from('flights').select('*').eq('id', id).single()

        const { error } = await adminSupabase.from('flights').update({ status }).eq('id', id)
        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'update',
            resourceType: 'flights',
            resourceId: id,
            oldValues: flightRecord,
            newValues: { status },
            metadata: { 
                method: 'updateFlightStatus',
                displayId: flightRecord?.pnr || undefined,
                requestId: activeRequestId,
                reason: activeReason
            }
        })

        revalidatePath('/chimi-vuelos')
        return { success: true }
    } catch (error: unknown) {
        console.error('Update status error:', error)
        // Return the actual DB error message if available
        let errorMessage = 'Error updating status'
        if (error instanceof Error) {
            errorMessage = error.message
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = String((error as { message: unknown }).message)
        } else if (typeof error === 'string') {
            errorMessage = error
        }
        return { error: errorMessage }
    }
}

/**
 * Delete a flight and all its documents
 */
export async function deleteFlight(id: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'supervisor') {
            throw new Error('Solo los administradores o supervisores pueden eliminar vuelos.')
        }

        // Get flight for audit log and document deletion
        const { data: flight } = await supabaseAdmin.from('flights').select('*').eq('id', id).single()
        if (!flight) throw new Error('Vuelo no encontrado')
        
        if (flight && flight.documents) {
            const docs = flight.documents as unknown as FlightDocument[]
            for (const doc of docs) {
                try {
                    if (doc.storage === 'images' && !doc.path.includes('/')) {
                        await deleteImageFromCloudflare(doc.path)
                    } else {
                        await deleteFileFromR2(doc.path)
                    }
                } catch (e) {
                    console.error('Error deleting file:', doc.path, e)
                }
            }
        }

        const { error } = await supabaseAdmin.from('flights').delete().eq('id', id)
        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'delete',
            resourceType: 'flights',
            resourceId: id,
            oldValues: flight,
            metadata: { 
                method: 'deleteFlight',
                displayId: flight?.pnr || undefined
            }
        })

        revalidatePath('/chimi-vuelos')
        return { success: true }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error deleting flight'
        return { error: errorMessage }
    }
}

/**
 * Delete a specific document from a flight
 */
export async function deleteFlightDocument(flightId: string, docPath: string) {
    const supabase = supabaseAdmin
    
    try {
        const { data: flight } = await supabase.from('flights').select('documents').eq('id', flightId).single()
        if (!flight) throw new Error('Flight not found')

        let docs = (flight.documents as unknown as FlightDocument[]) || []
        const docToDelete = docs.find(d => d.path === docPath)

        if (docToDelete) {
             // Delete from storage
             if (docToDelete.storage === 'images' && !docToDelete.path.includes('/')) {
                 await deleteImageFromCloudflare(docToDelete.path)
             } else {
                 await deleteFileFromR2(docToDelete.path)
             }

             // Update DB
             docs = docs.filter(d => d.path !== docPath)
             await supabase.from('flights').update({ documents: docs as unknown }).eq('id', flightId)
        }

        revalidatePath('/chimi-vuelos')
        return { success: true }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error deleting document'
        return { error: errorMessage }
    }
}

/**
 * Get signed URL for a document
 */
export async function getFlightDocumentUrl(path: string, storage: 'r2' | 'images') {
    try {
        const url = await getFileUrl(path, storage)
        return { url }
    } catch (error) {
        console.error('Error generating URL:', error)
        return { error: 'Failed to generate download URL' }
    }
}

/**
 * Get all flights with client details
 */
/**
 * Interface for Paginated Flights Results
 */
export interface FetchFlightsParams {
    page: number
    pageSize: number
    searchTerm?: string
    statusFilter?: string
    dateFrom?: string
    dateTo?: string
    showDeudaOnly?: boolean
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    filterByTravelDate?: boolean
}

/**
 * Get paginated flights with server-side filters
 */
export async function getFlights(params: FetchFlightsParams) {
    const { 
        page, 
        pageSize, 
        searchTerm, 
        statusFilter, 
        dateFrom, 
        dateTo, 
        showDeudaOnly,
        sortField = 'created_at',
        sortOrder = 'desc',
        filterByTravelDate = false
    } = params

    const supabase = supabaseAdmin
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // 1. Build Query
    let query = supabase
        .from('flights')
        .select(`
            *,
            profiles:client_id (
                first_name,
                last_name,
                email,
                phone,
                document_number
            ),
            agent:agent_id (
                first_name,
                last_name
            )
        `, { count: 'exact' })

    // 2. Apply Filters (Exactly like we discussed, Server-side)
    if (showDeudaOnly) {
        query = query.gt('balance', 0)
    }

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
    }

    if (searchTerm) {
        const term = `%${searchTerm.toLowerCase()}%`
        const { data: matchedProfiles } = await supabase
            .from('profiles')
            .select('id')
            .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
        
        const profileIds = (matchedProfiles || []).map(p => p.id)
        
        if (profileIds.length > 0) {
            query = query.or(`pnr.ilike.${term},client_id.in.(${profileIds.join(',')}),agent_id.in.(${profileIds.join(',')})`)
        } else {
            query = query.ilike('pnr', term)
        }
    }

    const dateField = filterByTravelDate || showDeudaOnly ? 'travel_date' : 'created_at'
    if (dateFrom) query = query.gte(dateField, dateFrom)
    if (dateTo) query = query.lte(dateField, dateTo)

    // 3. Execution with range (Like LIMIT/OFFSET in PHP)
    const { data: flights, error, count } = await query
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range(from, to)
    
    if (error) {
        console.error('Error fetching flights:', error)
        return { flights: [], count: 0 }
    }

    // 4. History Recovery for current page only
    const pnrs = flights.map(f => f.pnr?.trim()).filter(Boolean) as string[]
    if (pnrs.length > 0) {
        const { data: allServices } = await supabase
            .from('other_services')
            .select('flight_pnr, flight_date_history')
            .in('flight_pnr', pnrs)
        
        if (allServices && allServices.length > 0) {
            flights.forEach(flight => {
                const flightPnr = flight.pnr?.trim()
                if (!flightPnr) return
                const relevantServices = allServices.filter(s => s.flight_pnr?.trim() === flightPnr)
                let combinedHistory: DateHistoryEntry[] = Array.isArray(flight.flight_date_history) ? [...(flight.flight_date_history as DateHistoryEntry[])] : []
                relevantServices.forEach(s => {
                    if (Array.isArray(s.flight_date_history)) combinedHistory = [...combinedHistory, ...s.flight_date_history]
                })

                if (combinedHistory.length > 0) {
                    const uniqueMap = new Map()
                    combinedHistory.forEach(h => uniqueMap.set(`${h.date}_${h.changed_at}`, h))
                    flight.flight_date_history = Array.from(uniqueMap.values()).sort((a,b) => 
                        new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
                    )
                }
            })
        }
    }

    return { 
        flights: (flights || []) as unknown[], 
        count: count || 0 
    }
}

/**
 * Combined Fetcher for Initial Chimi-Vuelos Page Load
 */
export async function getInitialChimiVuelosData() {
    try {
        const [clients, itineraries, methodsIT, methodsPE] = await Promise.all([
            getClientsForDropdown(),
            getItineraries(),
            getPaymentMethodsIT(),
            getPaymentMethodsPE()
        ])
        
        return {
            clients,
            itineraries,
            paymentMethodsIT: methodsIT,
            paymentMethodsPE: methodsPE
        }
    } catch (error) {
        console.error('Error in unified fetcher:', error)
        return {
            clients: [],
            itineraries: [],
            paymentMethodsIT: [],
            paymentMethodsPE: []
        }
    }
}

/**
 * Get all clients for the dropdown
 */
export async function getClientsForDropdown() {
    const supabase = supabaseAdmin
    const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('role', 'client') // Assuming only clients
        .order('first_name', { ascending: true })
    return data || []
}

/**
 * Deletes a specific payment from the payment_details array
 */
export async function deleteFlightPayment(flightId: string, paymentIndex: number) {
    const adminSupabase = supabaseAdmin

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
        const userRole = profile?.role || 'client'

        let activeRequestId = 'admin_direct';
        let activeReason = 'Edición Directa';

        if (userRole === 'agent' || userRole === 'usuario') {
            const permission = await getActivePermissionDetails('flights', flightId)
            if (permission.hasPermission) {
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
            } else {
                throw new Error('No tienes permiso para editar este vuelo.')
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('flights', flightId)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        }

        const { data: flight } = await adminSupabase.from('flights').select('*').eq('id', flightId).single()
        if (!flight) throw new Error('Flight not found')

        const oldValues = JSON.parse(JSON.stringify(flight))
        const payments = (flight.payment_details as PaymentDetail[]) || []
        
        // Safety check: index out of bounds
        if (paymentIndex < 0 || paymentIndex >= payments.length) {
            throw new Error('Payment index out of bounds')
        }

        // Remove the payment
        payments.splice(paymentIndex, 1)

        // Recalculate totals
        let totalOnAccount = 0
        payments.forEach(p => totalOnAccount += parseFloat(p.cantidad) || 0)

        const on_account = totalOnAccount
        const balance = (flight.sold_price || 0) - on_account

        const { error } = await adminSupabase.from('flights').update({
            payment_details: payments,
            on_account,
            balance
        }).eq('id', flightId)

        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'update',
            resourceType: 'flights',
            resourceId: flightId,
            oldValues,
            newValues: { payment_details: payments, on_account, balance },
            metadata: { 
                method: 'deleteFlightPayment',
                displayId: flight.pnr || undefined,
                requestId: activeRequestId,
                reason: activeReason
            }
        })
        
        revalidatePath('/chimi-vuelos')
        return { success: true }
    } catch (error) {
        console.error('Error deleting payment:', error)
        return { success: false, error: (error as Error).message }
    }
}

/**
 * Updates a specific payment in the payment_details array
 */
export async function updateFlightPayment(formData: FormData) {
    const adminSupabase = supabaseAdmin
    const flightId = formData.get('flightId') as string
    const paymentIndex = parseInt(formData.get('paymentIndex') as string)
    const proofFile = formData.get('proofFile') as File | null

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()
        const userRole = profile?.role || 'client'

        let activeRequestId = 'admin_direct';
        let activeReason = 'Edición Directa';

        if (userRole === 'agent' || userRole === 'usuario') {
            const permission = await getActivePermissionDetails('flights', flightId)
            if (permission.hasPermission) {
                activeRequestId = permission.requestId as string
                activeReason = permission.reason as string
            } else {
                throw new Error('No tienes permiso para editar este vuelo.')
            }
        } else if (userRole === 'admin' || userRole === 'supervisor') {
            const permission = await getActivePermissionDetails('flights', flightId)
            activeRequestId = permission.requestId as string
            activeReason = permission.reason as string
        }

        const { data: flight } = await adminSupabase.from('flights').select('*').eq('id', flightId).single()
        if (!flight) throw new Error('Flight not found')

        const oldValues = JSON.parse(JSON.stringify(flight))
        const payments = (flight.payment_details as PaymentDetail[]) || []
        
        if (paymentIndex < 0 || paymentIndex >= payments.length) {
            throw new Error('Payment index out of bounds')
        }

        let proofPath = payments[paymentIndex].proof_path
        if (proofFile && proofFile.size > 0) {
            const uploadResult = await uploadClientFile(proofFile, flight.client_id)
            proofPath = uploadResult.path
        }

        // Update the payment fields from formData
        const currency = formData.get('moneda') as string || payments[paymentIndex].moneda || 'EUR'
        const original_amount = formData.get('monto_original') as string || formData.get('cantidad_original') as string || payments[paymentIndex].monto_original || payments[paymentIndex].cantidad

        payments[paymentIndex] = {
            ...payments[paymentIndex],
            sede_it: formData.get('sede_it') as string,
            sede_pe: formData.get('sede_pe') as string,
            metodo_it: formData.get('metodo_it') as string,
            metodo_pe: formData.get('metodo_pe') as string,
            cantidad: formData.get('cantidad') as string, // This is expected to be EUR
            tipo_cambio: parseFloat(formData.get('tipo_cambio') as string),
            total: formData.get('total_display') as string || `${currency} ${original_amount}`,
            moneda: currency,
            monto_original: original_amount,
            proof_path: proofPath,
            updated_at: new Date().toISOString()
        }

        // Recalculate totals
        let totalOnAccount = 0
        payments.forEach(p => totalOnAccount += parseFloat(p.cantidad) || 0)

        const on_account = totalOnAccount
        const balance = (flight.sold_price || 0) - on_account

        const { error } = await adminSupabase.from('flights').update({
            payment_details: payments,
            on_account,
            balance
        }).eq('id', flightId)

        if (error) throw error

        // Record Audit Log
        await recordAuditLog({
            actorId: user.id,
            action: 'update',
            resourceType: 'flights',
            resourceId: flightId,
            oldValues,
            newValues: { payment_details: payments, on_account, balance },
            metadata: { 
                method: 'updateFlightPayment',
                displayId: flight.pnr || undefined,
                requestId: activeRequestId,
                reason: activeReason
            }
        })
        
        revalidatePath('/chimi-vuelos')
        return { success: true }
    } catch (error) {
        console.error('Error updating payment:', error)
        return { success: false, error: (error as Error).message }
    }
}

/**
 * Gets active itineraries from the database
 */
export async function getItineraries() {
    const supabase = supabaseAdmin
    const { data, error } = await supabase
        .from('itineraries')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching itineraries:', error)
        return []
    }
    return data.map(item => item.name)
}

/**
 * Get a single flight with full details and combined history
 */
export async function getFlightFullDetails(id: string) {
    const supabase = supabaseAdmin
    try {
        const { data: flight, error } = await supabase
            .from('flights')
            .select(`
                *,
                profiles:client_id (
                    first_name,
                    last_name,
                    email,
                    phone,
                    document_number
                ),
                agent:agent_id (
                    first_name,
                    last_name
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error

        // Fetch linked services that refer to this flight
        const { data: linkedServices } = await supabase
            .from('other_services')
            .select('id, tracking_code, service_type, service_type_other')
            .eq('connected_flight_id', id)
            
        flight.linked_other_services = linkedServices || []

        // Recover histories from other_services based on PNR to show a unified history
        const flightPnr = flight.pnr?.trim()
        if (flightPnr) {
            const { data: allServices } = await supabase
                .from('other_services')
                .select('flight_pnr, flight_date_history')
                .eq('flight_pnr', flightPnr)
            
            if (allServices && allServices.length > 0) {
                let combinedHistory: DateHistoryEntry[] = Array.isArray(flight.flight_date_history) ? [...(flight.flight_date_history as DateHistoryEntry[])] : []
                
                allServices.forEach(s => {
                    if (Array.isArray(s.flight_date_history)) {
                        combinedHistory = [...combinedHistory, ...s.flight_date_history]
                    }
                })

                if (combinedHistory.length > 0) {
                    const uniqueMap = new Map()
                    combinedHistory.forEach(h => {
                        const key = `${h.date}_${h.changed_at}`
                        uniqueMap.set(key, h)
                    })
                    
                    flight.flight_date_history = Array.from(uniqueMap.values()).sort((a,b) => 
            new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
        )
                }
            }
        }

        // Fetch linked expenses
        const { data: linkedExpenses } = await supabase
            .from('corporate_expenses')
            .select('*')
            .eq('connected_record_id', id)
            .order('expense_date', { ascending: false })
        
        ; (flight as Flight).linked_expenses = (linkedExpenses || []) as CorporateExpense[]

        return { success: true, flight: flight as Flight }
    } catch (err) {
        console.error('Error in getFlightFullDetails:', err)
        return { success: false, error: 'Error al cargar los detalles' }
    }
}
