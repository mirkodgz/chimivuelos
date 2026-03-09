'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"

export interface SearchResult {
    id: string
    display_code: string
    client_name: string
    client_phone?: string
    status?: string
    travel_date?: string
    return_date?: string
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
                status,
                travel_date,
                return_date,
                profiles:client_id (
                    first_name,
                    last_name,
                    phone
                )
            `)
            .ilike(codeField, `%${query}%`)
            .limit(10)

        if (error) {
            console.error(`Error searching ${table}:`, error)
            return []
        }

        interface ProfileData {
            first_name: string | null
            last_name: string | null
            phone: string | null
        }
        
        return (data as unknown as (Record<string, unknown> & { 
            id: string, 
            status: string,
            travel_date: string,
            return_date: string,
            profiles: ProfileData | ProfileData[] | null 
        })[]).map((item) => {
            const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
            return {
                id: item.id,
                display_code: (item[codeField] as string) || '',
                client_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Cliente no encontrado',
                client_phone: profile?.phone || '',
                status: item.status,
                travel_date: item.travel_date,
                return_date: item.return_date
            }
        })
    } catch (err) {
        console.error('Search error:', err)
        return []
    }
}
