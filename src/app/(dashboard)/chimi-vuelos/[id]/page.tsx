"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { 
    ChevronLeft, 
    Calendar, 
    FileText, 
    Plane, 
    CreditCard,
    Info,
    CheckCircle2,
    Clock,
    Wallet,
    Download,
    ClipboardList,
    AlertCircle,
    UserCircle,
    MapPin,
    Hash,
    User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFlightFullDetails, getFlightDocumentUrl } from "@/app/actions/manage-flights"
import { cn } from "@/lib/utils"

const DETAILS_LABELS: Record<string, string> = {
    ticket_one_way: "Pasaje solo ida",
    ticket_round_trip: "Pasaje ida y vuelta",
    insurance_1m: "Seguro x 1 mes",
    insurance_2m: "Seguro x 2 meses",
    insurance_3m: "Seguro x 3 meses",
    doc_invitation_letter: "Carta de invitación",
    doc_agency_managed: "Carta inv. gestionada por agencia",
    svc_airport_assistance: "Asistencia aeroportuaria",
    svc_return_activation: "Activación pasaje retorno",
    hotel_3d_2n: "Hotel 3 días / 2 noches",
    hotel_custom_active: "Hotel personalizado",
    hotel_2d_1n: "Hotel 2 días / 1 noche",
    baggage_1pc_23kg: "1 pc 23kg",
    baggage_2pc_23kg: "2 pc 23kg",
    baggage_1pc_10kg: "1 pc 10kg",
    baggage_backpack: "1 Mochila",
    insurance_tourism_active: "Seguro (Turista / Schengen)",
    insurance_migratory: "Seguro migratorio",
    svc_stewardess_um: "Azafata UMNR (Incluido)",
    svc_stewardess_um_unpaid: "Azafata UMNR (No Incluido)",
    svc_pet_travel: "Viaja con mascota",
}

