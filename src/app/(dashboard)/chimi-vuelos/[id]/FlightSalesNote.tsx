import React from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Printer, X, AlertCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Flight } from "@/app/actions/manage-flights"

const DETAILS_LABELS: Record<string, string> = {
    ticket_one_way: "Pasaje solo ida",
    ticket_round_trip: "Pasaje ida y vuelta",
    insurance_1m: "Seguro de viaje (1 mes)",
    insurance_2m: "Seguro de viaje (2 meses)",
    insurance_3m: "Seguro de viaje (3 meses)",
    doc_invitation_letter: "Carta de invitación",
    doc_agency_managed: "Carta de invitación gestionada",
    svc_airport_assistance: "Asistencia aeroportuaria",
    svc_return_activation: "Activación de pasaje de retorno",
    hotel_3d_2n: "Alojamiento Hotel (3D/2N)",
    hotel_custom_active: "Alojamiento Hotel Personalizado",
    hotel_2d_1n: "Alojamiento Hotel (2D/1N)",
    baggage_1pc_23kg: "Equipaje en bodega (1 x 23kg)",
    baggage_2pc_23kg: "Equipaje en bodega (2 x 23kg)",
    baggage_1pc_10kg: "Equipaje de mano (1 x 10kg)",
    baggage_backpack: "Artículo personal (Mochila)",
    insurance_tourism_active: "Seguro de Turismo / Schengen",
    insurance_migratory: "Seguro Migratorio / Requisito",
    svc_stewardess_agency: "Azafata UMNR (Agencia realiza solicitud)",
    svc_stewardess_paid_client: "Azafata UMNR (Cliente hizo el pago)",
    svc_stewardess_paid_airline: "Azafata UMNR (Solicitada y pagada a aerolínea)",
    svc_stewardess_paid_airport: "Azafata UMNR (Se paga en aeropuerto)",
    svc_pet_travel: "Transporte de Mascota",
}

