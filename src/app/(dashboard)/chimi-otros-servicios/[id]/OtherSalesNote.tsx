import React from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Printer, X, MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type OtherService, type PaymentDetail } from "@/app/actions/manage-other-services"

interface LuggageOption {
    peso: string;
    tipo: string;
    cantidad: number;
}

export function OtherSalesNote({ service, onClose }: { service: OtherService, onClose: () => void }) {
    const [mounted, setMounted] = React.useState(false)
    
    React.useEffect(() => {
        setMounted(true)
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

    // Luggage logic
    let luggageDetails: LuggageOption[] | null = null
    if (service.service_type === 'Agregar Equipaje' && service.internal_note) {
        try {
            const match = service.internal_note.match(/\[LuggageOptions: (.*?)\]/)
            if (match && match[1]) {
                luggageDetails = JSON.parse(match[1])
            }
        } catch (e) {
            console.error('Error parsing luggage in sales note', e)
        }
    }

    const modalContent = (
        <div className="fixed inset-0 z-99999 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white print:static overflow-y-auto">
             <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 0; size: A4 portrait; }
                    body > *:not(.print-portal-root) { display: none !important; }
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
                    .print-portal-root { width: 100% !important; position: static !important; margin: 0 !important; padding: 0 !important; }
                    #sales-note-wrapper { width: 210mm !important; margin: 0 auto !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
                    #sales-note { width: 210mm !important; padding: 10mm !important; }
                    #sales-note .md\\:flex-row { flex-direction: row !important; }
                    #sales-note .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    #sales-note .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
                    #sales-note .md\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
                    #sales-note .md\\:col-span-7 { grid-column: span 7 / span 7 !important; }
                    #sales-note .md\\:col-span-5 { grid-column: span 5 / span 5 !important; }
                    #sales-note .md\\:text-right { text-align: right !important; }
                    #sales-note .md\\:items-end { align-items: flex-end !important; }
                    #sales-note .flex-col.md\\:flex-row { flex-direction: row !important; }
                    #sales-note .grid-cols-1.md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    #sales-note .p-10 { padding: 1.5rem !important; }
                    #sales-note .p-6 { padding: 1rem !important; }
                    #sales-note .gap-8 { gap: 1rem !important; }
                    #sales-note .mb-8 { margin-bottom: 1.5rem !important; }
                    #sales-note .mb-6 { margin-bottom: 1rem !important; }
                }
            `}} />
            <div id="sales-note-wrapper" className="bg-white w-full max-w-[800px] my-auto rounded-lg shadow-2xl flex flex-col print:shadow-none print:rounded-none">
                {/* Preview Header */}
                <div id="preview-header" className="flex items-center justify-between p-3 border-b bg-white/80 backdrop-blur-md sticky top-0 z-20 print:hidden rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-slate-900 rounded flex items-center justify-center shadow-lg shadow-slate-200">
                             <Search size={14} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Documento Oficial</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Vista Previa Nota de Venta - Servicios Varios</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs">
                            <X size={14} /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handlePrint} className="h-8 gap-2 bg-slate-900 hover:bg-black text-white px-4 font-black shadow-xl shadow-slate-200 transition-all active:scale-95 text-xs">
                            <Printer size={14} /> Confirmar e Imprimir
                        </Button>
                    </div>
                </div>

                {/* Sales Note Content */}
                <div id="sales-note" className="p-0 text-slate-900 print:text-[10pt] font-sans">
                    <div className="bg-linear-to-r from-chimipink to-chimicyan text-slate-950 p-2.5 md:p-3.5 flex flex-col md:flex-row justify-between items-center gap-2">
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 flex items-center justify-center h-10 w-10 text-slate-950">
                                <Image src="/IconChimiVuelos-White.svg" alt="Logo" width={40} height={40} className="h-8 w-auto object-contain brightness-0" unoptimized />
                            </div>
                            <div className="h-6 w-px bg-slate-950/20 hidden md:block" />
                            <div className="text-center md:text-left">
                                <h1 className="text-base font-black tracking-tighter leading-none uppercase text-slate-950">CHIMI VUELOS</h1>
                                <p className="text-[7px] uppercase font-bold text-slate-950/80 tracking-[0.2em] mt-0.5">Gestión de Servicios Integrales</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded border border-slate-950/20 flex flex-col items-center md:items-end min-w-[140px]">
                                <h2 className="text-[7px] font-black text-slate-950/70 uppercase tracking-widest mb-0.5 leading-none">Servicio No.</h2>
                                <p className="text-sm font-black text-slate-950 tracking-widest leading-none uppercase">{service.tracking_code || '---'}</p>
                            </div>
                            <div className="text-right hidden md:block">
                                <p className="text-[7px] font-black text-slate-950/70 uppercase tracking-widest leading-none mb-0.5">Expedido el</p>
                                <p className="text-[9px] font-black text-slate-950 uppercase leading-none">{today}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                             <div className="space-y-1">
                                <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-0.5">
                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">I. Datos del Cliente</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-1 pt-0">
                                    <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Nombre del Titular</p>
                                        <p className="text-[10px] font-black text-slate-900 uppercase">{service.profiles?.first_name} {service.profiles?.last_name}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex-1">
                                            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Documento</p>
                                            <p className="text-[10px] font-black text-slate-900 leading-none">{service.profiles?.document_number || '---'}</p>
                                        </div>
                                        <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex-1">
                                            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Teléfono</p>
                                            <p className="text-[10px] font-black text-slate-900 leading-none">{service.profiles?.phone || '---'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             <div className="space-y-1">
                                <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-0.5">
                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">II. Información del Servicio</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-1 pt-0">
                                    <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Tipo de Gestión</p>
                                        <p className="text-[10px] font-black text-slate-900 uppercase">{service.service_type.toUpperCase()}</p>
                                    </div>
                                    <div className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0">Referencia Externas (PNR / ID)</p>
                                        <p className="text-[10px] font-black text-slate-900 uppercase">{service.flight_pnr || service.connected_flight_id || 'SIN VINCULACIÓN DIRECTA'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="mb-4">
                            <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1 mb-2">
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">III. Detalle de Servicios Realizados</h3>
                            </div>
                            <div className="overflow-hidden border border-slate-200 rounded">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-[7px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                            <th className="py-1.5 px-3 border-r border-slate-200">Descripción Técnica</th>
                                            <th className="py-1.5 px-3 text-right w-[140px]">Inversión (EUR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[9px]">
                                        <tr className="border-b border-slate-100">
                                            <td className="py-2.5 px-3 border-r border-slate-200">
                                                <p className="font-black text-slate-900 uppercase leading-none text-[8px]">{service.service_type.toUpperCase()}</p>
                                                <p className="mt-1 text-[7px] text-slate-500 font-bold uppercase leading-tight">
                                                    {service.note || 'Gestión administrativa general'}
                                                </p>
                                                {luggageDetails && (
                                                    <div className="mt-2 grid grid-cols-1 gap-1 border-t border-slate-50 pt-1">
                                                        {luggageDetails.map((opt: LuggageOption, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center text-[7px] bg-slate-50 px-2 py-0.5 rounded">
                                                                <span className="font-black text-slate-600">{opt.peso} {opt.tipo}</span>
                                                                <span className="font-bold text-slate-400">Ctd: {opt.cantidad}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                                € {service.total_amount.toFixed(2)}
                                            </td>
                                        </tr>
                                        <tr className="bg-linear-to-r from-chimipink to-chimicyan text-slate-950">
                                            <td className="py-1.5 px-3 text-right font-black uppercase tracking-widest text-[7px]">
                                                Total Liquidación de Servicio
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-black text-xs">
                                                € {service.total_amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                         <div className="mb-6">
                            <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1 mb-2">
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-900">IV. Control de Recaudación y Abonos</h3>
                            </div>
                            <div className="overflow-hidden border border-slate-200 rounded">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-[7px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                                            <th className="py-1.5 px-4 border-r border-slate-200">Fecha Operación</th>
                                            <th className="py-1.5 px-4 border-r border-slate-200">Punto de Cobro</th>
                                            <th className="py-1.5 px-4 border-r border-slate-200">Canal</th>
                                            <th className="py-1.5 px-4 text-right">Confirmado (EUR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[9px]">
                                        {(service.payment_details || []).length > 0 ? (
                                            (service.payment_details || []).map((p: PaymentDetail, i: number) => (
                                                <tr key={i} className="border-b border-slate-100">
                                                    <td className="py-1.5 px-4 border-r border-slate-100 text-slate-500 font-medium">
                                                        {p.created_at ? new Date(p.created_at as string).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : today}
                                                    </td>
                                                    <td className="py-1.5 px-4 border-r border-slate-100 font-bold uppercase text-slate-700">
                                                        {p.sede_it || p.sede_pe || 'VIRTUAL'}
                                                    </td>
                                                    <td className="py-1.5 px-4 border-r border-slate-100 uppercase text-slate-600 font-medium tracking-tighter">
                                                        {p.metodo_it || p.metodo_pe || 'TRANSFERENCIA'}
                                                    </td>
                                                    <td className="py-1.5 px-4 text-right font-black text-slate-900 bg-slate-50/20">
                                                        € {parseFloat(p.cantidad).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-4 text-center text-slate-300 italic text-[8px]">No se reportan abonos en sistema</td>
                                            </tr>
                                        )}
                                        <tr className="bg-emerald-50 text-emerald-900 border-t border-emerald-100">
                                            <td colSpan={3} className="py-1.5 px-4 text-right font-black uppercase tracking-widest text-[7px]">Total Amortizado a la Fecha</td>
                                            <td className="py-1.5 px-4 text-right font-black">€ {service.on_account.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                            <div className="md:col-span-12">
                                <div className="space-y-1.5 w-full md:w-[320px] ml-auto">
                                    <div className="flex justify-between items-center py-1 px-3 bg-slate-50 rounded border border-slate-100">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Inversión Final de Servicio</span>
                                        <span className="text-[10px] font-black text-slate-900">€ {service.total_amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 px-3 bg-linear-to-r from-chimipink to-chimicyan text-slate-950 rounded shadow-md mt-0.5 border border-chimipink/20 transform transition-transform hover:scale-[1.02]">
                                        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Saldo Pendiente (EUR)</span>
                                        <span className="text-xs font-black leading-none">€ {service.balance.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="border-t-2 border-slate-900 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-[8px] text-slate-600">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <h5 className="font-black uppercase tracking-widest text-slate-500">Sede Corsico</h5>
                                    </div>
                                    <p className="flex items-start gap-1 leading-tight"><MapPin size={8} className="shrink-0 mt-0.5 text-slate-300" /> Via Molinetto di Lorenteggio, 39/41</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <h5 className="font-black uppercase tracking-widest text-slate-500">Sede Roma</h5>
                                    </div>
                                    <p className="flex items-start gap-1 leading-tight"><MapPin size={8} className="shrink-0 mt-0.5 text-slate-300" /> via palestro 35</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <h5 className="font-black uppercase tracking-widest text-slate-500">Sede Lima</h5>
                                    </div>
                                    <p className="flex items-start gap-1 leading-tight"><MapPin size={8} className="shrink-0 mt-0.5 text-slate-300" /> Av. Abancay 210, Of. 204</p>
                                </div>
                                <div className="md:text-right flex flex-col items-center md:items-end">
                                    <h5 className="font-black uppercase tracking-widest text-slate-500">Canal Digital</h5>
                                    <p className="font-black text-slate-900 uppercase tracking-tighter">www.chimi-peru.com</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 border border-slate-100 mb-6">
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Envíos Lima</p>
                                    <p className="text-[10px] font-black text-slate-900">+51 943 055 999</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Envíos Italia</p>
                                    <p className="text-[10px] font-black text-slate-900">+39 388 800 8194</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Asistencia</p>
                                    <p className="text-[10px] font-black text-slate-900">+39 02 8286 1556</p>
                                </div>
                                <div className="space-y-0.5 md:text-right">
                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Gestión General</p>
                                    <p className="text-[10px] font-black text-slate-900">+39 339 213 8943</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(<div className="print-portal-root">{modalContent}</div>, document.body)
}
