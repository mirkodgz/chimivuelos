'use client'

import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getResourceStatusHistory, type StatusHistoryEntry } from '@/app/actions/get-history'

interface StatusHistoryProps {
    resourceId: string
    resourceType: string
    statusLabels?: Record<string, string>
    createdAt?: string | Date
}

export function StatusHistory({ resourceId, resourceType, statusLabels, createdAt }: StatusHistoryProps) {
    const [history, setHistory] = useState<StatusHistoryEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getResourceStatusHistory(resourceId, resourceType).then(res => {
            // Combine with creation event if provided
            let finalHistory = res;
            if (createdAt) {
                const creationDate = new Date(createdAt);
                // Check if already in history (sometimes creation is logged as update if logic is weird)
                const exists = res.some(h => new Date(h.changed_at).getTime() === creationDate.getTime());
                if (!exists) {
                    finalHistory = [...res, {
                        status: 'CREACIÓN',
                        changed_at: creationDate.toISOString(),
                        changed_by: 'Sistema'
                    }].sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
                }
            }
            setHistory(finalHistory)
            setLoading(false)
        })
    }, [resourceId, resourceType, createdAt])

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse p-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="h-3 w-3 rounded-full bg-slate-200" />
                        <div className="space-y-2">
                            <div className="h-2 w-16 bg-slate-100 rounded" />
                            <div className="h-3 w-32 bg-slate-200 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin historial de cambios</p>
            </div>
        )
    }

    const getLabel = (status: string) => (statusLabels?.[status] || status).toUpperCase()
    
    // Mapping colors to match the specific vibes of the image
    const getDotColor = (status: string) => {
        const s = status.toLowerCase();
        // Red for cancelled/deported
        if (s.includes('cancelado') || s.includes('cancelled') || s.includes('deportado') || s.includes('deported')) return 'bg-rose-500'
        // Green for completed/delivered/finalized
        if (s.includes('finalizado') || s.includes('entregado') || s.includes('completado') || s.includes('delivered') || s.includes('completed') || s.includes('finished')) return 'bg-emerald-500'
        // Orange/Amber for transit
        if (s.includes('tránsito') || s.includes('transito') || s.includes('transit') || s.includes('in_transit')) return 'bg-orange-500'
        // Sky Blue for scheduled/pending
        if (s.includes('programado') || s.includes('scheduled') || s.includes('pending') || s.includes('pendiente')) return 'bg-sky-500'
        // Blue for in process
        if (s.includes('proceso') || s.includes('process') || s.includes('processing')) return 'bg-blue-500'
        // Amber for rescheduled
        if (s.includes('reprogramado') || s.includes('rescheduled')) return 'bg-amber-500'
        
        return 'bg-slate-400'
    }

    return (
        <div className="space-y-8 py-2">
            {/* Header matches the image: Pink icon and Pink Title */}
            <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5 text-chimipink" />
                <h3 className="text-sm font-black text-chimipink uppercase tracking-wider">Historial de Cambio</h3>
            </div>

            <div className="relative space-y-6 before:absolute before:inset-0 before:left-[5px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 pl-6">
                {history.map((entry, idx) => (
                    <div key={idx} className="relative group">
                        {/* Dot on the line */}
                        <div className={cn(
                            "absolute -left-[24.5px] top-1.5 h-3 w-3 rounded-full border-2 border-white ring-2 ring-white z-10",
                            getDotColor(entry.status)
                        )} />
                        
                        <div className="space-y-1">
                            {/* Date in format DD/MM/YY as seen in image */}
                            <p className="text-[10px] text-slate-400 font-bold tracking-tight">
                                {new Date(entry.changed_at).toLocaleDateString('es-PE', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: '2-digit' 
                                })}
                            </p>
                            
                            {/* Status in BOLD UPPERCASE as seen in image */}
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">
                                {getLabel(entry.status)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
