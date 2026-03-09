"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { 
    ChevronLeft, 
    FileText, 
    CreditCard,
    Info,
    Wallet,
    Download,
    AlertCircle,
    UserCircle,
    Hash,
    User,
    ArrowRightLeft,
    NotebookPen,
    Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusHistory } from "@/components/StatusHistory"
import { OperationalFileTitle } from "@/components/OperationalFileTitle"
import { 
    getTransferFullDetails, 
    getTransferDocumentUrl,
    type TransferDocument,
    type PaymentDetail,
    type MoneyTransfer
} from "@/app/actions/manage-transfers"
import { cn } from "@/lib/utils"
import { GiroSalesNote } from "./GiroSalesNote"

export default function TransferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [transfer, setTransfer] = useState<MoneyTransfer | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showSalesNote, setShowSalesNote] = useState(false)

    useEffect(() => {
        getTransferFullDetails(id).then(res => {
            if (res.success) {
                setTransfer(res.transfer)
            } else {
                setError(res.error || 'Giro no encontrado')
            }
            setLoading(false)
        })
    }, [id])

    const handleDownload = async (path: string, storage: 'r2' | 'images' = 'r2') => {
        const result = await getTransferDocumentUrl(path, storage)
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

    if (!transfer) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">{error || 'Giro no encontrado'}</h3>
                <Link href="/chimi-giros">
                    <Button variant="outline" className="mt-4 text-chimipink border-chimipink">Volver a giros</Button>
                </Link>
            </div>
        )
    }

    const getStatusLabel = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'pending' || s === 'pendiente') return 'Pendiente'
        if (s === 'in_process' || s === 'processing' || s === 'proceso') return 'En Proceso'
        if (s === 'completed' || s === 'finalizado') return 'Completado'
        if (s === 'delivered' || s === 'entregado' || s === 'transit') return 'Entregado'
        if (s === 'cancelled' || s === 'cancelado') return 'Cancelado'
        return status.toUpperCase()
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'delivered': return 'bg-emerald-500 text-white'
            case 'cancelled': return 'bg-rose-500 text-white'
            case 'processing': return 'bg-blue-500 text-white'
            case 'scheduled': return 'bg-amber-500 text-white'
            case 'available': return 'bg-sky-500 text-white'
            default: return 'bg-slate-500 text-white'
        }
    }

    const getModeLabel = (mode: string) => {
        switch (mode) {
            case 'eur_to_pen': return 'Euro → Soles'
            case 'pen_to_eur': return 'Soles → Euro'
            case 'eur_to_eur': return 'Euro → Euro'
            default: return mode
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-500">
            
            {/* Top Navigation */}
            <Link href="/chimi-giros">
                <Button variant="ghost" className="gap-2 text-slate-400 hover:text-slate-800 px-0 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Listado de Giros
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
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Código de Giro</span>
                                    <Badge className={cn("text-[9px] uppercase font-bold py-0 h-5", getStatusColor(transfer.status))}>
                                        {getStatusLabel(transfer.status)}
                                    </Badge>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{transfer.transfer_code || '---'}</h1>
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
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Cliente Remitente</span>
                                <div className="flex items-center gap-3">
                                    <Link href={`/clients/${transfer.client_id}`} className="text-lg font-semibold text-slate-800 hover:text-chimipink hover:underline transition-all">
                                        {transfer.profiles?.first_name} {transfer.profiles?.last_name}
                                    </Link>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{transfer.profiles?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        
                        {/* Main Body Column */}
                        <div className="lg:col-span-8 p-6 md:p-8 space-y-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                            
                            {/* 1. Transfer Information */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Información de la Operación</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                    <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Modalidad</span>
                                        <p className="text-lg font-bold text-slate-700 leading-tight">{getModeLabel(transfer.transfer_mode)}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Fecha de Registro</span>
                                        <p className="text-lg font-medium text-slate-700 leading-tight">
                                             {new Date(transfer.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Monto Enviado</span>
                                        <p className="text-xl font-black text-slate-800 flex items-center gap-2">
                                            {transfer.transfer_mode === 'pen_to_eur' ? 'S/' : '€'} {transfer.amount_sent.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Comisión Agencia</span>
                                        <p className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                                            {transfer.transfer_mode === 'pen_to_eur' ? 'S/' : '€'} {transfer.commission.toFixed(2)}
                                            {transfer.commission_percentage > 0 && <span className="text-xs font-medium text-slate-400">({transfer.commission_percentage}%)</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Summary Bar */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-5 rounded-[1.5rem] border border-slate-100/50">
                                    <div className="text-center group">
                                        <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">CANTIDAD A RECIBIR</span>
                                        <span className="text-2xl font-black text-slate-800 group-hover:text-chimipink transition-colors">
                                            {transfer.transfer_mode === 'eur_to_pen' ? 'S/' : '€'} {transfer.amount_received.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="text-center border-l border-slate-200">
                                        <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">TASA DE CAMBIO</span>
                                        <span className="text-2xl font-bold text-slate-600 italic">1.00 = {transfer.exchange_rate.toFixed(4)}</span>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 2. Beneficiary Details */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <UserCircle className="h-5 w-5 text-chimipink" />
                                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Datos del Beneficiario</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Nombre del Beneficiario</span>
                                        <p className="text-lg font-bold text-slate-800 leading-tight">{transfer.beneficiary_name}</p>
                                    </div>
                                    <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Documento / ID</span>
                                        <p className="text-base font-medium text-slate-700 leading-tight">{transfer.beneficiary_document || '---'}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Método de Cobro</span>
                                        <p className="text-base font-bold text-slate-700 leading-tight capitalize">{transfer.beneficiary_payment_method?.replace('_', ' ') || 'No especificado'}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Entidad / Banco</span>
                                        <p className="text-base font-bold text-chimiteal leading-tight uppercase">{transfer.beneficiary_bank || '---'}</p>
                                    </div>
                                    <div className="col-span-full space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Número de Cuenta / Referencia</span>
                                        <p className="text-lg font-mono font-bold text-slate-800 break-all">{transfer.beneficiary_account || '---'}</p>
                                        {transfer.beneficiary_pickup_sede && (
                                            <p className="text-xs font-medium text-slate-500 mt-2">Sede de recojo: <span className="font-bold text-slate-700 uppercase">{transfer.beneficiary_pickup_sede}</span></p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 3. Financial History (Payments & Expenses) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Payments History */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-4 w-4 text-emerald-500" />
                                        <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-widest">Abonos Recibidos</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {transfer.payment_details && transfer.payment_details.length > 0 ? (
                                            transfer.payment_details.map((payment: PaymentDetail, idx: number) => (
                                                <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-xs relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50 pb-2 mb-2">
                                                        <span>Pago #{idx + 1}</span>
                                                        <span>{payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/D'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-slate-700 truncate">{payment.metodo_it || payment.metodo_pe || '---'}</p>
                                                            <p className="text-[9px] text-slate-400 italic">Sede: {payment.sede_it || payment.sede_pe || 'Universal'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-emerald-600 leading-none">€ {parseFloat(payment.cantidad).toFixed(2)}</p>
                                                            <p className="text-[9px] text-slate-400 font-medium mt-1">{payment.moneda} {parseFloat(payment.monto_original || payment.cantidad).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                    {payment.proof_path && (
                                                        <button 
                                                            onClick={() => handleDownload(payment.proof_path!, payment.proof_path!.startsWith('clients/') ? 'r2' : 'images')}
                                                            className="mt-3 w-full h-7 text-[9px] font-black text-chimiteal bg-teal-50/50 hover:bg-teal-50 rounded-lg flex items-center justify-center gap-2 border border-teal-100/30 tracking-widest"
                                                        >
                                                            <Download className="h-2.5 w-2.5" /> COMPROBANTE
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic py-4">No hay abonos registrados.</p>
                                        )}
                                    </div>
                                </section>

                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <div className="lg:col-span-4 bg-slate-50/30 p-6 md:p-8 space-y-12">
                            
                            {/* Status History (Audit Logs) */}
                            <StatusHistory 
                                resourceId={transfer.id} 
                                resourceType="money_transfers"
                                statusLabels={{
                                    scheduled: 'Programado',
                                    processing: 'Procesando',
                                    available: 'Para Recojo',
                                    delivered: 'Entregado',
                                    completed: 'Completado',
                                    cancelled: 'Cancelado'
                                }}
                            />

                            {/* Operational Data */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <Info className="h-4 w-4 text-chimicyan" />
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Datos Operativos</h3>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Agente Responsable</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <User className="h-3 w-3 text-slate-400" />
                                            {transfer.agent ? `${transfer.agent.first_name} ${transfer.agent.last_name}` : 'Admin'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">ID Registro</span>
                                        <p className="text-[10px] font-mono font-medium text-slate-400">{transfer.id}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Financial Summary */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <Wallet className="h-4 w-4 text-chimipink" />
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Resumen Financiero</h3>
                                </div>
                                <Card className="border-none shadow-none bg-white/50 p-5 rounded-2xl space-y-4">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Total en Giros (€)</span>
                                        <span className="font-bold text-slate-800">€ {transfer.total_amount_eur.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs pt-1">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Comisión Bruta</span>
                                        <span className="font-bold text-emerald-600">€ {transfer.commission.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Gastos Totales</span>
                                        <span className="font-medium text-rose-500">€ {(transfer.total_expenses || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between">
                                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Comisión Neta (Profit)</span>
                                        <span className="text-sm font-black text-emerald-700">€ {(transfer.net_profit ?? transfer.commission).toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Total Abonado</span>
                                        <span className="font-bold text-emerald-600">€ {transfer.on_account.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium uppercase tracking-tighter">Saldo Pendiente</span>
                                        <span className={cn("font-bold", transfer.balance > 0 ? "text-rose-500" : "text-emerald-600")}>
                                            € {transfer.balance.toFixed(2)}
                                        </span>
                                    </div>
                                </Card>
                            </section>

                            {/* Attachments */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <Hash className="h-4 w-4 text-chimicyan" />
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Archivos / Soportes</h3>
                                </div>
                                <div className="space-y-3">
                                    {transfer.documents && transfer.documents.length > 0 ? (
                                        transfer.documents.map((doc: TransferDocument, i: number) => (
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

                            {/* Observations */}
                            {(transfer.client_note || transfer.internal_note) && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                        <NotebookPen className="h-4 w-4 text-amber-500" />
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Observaciones</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {transfer.client_note && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nota Cliente</span>
                                                <p className="text-xs text-slate-600 bg-white p-4 rounded-2xl border border-slate-100 leading-relaxed">{transfer.client_note}</p>
                                            </div>
                                        )}
                                        {transfer.internal_note && (
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black uppercase text-chimipink tracking-wider">Nota Interna</span>
                                                <p className="text-[11px] text-slate-600 bg-pink-50/40 p-4 rounded-2xl border border-pink-100/30 italic leading-relaxed">{transfer.internal_note}</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {showSalesNote && transfer && (
                <GiroSalesNote transfer={transfer} onClose={() => setShowSalesNote(false)} />
            )}
        </div>
    )
}