export default function FlightDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [flight, setFlight] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getFlightFullDetails(id).then(res => {
            if (res.success) {
                setFlight(res.flight)
            }
            setLoading(false)
        })
    }, [id])

    const handleDownload = async (path: string, storage: 'r2' | 'images') => {
        const result = await getFlightDocumentUrl(path, storage)
        if (result.url) {
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

    if (!flight) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Vuelo no encontrado</h3>
                <Link href="/chimi-vuelos">
                    <Button variant="outline" className="mt-4 text-chimipink border-chimipink">Volver a vuelos</Button>
                </Link>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Finalizado': return 'bg-emerald-500 text-white'
            case 'Cancelado':
            case 'Deportado': return 'bg-rose-500 text-white'
            case 'En tránsito':
            case 'En migración': return 'bg-blue-500 text-white'
            case 'Programado': return 'bg-sky-500 text-white'
            case 'Reprogramado por cliente':
            case 'Reprogramado por aerolínea': return 'bg-orange-500 text-white'
            case 'Cambio de horario': return 'bg-yellow-500 text-white'
            default: return 'bg-slate-500 text-white'
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-500">
            
            {/* Top Navigation */}
            <Link href="/chimi-vuelos">
                <Button variant="ghost" className="gap-2 text-slate-400 hover:text-slate-800 px-0 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Listado de Vuelos
                </Button>
            </Link>

            {/* Unified Main Container */}
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                
                {/* Header Section - Integrated */}
                <div className="bg-slate-50/50 p-8 md:p-12 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-200">
                                <Plane className="h-8 w-8 text-chimipink" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reserva PNR</span>
                                    <Badge className={cn("text-[9px] uppercase font-bold py-0 h-5", getStatusColor(flight.status))}>
                                        {flight.status}
                                    </Badge>
                                </div>
                                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{flight.pnr || '---'}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Pasajero Responsable</span>
                                <div className="flex items-center gap-3">
                                    <Link href={`/clients/${flight.client_id}`} className="text-lg font-semibold text-slate-800 hover:text-chimipink hover:underline transition-all">
                                        {flight.profiles?.first_name} {flight.profiles?.last_name}
                                    </Link>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{flight.profiles?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        
                        {/* Main Body Column */}
                        <div className="lg:col-span-8 p-8 md:p-12 space-y-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                            
                            {/* 1. Trip Information Detail */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-5 w-5 text-blue-500" />
                                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Información del Viaje</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                    <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Ruta / Itinerario</span>
                                        <p className="text-lg font-medium text-slate-700 leading-tight">{flight.itinerary}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Tipo de Pasaje</span>
                                        <p className="text-lg font-medium text-slate-700 leading-tight">{flight.ticket_type || 'General'}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Fecha Salida</span>
                                        <p className="text-base font-medium text-slate-700 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-emerald-500" />
                                            {flight.travel_date ? new Date(flight.travel_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : '---'}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Fecha Retorno</span>
                                        <p className="text-base font-medium text-slate-700 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-rose-500" />
                                            {flight.return_date ? new Date(flight.return_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Solo ida'}
                                        </p>
                                    </div>
                                </div>

                                {/* PAX Summary Bar - Inline */}
                                <div className="grid grid-cols-4 gap-4 bg-slate-50/70 p-5 rounded-[1.5rem] border border-slate-100/50">
                                    <div className="text-center group">
                                        <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Total PAX</span>
                                        <span className="text-2xl font-bold text-slate-800 group-hover:text-chimipink transition-colors">{flight.pax_total || 0}</span>
                                    </div>
                                    <div className="text-center border-l border-slate-200">
                                        <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">ADT</span>
                                        <span className="text-sm font-bold text-slate-600">{flight.pax_adt || 0}</span>
                                    </div>
                                    <div className="text-center border-l border-slate-200">
                                        <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">CHD</span>
                                        <span className="text-sm font-bold text-slate-600">{flight.pax_chd || 0}</span>
                                    </div>
                                    <div className="text-center border-l border-slate-200">
                                        <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">INF</span>
                                        <span className="text-sm font-bold text-slate-600">{flight.pax_inf || 0}</span>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 2. Services & Requirements - Side by Side internal */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList className="h-4 w-4 text-emerald-500" />
                                        <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-widest">Servicios Incluidos</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {flight.details && Object.entries(flight.details).some(([k, v]) => v === true && DETAILS_LABELS[k]) ? (
                                            Object.entries(flight.details).map(([key, value]) => {
                                                if (!value || !DETAILS_LABELS[key]) return null
                                                return (
                                                    <div key={key} className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50/50 px-3 py-2 rounded-xl transition-all hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                                        {DETAILS_LABELS[key]}
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <p className="text-xs text-slate-400 italic py-4">No se registraron servicios adicionales.</p>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <UserCircle className="h-4 w-4 text-chimipink" />
                                        <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-widest">Requisitos de Menor</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {flight.required_documents && Object.keys(flight.required_documents).length > 0 ? (
                                            Object.entries(flight.required_documents as Record<string, any>).map(([name, data]) => {
                                                if (!data.required && data.status === 'no') return null
                                                return (
                                                    <div key={name} className="flex items-center justify-between text-xs bg-slate-50/50 px-3 py-2.5 rounded-xl border border-slate-100/50">
                                                        <span className="text-slate-600 font-medium">{name}</span>
                                                        <Badge className={cn(
                                                            "text-[9px] font-bold py-0 h-5 px-3 rounded-full",
                                                            data.status === 'si' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                                        )}>
                                                            {data.status === 'si' ? 'SÍ' : data.status === 'na' ? 'N/A' : 'NO'}
                                                        </Badge>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <p className="text-xs text-slate-400 italic py-4">Sin registro de requisitos especiales.</p>
                                        )}
                                        {flight.minor_travel_with && (
                                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mt-2">
                                                <span className="text-[9px] uppercase font-black text-blue-400 block mb-1">Viaja acompañado por</span>
                                                <p className="text-xs font-bold text-blue-700">{flight.minor_travel_with}</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 3. Payment Detail List */}
                            <section className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-5 w-5 text-emerald-500" />
                                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Historial de Pagos</h3>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {flight.payment_details && flight.payment_details.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {flight.payment_details.map((payment: any, idx: number) => (
                                                <div key={idx} className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-xs relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50 pb-3 mb-3">
                                                        <span>Transacción #{idx + 1}</span>
                                                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/D'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Forma / Sede</span>
                                                            <p className="text-xs font-bold text-slate-700">{payment.metodo_it || payment.metodo_pe || '---'}</p>
                                                            <p className="text-[10px] text-slate-400 italic">Sede: {payment.sede_it || payment.sede_pe || 'Universal'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Equivalente EUR</span>
                                                            <p className="text-lg font-black text-emerald-600 leading-none">€ {parseFloat(payment.cantidad).toFixed(2)}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-1">{payment.moneda} {parseFloat(payment.monto_original || payment.cantidad).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                    {payment.proof_path && (
                                                        <button 
                                                            onClick={() => handleDownload(payment.proof_path, payment.proof_path.startsWith('clients/') ? 'r2' : 'images')}
                                                            className="mt-4 w-full h-8 text-[10px] font-black text-chimiteal bg-teal-50/50 hover:bg-teal-50 rounded-xl flex items-center justify-center gap-2 border border-teal-100/30 tracking-widest"
                                                        >
                                                            <Download className="h-3 w-3" /> VER COMPROBANTE
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-dashed border-slate-200 py-10 rounded-[1.5rem] text-center">
                                            <p className="text-xs text-slate-400 font-medium italic">No se han registrado transacciones financieras aún.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar Column within the Card */}
                        <div className="lg:col-span-4 bg-slate-50/30 p-8 md:p-12 space-y-12">
                            
                            {/* Technical Details - Integrated Sidebar */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <Info className="h-4 w-4 text-chimicyan" />
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Datos Técnicos</h3>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">GDS / IATA</span>
                                        <p className="text-sm font-bold text-slate-700">{flight.iata_gds || 'No especificado'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Agente a Cargo</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <User className="h-3 w-3 text-slate-400" />
                                            {flight.agent ? `${flight.agent.first_name} ${flight.agent.last_name}` : 'Admin'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">ID Registro</span>
                                        <p className="text-[10px] font-mono font-medium text-slate-400">{flight.id}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Financial Summary - Integrated Sidebar */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <Wallet className="h-4 w-4 text-chimipink" />
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Resumen Financiero</h3>
                                </div>
                                <Card className="border-none shadow-none bg-white/50 p-5 rounded-2xl space-y-4">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Precio de Venta</span>
                                        <span className="font-bold text-slate-800">€ {flight.sold_price.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Costo Operativo</span>
                                        <span className="font-medium text-slate-600 italic">€ {flight.cost.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between">
                                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Comisión (Fee)</span>
                                        <span className="text-sm font-black text-emerald-700">€ {flight.fee_agv.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-emerald-500 p-4 rounded-xl text-white shadow-lg shadow-emerald-500/10">
                                        <span className="text-[9px] font-black uppercase tracking-wider block mb-1">Total Abonado</span>
                                        <p className="text-2xl font-black leading-none inline-block">€ {flight.on_account.toFixed(2)}</p>
                                        <p className="text-[10px] mt-1 opacity-80 font-bold uppercase tracking-widest underline decoration-white/30 underline-offset-2">Saldo: € {flight.balance.toFixed(2)}</p>
                                    </div>
                                </Card>
                            </section>

                            {/* Attachments - Integrated Sidebar */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <Hash className="h-4 w-4 text-chimicyan" />
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Archivos / Documentos</h3>
                                </div>
                                <div className="space-y-3">
                                    {flight.documents && flight.documents.length > 0 ? (
                                        flight.documents.map((doc: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-chimicyan/50 transition-colors group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4 text-slate-400 group-hover:text-chimicyan transition-colors" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{doc.title}</p>
                                                        <p className="text-[9px] text-slate-400 font-black tracking-tighter uppercase">{doc.type || 'Anexo'}</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 rounded-full hover:bg-chimicyan/10 text-slate-400 hover:text-chimicyan"
                                                    onClick={() => handleDownload(doc.path, doc.storage)}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">No hay documentos adjuntos.</p>
                                    )}
                                </div>
                            </section>

                            {/* Internal Notes - Integrated Sidebar */}
                            {(flight.client_note || flight.internal_note) && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Observaciones</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {flight.client_note && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nota Cliente</span>
                                                <p className="text-xs text-slate-600 bg-white p-4 rounded-2xl border border-slate-100 leading-relaxed">{flight.client_note}</p>
                                            </div>
                                        )}
                                        {flight.internal_note && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-chimipink tracking-wider">Nota Interna</span>
                                                <p className="text-[11px] text-slate-600 bg-pink-50/40 p-4 rounded-2xl border border-pink-100/30 italic leading-relaxed">{flight.internal_note}</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Logs History - Integrated Sidebar */}
                            {flight.flight_date_history && flight.flight_date_history.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Trazabilidad</h3>
                                    </div>
                                    <div className="space-y-5 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-100 pl-8">
                                        {flight.flight_date_history.map((h: any, i: number) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-8 top-1.5 h-3 w-3 rounded-full bg-white border-2 border-amber-400 z-10" />
                                                <p className="text-xs font-bold text-slate-700">Cambio: {new Date(h.date).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Por {h.changed_by} el {new Date(h.changed_at).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Print Footer Placeholder */}
            <div className="flex justify-center text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] py-10">
                Resumen Oficial Chimivuelos — Generado Automáticamente
            </div>
        </div>
    )
}
