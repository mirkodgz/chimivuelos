'use server'

import { supabaseAdmin } from "@/lib/supabase/admin"

export interface StatusHistoryEntry {
    status: string
    changed_at: string
    changed_by?: string
}

export async function getResourceStatusHistory(resourceId: string, resourceType: string): Promise<StatusHistoryEntry[]> {
    const supabase = supabaseAdmin
    
    const { data, error } = await supabase
        .from('audit_logs')
        .select(`
            *,
            profiles:actor_id (
                first_name,
                last_name
            )
        `)
        .eq('resource_id', resourceId)
        .eq('resource_type', resourceType)
        .eq('action', 'update')
        .order('created_at', { ascending: false })

    if (error) {
        console.error(`Error fetching history for ${resourceType} ${resourceId}:`, error)
        return []
    }

    // Filter and map to get status changes
    const history: StatusHistoryEntry[] = []
    
    // We also need the creation status if possible, but audit_logs for 'create' 
    // might not be consistently used or might not have 'status' in a way we want to show here.
    // For now, let's focus on updates.

    data.forEach(log => {
        // Check if status was changed in this log
        // The recordAuditLog function saves a snapshot in new_values
        if (log.new_values && log.new_values.status) {
            // Compare with old_values status if exists
            const oldStatus = log.old_values?.status
            const newStatus = log.new_values.status

            if (newStatus !== oldStatus) {
                const actor = log.profiles as { first_name: string | null; last_name: string | null } | null
                history.push({
                    status: newStatus,
                    changed_at: log.created_at,
                    changed_by: actor ? `${actor.first_name || ''} ${actor.last_name || ''}`.trim() : 'Sistema'
                })
            }
        }
    })

    return history
}
