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
    Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    getParcelFullDetails, 
    getParcelDocumentUrl,
    type Parcel,
    type ParcelDocument,
    type PaymentDetail
} from "@/app/actions/manage-parcels"
import { cn } from "@/lib/utils"
import { ParcelSalesNote } from "./ParcelSalesNote"

export default function ParcelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [parcel, setParcel] = useState<Parcel | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showSalesNote, setShowSalesNote] = useState(false)

    useEffect(() => {
        getParcelFullDetails(id).then(res => {
            if (res.success && res.parcel) {
                setParcel(res.parcel)
            } else {
                setError(res.error || 'Encomienda no encontrada')
            }
            setLoading(false)
        })
    }, [id])

    const handleDownload = async (path: string, storage: 'r2' | 'images' = 'r2') => {
        const result = await getParcelDocumentUrl(path, storage)
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

    if (!parcel) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">{error || 'Encomienda no encontrada'}</h3>
                <Link href="/chimi-encomiendas">
                    <Button variant="outline" className="mt-4 text-chimipink border-chimipink">Volver a encomiendas</Button>
                </Link>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered': return 'bg-emerald-500 text-white'
            case 'cancelled': return 'bg-rose-500 text-white'
            case 'in_transit': return 'bg-blue-500 text-white'
            case 'pending': return 'bg-amber-500 text-white'
            case 'returned': return 'bg-slate-500 text-white'
            default: return 'bg-slate-500 text-white'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente'
            case 'in_transit': return 'En Tránsito'
            case 'delivered': return 'Entregado'
            case 'cancelled': return 'Cancelado'
            case 'returned': return 'Devuelto'
            default: return status
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-500">
            
            {/* Top Navigation */}
            <Link href="/chimi-encomiendas">
                <Button variant="ghost" className="gap-2 text-slate-400 hover:text-slate-800 px-0 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Listado de Encomiendas
                </Button>
            </Link>

            {/* Unified Main Container */}
            <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
                
                {/* Header Section */}
                <div className="bg-slate-50/50 p-6 md:p-8 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Código de Rastreo</span>
                                    <Badge className={cn("text-[9px] uppercase font-bold py-0 h-5", getStatusColor(parcel.status))}>
                                        {getStatusLabel(parcel.status)}
                                    </Badge>
                                </div>
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{parcel.tracking_code || '---'}</h1>
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
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Remitente</span>
                                <div className="flex items-center gap-3 justify-end md:justify-start">
                                    <Link href={`/clients/${parcel.sender_id}`} className="text-lg font-semibold text-slate-800 hover:text-chimipink hover:underline transition-all">
                                        {parcel.profiles?.first_name} {parcel.profiles?.last_name}
                                    </Link>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{parcel.profiles?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        
                        {/* Main Body Column */}
                        <div className="lg:col-span-8 p-6 md:p-8 space-y-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                            
                            {/* 1. Recipient & Route Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Destination */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Datos del Destinatario</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Nombre Completo</span>
                                            <p className="text-lg font-bold text-slate-800 leading-tight">{parcel.recipient_name}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Teléfono Contacto</span>
                                            <p className="text-base font-medium text-slate-700 leading-tight flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-slate-400" /> {parcel.recipient_phone || '---'}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Dirección de Entrega</span>
                                            <p className="text-sm font-medium text-slate-700 leading-relaxed italic">{parcel.recipient_address || '---'}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Route */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Ruta de Envío</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 before:dashed">
                                            {/* Origin */}
                                            <div className="relative">
                                                <div className="absolute -left-[2.15rem] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow-sm ring-4 ring-blue-50" />
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Origen</span>
                                                <p className="text-sm font-bold text-slate-800">{parcel.origin_address}</p>
                                                <p className="text-xs text-slate-500 mt-1">{parcel.origin_address_client}</p>
                                            </div>
                                            {/* Destination */}
                                            <div className="relative">
                                                <div className="absolute -left-[2.15rem] top-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-white shadow-sm ring-4 ring-rose-50" />
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Destino</span>
                                                <p className="text-sm font-bold text-slate-800">{parcel.destination_address}</p>
                                                <p className="text-xs text-slate-500 mt-1">{parcel.destination_address_client}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 2. Package Details */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Información del Paquete</h3>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                                    <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Tipo</span>
                                        <p className="text-base font-bold text-slate-700 leading-tight uppercase tracking-wide">{parcel.package_type}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Peso Estimado</span>
                                        <p className="text-base font-black text-slate-800 flex items-center gap-1">
                                            {parcel.package_weight} <span className="text-[10px] font-bold text-slate-400">KG</span>
                                        </p>
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Descripción de Contenido</span>
                                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">{parcel.package_description || 'Sin descripción detallada'}</p>
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
                                    {parcel.payment_details && parcel.payment_details.length > 0 ? (
                                        parcel.payment_details.map((payment: PaymentDetail, idx: number) => (
                                            <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-xs relative overflow-hidden group">
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
                                        <p className="text-xs text-slate-400 italic py-4 col-span-full">No hay pagos registrados para este envío.</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar Column */}
                        <div className="lg:col-span-4 bg-slate-50/30 p-6 md:p-8 space-y-12">
                            
                            {/* Operational & Agent */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Información de Gestión</h3>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Agente de Seguimiento</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <UserCircle className="h-3 w-3 text-slate-400" />
                                            {parcel.agent ? `${parcel.agent.first_name} ${parcel.agent.last_name}` : 'Admin'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Fecha de Registro</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            {new Date(parcel.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">ID Operativo</span>
                                        <p className="text-[10px] font-mono font-medium text-slate-400">{parcel.id}</p>
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
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Costo de Envío (€)</span>
                                        <span className="font-bold text-slate-800">€ {parcel.shipping_cost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs pt-1">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Abonado (Total)</span>
                                        <span className="font-bold text-emerald-600">€ {parcel.on_account.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Saldo Pendiente</span>
                                        <span className={cn("font-black", (parcel.shipping_cost - parcel.on_account) > 0 ? "text-rose-500" : "text-emerald-600")}>
                                            € {(parcel.shipping_cost - parcel.on_account).toFixed(2)}
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
                                    {parcel.documents && parcel.documents.length > 0 ? (
                                        parcel.documents.map((doc: ParcelDocument, i: number) => (
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

                            {/* Notes */}
                            {(parcel.client_note || parcel.internal_note) && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Observaciones</h3>
                                    </div>
                                    <div className="space-y-5">
                                        {parcel.client_note && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nota Cliente</span>
                                                <p className="text-xs text-slate-600 bg-white p-4 rounded-2xl border border-slate-100 leading-relaxed shadow-sm italic">&quot;{parcel.client_note}&quot;</p>
                                            </div>
                                        )}
                                        {parcel.internal_note && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-chimipink tracking-wider">Nota Interna Operativa</span>
                                                <p className="text-[11px] text-slate-600 bg-pink-50/40 p-4 rounded-2xl border border-pink-100/30 italic flex gap-2">
                                                    <Info className="h-3 w-3 shrink-0 mt-0.5 text-chimipink/60" />
                                                    {parcel.internal_note}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {showSalesNote && parcel && (
                <ParcelSalesNote parcel={parcel} onClose={() => setShowSalesNote(false)} />
            )}
        </div>
    )
}
