'use client'

import React, { useState } from 'react'
import { AlertCircle, Users } from 'lucide-react'
import { cn } from "@/lib/utils"
import { updateFlightRequiredDocumentStatus } from '@/app/actions/client-portal'
import { toast } from 'sonner'

interface RequiredDocs {
    [key: string]: {
        required: boolean
        status: 'si' | 'no' | 'na'
        extra?: string
    }
}

interface FlightMinorsChecklistProps {
    flightId: string
    minorTravelWith?: string | null
    requiredDocuments?: Record<string, { required: boolean, status: string, extra?: string }>
}

export function FlightMinorsChecklist({ flightId, minorTravelWith, requiredDocuments }: FlightMinorsChecklistProps) {
    const docs = (requiredDocuments as RequiredDocs) || {}
    const [localDocs, setLocalDocs] = useState<RequiredDocs>(docs)
    const [loadingDoc, setLoadingDoc] = useState<string | null>(null)

    const hasRequiredDocs = Object.values(docs).some(d => d.required)
    if (!minorTravelWith && !hasRequiredDocs) return null

    const handleUpdateStatus = async (docName: string, newStatus: 'si' | 'no') => {
        if (localDocs[docName].status === newStatus) return

        setLoadingDoc(docName)
        try {
            const result = await updateFlightRequiredDocumentStatus(flightId, docName, newStatus)
            if (result.success) {
                setLocalDocs(prev => ({
                    ...prev,
                    [docName]: { ...prev[docName], status: newStatus }
                }))
                toast.success('Estado actualizado')
            } else {
                toast.error(result.error || 'Error al actualizar')
            }
        } catch {
            toast.error('Error de conexión')
        } finally {
            setLoadingDoc(null)
        }
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-chimipink uppercase tracking-wider flex items-center gap-2">
                <Users size={14} /> Campos Adicionales
            </h3>

            <div className="bg-white/40 border border-white/40 rounded-2xl p-5 space-y-6">
                {minorTravelWith && (
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">¿Con quién viaja el menor?</p>
                        <div className="bg-white/60 p-3 rounded-xl border border-white/40 text-sm text-slate-700">
                            {minorTravelWith}
                        </div>
                    </div>
                )}

                {hasRequiredDocs && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-600/70 py-1">
                            <AlertCircle size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Confirme sus documentos</span>
                        </div>

                        <div className="grid gap-3">
                            {Object.entries(localDocs).filter(([, info]) => info.required).map(([doc, info]) => (
                                <div 
                                    key={doc} 
                                    className="flex flex-col gap-2"
                                >
                                    <span className="text-xs text-slate-500 font-medium px-1">
                                        {doc === 'Otros' && info.extra ? `Otros: ${info.extra}` : doc}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        {info.status === 'na' ? (
                                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-100">No Aplica (N/A)</span>
                                        ) : (
                                            <div className="flex bg-white/60 p-1 rounded-xl border border-white/80 w-fit shadow-sm">
                                                <button
                                                    onClick={() => handleUpdateStatus(doc, 'si')}
                                                    disabled={loadingDoc === doc}
                                                    className={cn(
                                                        "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                        info.status === 'si' 
                                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200/50" 
                                                            : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    SÍ
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(doc, 'no')}
                                                    disabled={loadingDoc === doc}
                                                    className={cn(
                                                        "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                        info.status === 'no' 
                                                            ? "bg-rose-500 text-white shadow-lg shadow-rose-200/50" 
                                                            : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    NO
                                                </button>
                                                {loadingDoc === doc && (
                                                    <div className="px-2 flex items-center">
                                                        <div className="h-3 w-3 border-2 border-chimipink/30 border-t-chimipink rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
