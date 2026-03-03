'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"

export interface SearchResult {
    id: string
    display_code: string
    client_name: string
}

export async function searchServiceRecords(type: string, query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return []

    const supabase = supabaseAdmin
    let table = ''
    let codeField = ''

    switch (type) {
        case 'Vuelo':
            table = 'flights'
            codeField = 'pnr'
            break
        case 'Giro':
            table = 'money_transfers'
            codeField = 'transfer_code'
            break
        case 'Encomienda':
            table = 'parcels'
            codeField = 'tracking_code'
            break
        case 'Traducción':
            table = 'translations'
            codeField = 'tracking_code'
            break
        case 'Otro Servicio':
            table = 'other_services'
            codeField = 'tracking_code'
            break
        default:
            return []
    }

    try {
        const { data, error } = await supabase
            .from(table)
            .select(`
                id,
                ${codeField},
                profiles:client_id (
                    first_name,
                    last_name
                )
            `)
            .ilike(codeField, `%${query}%`)
            .limit(10)

        if (error) {
            console.error(`Error searching ${table}:`, error)
            return []
        }

        return (data as any[]).map((item) => ({
            id: item.id,
            display_code: item[codeField],
            client_name: item.profiles ? `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim() : 'Cliente no encontrado'
        }))
    } catch (err) {
        console.error('Search error:', err)
        return []
    }
}
