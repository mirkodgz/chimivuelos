"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { 
    ChevronLeft, 
    FileText, 
    Info,
    Download,
    AlertCircle,
    UserCircle,
    Phone,
    Calendar,
    Globe2,
    Languages,
    FileSearch,
    Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusHistory } from "@/components/StatusHistory"
import { OperationalFileTitle } from "@/components/OperationalFileTitle"
import { 
    getTranslationFullDetails, 
    getTranslationDocumentUrl,
    type Translation,
    type TranslationDocument,
    type PaymentDetail
} from "@/app/actions/manage-translations"
import { cn } from "@/lib/utils"
import { TranslationSalesNote } from "./TranslationSalesNote"

export default function TranslationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [translation, setTranslation] = useState<Translation | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showSalesNote, setShowSalesNote] = useState(false)

    useEffect(() => {
        getTranslationFullDetails(id).then(res => {
            if (res.success && res.translation) {
                setTranslation(res.translation)
            } else {
                setError(res.error || 'Trámite no encontrado')
            }
            setLoading(false)
        })
    }, [id])

    const handleDownload = async (path: string, storage: 'r2' | 'images' = 'r2') => {
        const result = await getTranslationDocumentUrl(path, storage)
        if ('url' in result && result.url) {
            window.open(result.url, '_blank')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chimipink"></div>
            </div>
        )
    }

    if (!translation) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">{error || 'Trámite no encontrado'}</h3>
                <Link href="/chimi-traducciones">
                    <Button variant="outline" className="mt-4 text-chimipink border-chimipink">Volver a traducciones</Button>
                </Link>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500 text-white'
            case 'cancelled': return 'bg-rose-500 text-white'
            case 'in_process': return 'bg-blue-500 text-white'
            case 'pending': return 'bg-amber-500 text-white'
            default: return 'bg-slate-500 text-white'
        }
    }

    const getStatusLabel = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'pending') return 'Pendiente'
        if (s === 'in_process' || s === 'processing') return 'En Proceso'
        if (s === 'completed') return 'Completado'
        if (s === 'delivered') return 'Entregado'
        if (s === 'cancelled') return 'Cancelado'
        return status.toUpperCase()
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-500">
            
            {/* Top Navigation */}
            <Link href="/chimi-traducciones">
                <Button variant="ghost" className="gap-2 text-slate-400 hover:text-slate-800 px-0 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Listado de Traducciones
                </Button>
            </Link>

            {/* Unified Main Container */}
            <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
                
                {/* Header Section */}
                <div className="bg-slate-50/50 p-6 md:p-8 border-b border-slate-100">
                    <OperationalFileTitle />
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Código de Trámite</span>
                                    <Badge className={cn("text-[9px] uppercase font-bold py-0 h-5", getStatusColor(translation.status))}>
                                        {getStatusLabel(translation.status)}
                                    </Badge>
                                </div>
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{translation.tracking_code || '---'}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <Button 
                                onClick={() => setShowSalesNote(true)}
                                className="bg-slate-800 hover:bg-slate-900 text-white gap-2 font-bold px-5 h-11 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-95"
                            >
                                <Printer size={18} />
                                <span className="hidden sm:inline">Nota de Venta</span>
                            </Button>
                            <div className="space-y-1 text-right md:text-left">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Cliente</span>
                                <div className="flex items-center gap-3 justify-end md:justify-start">
                                    <Link href={`/clients/${translation.client_id}`} className="text-lg font-semibold text-slate-800 hover:text-chimipink hover:underline transition-all">
                                        {translation.profiles?.first_name} {translation.profiles?.last_name}
                                    </Link>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{translation.profiles?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        
                        {/* Main Body Column */}
                        <div className="lg:col-span-8 p-6 md:p-8 space-y-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                            
                            {/* 1. Recipient & Language Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Languages */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Idiomas y Servicio</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Origen</span>
                                                <p className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                    <Globe2 className="h-4 w-4 text-slate-300" />
                                                    {translation.source_language || '---'}
                                                </p>
                                            </div>
                                            <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Destino</span>
                                                <p className="text-base font-bold text-chimipink flex items-center gap-2">
                                                    <Languages className="h-4 w-4 text-chimipink/40" />
                                                    {translation.target_language || '---'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-50">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Tipos de Trabajo</span>
                                            <div className="flex flex-wrap gap-2">
                                                {translation.work_types?.map((type, i) => (
                                                    <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[9px] uppercase">
                                                        {type}
                                                    </Badge>
                                                ))}
                                                {translation.work_types_other && (
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[9px] uppercase">
                                                        {translation.work_types_other}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Delivery Info */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Datos de Entrega</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Nombre del Receptor</span>
                                            <p className="text-lg font-bold text-slate-800 leading-tight">{translation.recipient_name || '---'}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Teléfono Contacto</span>
                                            <p className="text-base font-medium text-slate-700 leading-tight flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-slate-400" /> {translation.recipient_phone || '---'}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Dirección de Envío</span>
                                            <p className="text-sm font-medium text-slate-700 leading-relaxed italic">{translation.destination_address || '---'}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{translation.destination_address_client}</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 2. Document Details */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Documentos del Trámite</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Tipos de Documentos</span>
                                            <div className="flex flex-wrap gap-2">
                                                {translation.document_types?.map((type, i) => (
                                                    <Badge key={i} variant="outline" className="border-slate-200 text-slate-600 font-bold text-[9px] uppercase px-3">
                                                        {type}
                                                    </Badge>
                                                ))}
                                                {translation.document_types_other && (
                                                    <Badge variant="outline" className="border-pink-200 text-chimipink font-bold text-[9px] uppercase px-3">
                                                        {translation.document_types_other}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Cantidad Total</span>
                                            <p className="text-base font-black text-slate-800 bg-slate-100 w-fit px-4 py-1 rounded-full">
                                                {translation.quantity} <span className="text-[10px] font-bold text-slate-400">DOCS</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-2">Descripción de Contenido / Notas</span>
                                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">{translation.notes || 'Sin especificaciones adicionales'}</p>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 3. Payments History */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-widest">Abonos y Pagos</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {translation.payment_details && translation.payment_details.length > 0 ? (
                                        translation.payment_details.map((payment: PaymentDetail, idx: number) => (
                                            <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-xs relative overflow-hidden group transition-all hover:shadow-md">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50 pb-2 mb-2">
                                                    <span>Pago #{idx + 1}</span>
                                                    <span>{payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '---'}</span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-slate-700 truncate">{payment.metodo_it || payment.metodo_pe || '---'}</p>
                                                        <p className="text-[9px] text-slate-400 italic">Sede: {payment.sede_it || payment.sede_pe || 'Universal'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-emerald-600 leading-none">{payment.total || `€ ${payment.cantidad}`}</p>
                                                        {payment.moneda !== 'EUR' && (
                                                            <p className="text-[9px] text-slate-400 font-medium mt-1">€ {parseFloat(payment.cantidad).toFixed(2)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {payment.proof_path && (
                                                    <button 
                                                        onClick={() => handleDownload(payment.proof_path!, 'r2')}
                                                        className="mt-3 w-full h-7 text-[9px] font-black text-chimiteal bg-teal-50/50 hover:bg-teal-50 rounded-lg flex items-center justify-center gap-2 border border-teal-100/30 tracking-widest"
                                                    >
                                                        <Download className="h-2.5 w-2.5" /> COMPROBANTE
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic py-4 col-span-full text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">No hay pagos registrados para este trámite.</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar Column */}
                        <div className="lg:col-span-4 bg-slate-50/30 p-6 md:p-8 space-y-12">
                            
                            {/* Status History (Audit Logs) */}
                            <StatusHistory 
                                resourceId={translation.id} 
                                resourceType="translations"
                                statusLabels={{
                                    pending: 'Pendiente',
                                    in_process: 'En Proceso',
                                    processing: 'En Proceso',
                                    completed: 'Completado',
                                    delivered: 'Entregado',
                                    cancelled: 'Cancelado'
                                }}
                            />

                            {/* Management Info */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Información de Gestión</h3>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Agente Responsable</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <UserCircle className="h-3 w-3 text-slate-400" />
                                            {translation.agent ? `${translation.agent.first_name} ${translation.agent.last_name}` : 'Admin'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Fecha de Registro</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            {new Date(translation.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">DNI/Documento Cliente</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <FileSearch className="h-3 w-3 text-slate-400" />
                                            {translation.profiles?.document_number || '---'}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Financial Summary */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Resumen Económico</h3>
                                </div>
                                <Card className="border-none shadow-none bg-white/50 p-5 rounded-2xl space-y-4">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Monto Total (€)</span>
                                        <span className="font-bold text-slate-800">€ {translation.total_amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs pt-1">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Abonado (Total)</span>
                                        <span className="font-bold text-emerald-600">€ {translation.on_account.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Saldo Pendiente</span>
                                        <span className={cn("font-black", (translation.total_amount - translation.on_account) > 0 ? "text-rose-500" : "text-emerald-600")}>
                                            € {(translation.total_amount - translation.on_account).toFixed(2)}
                                        </span>
                                    </div>
                                </Card>
                            </section>

                            {/* Document List */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Documentos Adjuntos</h3>
                                </div>
                                <div className="space-y-3">
                                    {translation.documents && translation.documents.length > 0 ? (
                                        translation.documents.map((doc: TranslationDocument, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-chimicyan/50 transition-colors group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4 text-slate-400 group-hover:text-chimicyan transition-colors" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{doc.title}</p>
                                                        <p className="text-[9px] text-slate-400 font-black tracking-tighter uppercase shrink-0">{(doc.size / 1024).toFixed(0)} KB</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 rounded-full hover:bg-chimicyan/10 text-slate-400 hover:text-chimicyan"
                                                    onClick={() => handleDownload(doc.path, doc.storage || 'r2')}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">No se encontraron archivos.</p>
                                    )}
                                </div>
                            </section>

                            {/* Internal Notes */}
                            {translation.internal_notes && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Observaciones Internas</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[11px] text-slate-600 bg-amber-50/40 p-4 rounded-2xl border border-amber-100/30 italic flex gap-2">
                                            <Info className="h-3 w-3 shrink-0 mt-0.5 text-amber-500/60" />
                                            {translation.internal_notes}
                                        </p>
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {showSalesNote && translation && (
                <TranslationSalesNote translation={translation} onClose={() => setShowSalesNote(false)} />
            )}
        </div>
    )
}