export function FlightSalesNote({ flight, onClose }: { flight: Flight, onClose: () => void }) {
    const [mounted, setMounted] = React.useState(false)
    
    React.useEffect(() => {
        setMounted(true)
        // Bloquear scroll del body mientras el modal está abierto
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    const handlePrint = () => {
        window.print()
    }

    const today = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })

    if (!mounted) return null

    const modalContent = (
        <div className="fixed inset-0 z-99999 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white print:static overflow-y-auto">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        margin: 0; 
                        size: A4 portrait; 
                    }
                    /* AISLAMIENTO NUCLEAR: Ocultar todo en el body excepto NUESTRO portal */
                    body > *:not(.print-portal-root) {
                        display: none !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        min-width: 210mm !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-portal-root {
                        width: 100% !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #sales-note-wrapper {
                        width: 210mm !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    #sales-note {
                        width: 210mm !important;
                        padding: 10mm !important;
                    }
                    
                    /* FORZAR LAYOUT DESKTOP EN PRINT (Solución para móviles) */
                    #sales-note .md\\:flex-row { flex-direction: row !important; }
                    #sales-note .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    #sales-note .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
                    #sales-note .md\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
                    #sales-note .md\\:col-span-7 { grid-column: span 7 / span 7 !important; }
                    #sales-note .md\\:col-span-5 { grid-column: span 5 / span 5 !important; }
                    #sales-note .md\\:text-right { text-align: right !important; }
                    #sales-note .md\\:items-end { align-items: flex-end !important; }
                    
                    /* Asegurar que las secciones horizontales no se apilen */
                    #sales-note .flex-col.md\\:flex-row { flex-direction: row !important; }
                    #sales-note .grid-cols-1.md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    
                    /* Ajustes de espaciado para que quepa en una página */
                    #sales-note .p-10 { padding: 1.5rem !important; }
                    #sales-note .p-6 { padding: 1rem !important; }
                    #sales-note .gap-8 { gap: 1rem !important; }
                    #sales-note .mb-8 { margin-bottom: 1.5rem !important; }
                    #sales-note .mb-6 { margin-bottom: 1rem !important; }
                }
            `}} />
            <div id="sales-note-wrapper" className="bg-white w-full max-w-[800px] my-auto rounded-lg shadow-2xl flex flex-col print:shadow-none print:rounded-none">
                {/* Preview Header - Hidden on Print */}
                <div id="preview-header" className="flex items-center justify-between p-3 border-b bg-white/80 backdrop-blur-md sticky top-0 z-20 print:hidden rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-slate-900 rounded flex items-center justify-center shadow-lg shadow-slate-200">
                            <Printer size={14} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Documento Oficial</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Vista Previa Nota de Venta</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs">
                            <X size={14} /> Cancelar
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handlePrint} 
                            className="h-8 gap-2 bg-slate-900 hover:bg-black text-white px-4 font-black shadow-xl shadow-slate-200 transition-all active:scale-95 text-xs"
                        >
                            <Printer size={14} /> Confirmar e Imprimir
                        </Button>
                    </div>
                </div>

                {/* Sales Note Content */}
                <div id="sales-note" className="p-0 text-slate-900 print:text-[10pt] font-sans">
                    
                     {/* Formal Header Bar - Ultra Compact */}
                    <div className="bg-linear-to-r from-chimipink to-chimicyan text-slate-950 p-2.5 md:p-3.5 flex flex-col md:flex-row justify-between items-center gap-2">
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 flex items-center justify-center h-10 w-10">
                                <Image
                                    src="/IconChimiVuelos-White.svg" 
                                    alt="Chimi Vuelos Logo"
                                    width={40}
                                    height={40}
                                    className="h-8 w-auto object-contain brightness-0"
                                    unoptimized
                                />
                            </div>
                            <div className="h-6 w-px bg-slate-950/20 hidden md:block" />
                            <div className="text-center md:text-left">
                                <h1 className="text-base font-black tracking-tighter leading-none uppercase">CHIMI VUELOS</h1>
                                <p className="text-[7px] uppercase font-bold text-slate-950/80 tracking-[0.2em] mt-0.5">Agencia de Viajes & Turismo</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded border border-slate-950/20 flex flex-col items-center md:items-end min-w-[140px]">
                                <h2 className="text-[7px] font-black text-slate-950/70 uppercase tracking-widest mb-0.5 leading-none">Nota de Venta No.</h2>
                                <p className="text-sm font-black text-slate-950 tracking-widest leading-none uppercase">{flight.pnr || '---'}</p>
                            </div>
                            <div className="text-right hidden md:block">
                                <p className="text-[7px] font-black text-slate-950/70 uppercase tracking-widest leading-none mb-0.5">Expedido el</p>
                                <p className="text-[9px] font-black text-slate-950 uppercase leading-none">{today}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-8">
                        {/* Section: Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Client Section */}
                             <div className="space-y-1">
                                <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-0.5">
                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">I. Datos del Cliente</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-1 pt-0">
                                    <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Nombre y Apellido</p>
                                        <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{(flight.profiles?.first_name || 'PASAJERO').toUpperCase()} {(flight.profiles?.last_name || '').toUpperCase()}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex-1">
                                            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">DNI / Documento</p>
                                            <p className="text-[10px] font-black text-slate-900 leading-none">{flight.profiles?.document_number || '---'}</p>
                                        </div>
                                        <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex-1">
                                            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Teléfono</p>
                                            <p className="text-[10px] font-black text-slate-900 leading-none">{flight.profiles?.phone || '---'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Flight Section */}
                             <div className="space-y-1">
                                <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-0.5">
                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">II. Detalles del Itinerario</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-1 pt-0">
                                    <div className="bg-linear-to-r from-chimipink to-chimicyan text-slate-950 px-2 py-1 rounded flex justify-between items-center shadow-md border border-chimipink/20">
                                        <div>
                                            <p className="text-[7px] font-black text-slate-950/70 uppercase tracking-widest mb-0 leading-none">PNR / Reserva</p>
                                            <p className="text-[13px] font-black tracking-[0.2em] leading-none">{flight.pnr || 'CONFIRMAR'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[7px] font-black text-slate-950/70 uppercase tracking-widest mb-0 leading-none">Ruta</p>
                                            <p className="text-[10px] font-black uppercase leading-none">{flight.itinerary}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex-1">
                                            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Salida</p>
                                            <p className="text-[10px] font-black text-slate-900 leading-tight">
                                                {flight.travel_date ? new Date(flight.travel_date as string).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '---'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex-1">
                                            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Retorno</p>
                                            <p className="text-[10px] font-black text-slate-900 leading-tight">
                                                {flight.return_date ? new Date(flight.return_date as string).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'SOLO IDA'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Service Detail Table */}
                         <div className="mb-4">
                            <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1 mb-2">
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">III. Detalle de Servicios Adquiridos</h3>
                            </div>
                            <div className="overflow-hidden border border-slate-200 rounded">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-[7px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                            <th className="py-1.5 px-3 border-r border-slate-200">Descripción del Servicio</th>
                                            <th className="py-1.5 px-3 text-center w-[100px]">Estado</th>
                                            <th className="py-1.5 px-3 text-right w-[100px]">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[9px]">
                                        <tr className="border-b border-slate-100">
                                            <td className="py-1.5 px-3 border-r border-slate-200">
                                                <p className="font-black text-slate-900 uppercase leading-none text-[8px]">Emisión de Boletos Aéreos</p>
                                                <div className="flex gap-2.5 mt-1 text-[7px] text-slate-400 font-bold uppercase">
                                                    <span>Adultos: {flight.pax_adt || 0}</span>
                                                    <span>Niños: {flight.pax_chd || 0}</span>
                                                    <span>Infantes: {flight.pax_inf || 0}</span>
                                                    <span className="text-slate-700 underline underline-offset-2">Total Pax: {flight.pax_total || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                                <span className="bg-slate-900 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Confirmado</span>
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-black text-slate-900">
                                                € {flight.sold_price.toFixed(2)}
                                            </td>
                                        </tr>
                                        {flight.details && Object.entries(flight.details || {}).map(([key, val]) => {
                                            if (!val || !DETAILS_LABELS[key]) return null;
                                            return (
                                                <tr key={key} className="border-b border-slate-100">
                                                    <td className="py-1.5 px-3 border-r border-slate-200">
                                                        <p className="font-bold text-slate-600 uppercase leading-none text-[8px]">
                                                            {DETAILS_LABELS[key]}
                                                            {key === 'doc_agency_managed' && flight.details?.doc_agency_managed_text ? ` ${flight.details.doc_agency_managed_text}` : ''}
                                                        </p>
                                                    </td>
                                                    <td className="py-1.5 px-3 text-center">
                                                        <span className="bg-emerald-100 text-emerald-700 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Incluido</span>
                                                    </td>
                                                    <td className="py-1.5 px-3 text-right text-slate-300 italic">
                                                        --
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        <tr className="bg-linear-to-r from-chimipink to-chimicyan text-slate-950">
                                            <td colSpan={2} className="py-1.5 px-3 text-right font-black uppercase tracking-widest text-[7px]">
                                                Total Neto de Servicios (EUR)
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-black text-xs">
                                                € {flight.sold_price.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Section: Payment History */}
                         <div className="mb-6">
                            <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1 mb-2">
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">IV. Historial de Pagos y Transacciones</h3>
                            </div>
                            <div className="overflow-hidden border border-slate-200 rounded">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-[7px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                                            <th className="py-1.5 px-4 border-r border-slate-200">Fecha</th>
                                            <th className="py-1.5 px-4 border-r border-slate-200">Sede</th>
                                            <th className="py-1.5 px-4 border-r border-slate-200">Método</th>
                                            <th className="py-1.5 px-4 text-right">Monto Original</th>
                                            <th className="py-1.5 px-4 text-right">Equivalente EUR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[9px]">
                                        {(flight.payment_details || []).length > 0 ? (
                                            (flight.payment_details || []).map((p, i) => (
                                                <tr key={i} className="border-b border-slate-100">
                                                    <td className="py-1.5 px-4 border-r border-slate-100 text-slate-500">
                                                        {p.created_at ? new Date(p.created_at as string).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : today}
                                                    </td>
                                                    <td className="py-1.5 px-4 border-r border-slate-100 font-bold uppercase text-slate-700">
                                                        {p.sede_it || p.sede_pe || '---'}
                                                    </td>
                                                    <td className="py-1.5 px-4 border-r border-slate-100 uppercase text-slate-600">
                                                        {p.metodo_it || p.metodo_pe || '---'}
                                                    </td>
                                                    <td className="py-1.5 px-4 text-right border-r border-slate-100 font-mono text-slate-500">
                                                        {p.total || `${p.moneda || 'EUR'} ${p.monto_original || p.cantidad}`}
                                                    </td>
                                                    <td className="py-1.5 px-4 text-right font-black text-slate-900">
                                                        € {parseFloat(p.cantidad).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-4 text-center text-slate-300 italic text-[8px]">No se registran transacciones detalladas</td>
                                            </tr>
                                        )}
                                    <tr className="bg-emerald-50 text-emerald-900 border-t border-emerald-100">
                                            <td colSpan={4} className="py-1.5 px-4 text-right font-black uppercase tracking-widest text-[7px]">Total Abonos Recibidos</td>
                                            <td className="py-1.5 px-4 text-right font-black">€ {flight.on_account.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Section V: Appointments */}
                        {((flight.details?.appointments && flight.details.appointments.length > 0) || 
                          flight.details?.appointment_date || flight.details?.appointment_location) && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1 mb-2">
                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">V. Citas y Trámites Programados</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {/* Legacy Single Appointment */}
                                    {(!flight.details?.appointments || flight.details.appointments.length === 0) && 
                                     (flight.details?.appointment_date || flight.details?.appointment_location) && (
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center text-[9px]">
                                            <div>
                                                <p className="font-black text-slate-900 uppercase leading-none">Cita de Gestión</p>
                                                <p className="text-slate-500 mt-1">
                                                    {flight.details?.appointment_date ? new Date(flight.details.appointment_date + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long' }) : ''}
                                                    {flight.details?.appointment_location ? ` — ${flight.details.appointment_location}` : ''}
                                                </p>
                                                {flight.details?.appointment_note && <p className="text-slate-400 italic mt-0.5">{flight.details.appointment_note}</p>}
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-indigo-100 text-indigo-700 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Programado</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Multiple Appointments */}
                                    {flight.details?.appointments?.map((app, i) => (
                                        <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center text-[9px]">
                                            <div>
                                                <p className="font-black text-slate-900 uppercase leading-none">Cita {i + 1}: {app.location || 'Gestión de Viaje'}</p>
                                                <p className="text-slate-500 mt-1">
                                                    {app.date ? new Date(app.date + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long' }) : 'Fecha por confirmar'}
                                                </p>
                                                {app.note && <p className="text-slate-400 italic mt-0.5">{app.note}</p>}
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-indigo-100 text-indigo-700 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Programado</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section: Payments & Totals */}
                         <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                            {/* Terms */}
                            <div className="md:col-span-7 space-y-2">
                                <div className="bg-amber-50 p-2.5 rounded border border-amber-100">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <AlertCircle size={10} className="text-amber-600" />
                                        <h4 className="text-[7px] font-black uppercase tracking-[0.15em] text-amber-700">Términos y condiciones de la reserva</h4>
                                    </div>
                                    <ul className="space-y-1">
                                        {[
                                            "Los boletos aéreos están sujetos a las regulaciones tarifarias de cada aerolínea.",
                                            "Los servicios opcionales (Hoteles, Seguros) no permiten reembolsos una vez confirmados.",
                                            "El pasajero es responsable de portar sus documentos de identidad y visas vigentes.",
                                            "Chimi Vuelos actúa únicamente como intermediario entre el pasajero y el transportista."
                                        ].map((text, i) => (
                                            <li key={i} className="text-[7.5px] text-amber-700/80 flex gap-1.5 leading-none">
                                                <span className="font-black text-amber-500">•</span>
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
 
                            {/* Final Financials */}
                            <div className="md:col-span-5">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center py-1 px-3 bg-slate-50 rounded border border-slate-100">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Total Servicios</span>
                                        <span className="text-[10px] font-black text-slate-900">€ {flight.sold_price.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 px-3 bg-emerald-50 rounded border border-emerald-100">
                                        <span className="text-[7px] font-black text-emerald-700 uppercase tracking-widest">Total Pagado</span>
                                        <span className="text-[10px] font-black text-emerald-700">€ {flight.on_account.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 px-3 bg-linear-to-r from-chimipink to-chimicyan text-slate-950 rounded shadow-md mt-0.5 border border-chimipink/20">
                                        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Saldo Pendiente</span>
                                        <span className="text-xs font-black leading-none">€ {flight.balance.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Office Information */}
                        <div className="border-t-2 border-slate-900 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Image src="https://flagcdn.com/w40/it.png" width={14} height={10} alt="it" className="rounded-xs shadow-sm" unoptimized />
                                        <h5 className="text-[8px] font-black uppercase tracking-widest text-slate-500">Sede Corsico</h5>
                                    </div>
                                    <p className="text-[8px] text-slate-600 flex items-start gap-1 leading-tight">
                                        <MapPin size={8} className="shrink-0 mt-0.5 text-slate-300" /> Via Molinetto di Lorenteggio, 39/41
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Image src="https://flagcdn.com/w40/it.png" width={14} height={10} alt="it" className="rounded-xs shadow-sm" unoptimized />
                                        <h5 className="text-[8px] font-black uppercase tracking-widest text-slate-500">Sede Roma</h5>
                                    </div>
                                    <p className="text-[8px] text-slate-600 flex items-start gap-1 leading-tight">
                                        <MapPin size={8} className="shrink-0 mt-0.5 text-slate-300" /> via palestro 35
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Image src="https://flagcdn.com/w40/pe.png" width={14} height={10} alt="pe" className="rounded-xs shadow-sm" unoptimized />
                                        <h5 className="text-[8px] font-black uppercase tracking-widest text-slate-500">Sede Lima</h5>
                                    </div>
                                    <p className="text-[8px] text-slate-600 flex items-start gap-1 leading-tight">
                                        <MapPin size={8} className="shrink-0 mt-0.5 text-slate-300" /> Av. Abancay 210, Of. 204
                                    </p>
                                </div>
                                <div className="space-y-1 md:text-right flex flex-col items-center md:items-end">
                                    <h5 className="text-[8px] font-black uppercase tracking-widest text-slate-500">Canal Digital</h5>
                                    <p className="text-[8px] font-black text-slate-900 uppercase">www.chimivuelos.pe</p>
                                </div>
                            </div>

                            {/* Contact Numbers Section */}
                            <div className="bg-slate-50 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 border border-slate-100 mb-6">
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Ventas Lima</p>
                                    <p className="text-[10px] font-black text-slate-900">+51 943 055 999</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Ventas Italia</p>
                                    <p className="text-[10px] font-black text-slate-900">+39 388 800 8194</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Asistencia</p>
                                    <p className="text-[10px] font-black text-slate-900">+39 02 8286 1556</p>
                                </div>
                                <div className="space-y-0.5 md:text-right">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Traducciones y Envíos</p>
                                    <p className="text-[10px] font-black text-slate-900">+39 339 213 8943</p>
                                </div>
                            </div>

                        </div> { /* closes p-4 md:p-8 */ }
                    </div> { /* closes sales-note */ }
                </div> { /* closes sales-note-wrapper */ }
            </div> { /* closes fixed inset-0 */ }
        </div>
    )

    return createPortal(
        <div className="print-portal-root">
            {modalContent}
        </div>,
        document.body
    )
}
