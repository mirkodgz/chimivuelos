"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { 
    ChevronLeft, 
    Download,
    AlertCircle,
    Receipt
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OperationalFileTitle } from "@/components/OperationalFileTitle"
import { 
    getExpenseFullDetails, 
    getExpenseDocumentUrl,
    type CorporateExpense 
} from "@/app/actions/manage-expenses"

export default function ExpenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [expense, setExpense] = useState<CorporateExpense | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getExpenseFullDetails(id).then(res => {
            if (res.success && res.expense) {
                setExpense(res.expense)
            } else {
                setError(res.error || 'Gasto no encontrado')
            }
            setLoading(false)
        })
    }, [id])

    const handleDownload = async (path: string) => {
        const result = await getExpenseDocumentUrl(path)
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

    if (!expense) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">{error || 'Gasto no encontrado'}</h3>
                <Link href="/chimi-gastos">
                    <Button variant="outline" className="mt-4 text-chimipink border-chimipink">Volver a gastos</Button>
                </Link>
            </div>
        )
    }

    const getServiceLink = (service: string, recordId: string) => {
        if (!recordId || service === 'Ninguno') return null
        switch (service) {
            case 'Vuelo': return `/chimi-vuelos/${recordId}`
            case 'Giro': return `/chimi-giros/${recordId}`
            case 'Encomienda': return `/chimi-encomiendas/${recordId}`
            case 'Traducción': return `/chimi-traducciones/${recordId}`
            case 'Otro Servicio': return `/chimi-otros-servicios/${recordId}`
            default: return null
        }
    }

    const serviceLink = getServiceLink(expense.connected_service || 'Ninguno', expense.connected_record_id || '')

    return (
        <div className="max-w-7xl mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-500">
            
            {/* Top Navigation */}
            <Link href="/chimi-gastos">
                <Button variant="ghost" className="gap-2 text-slate-400 hover:text-slate-800 px-0 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Listado de Gastos
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
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ID de Registro</span>
                                </div>
                                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{expense.id.slice(0, 8).toUpperCase()}</h1>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-right md:text-left">Agente Responsable</span>
                                <div className="flex items-center gap-3 justify-end md:justify-start">
                                    <span className="text-lg font-semibold text-slate-800">
                                        {expense.agent?.first_name} {expense.agent?.last_name}
                                    </span>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        
                        {/* Main Body Column */}
                        <div className="lg:col-span-8 p-6 md:p-8 space-y-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                            
                            {/* 1. Classification & Connection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Classification Info */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Clasificación del Gasto</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Categoría</span>
                                            <p className="text-base font-bold text-chimipink uppercase">
                                                {expense.category.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Motivo / Sub-categoría</span>
                                            <p className="text-lg font-bold text-slate-800 uppercase leading-tight">
                                                {expense.sub_category || '---'}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Fecha del Gasto</span>
                                            <p className="text-base font-bold text-slate-700">
                                                {new Date(expense.expense_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Connection Info */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Vinculación Operativa</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Servicio Relacionado</span>
                                            {serviceLink ? (
                                                <Link href={serviceLink}>
                                                    <div className="flex flex-col p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-all cursor-pointer active:scale-[0.98] shadow-sm">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{expense.connected_service}</p>
                                                        <p className="text-sm font-black text-slate-800">{expense.reference_number || 'Ver detalle'}</p>
                                                    </div>
                                                </Link>
                                            ) : (
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                                                    <span className="text-xs font-medium text-slate-400">Gasto libre (sin vinculación específica)</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 focus:bg-slate-50 p-1 rounded-lg transition-colors">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Proveedor / Beneficiario</span>
                                            <p className="text-lg font-bold text-slate-800 leading-tight uppercase">{expense.provider_name || '---'}</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="pt-4 border-t border-slate-50" />

                            {/* 2. Description & Internal Notes */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Descripción y Detalles</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative">
                                        <span className="text-[9px] uppercase font-black text-slate-400 absolute -top-2 left-6 bg-white px-2 border border-slate-100 rounded-full">Descripción del Egreso</span>
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed italic border-l-2 border-chimipink pl-4">
                                            {expense.description || 'Sin descripción detallada.'}
                                        </p>
                                    </div>

                                    {expense.notes && (
                                        <div className="p-6 bg-amber-50/30 rounded-2xl border border-amber-100/50 relative">
                                            <span className="text-[9px] uppercase font-black text-amber-400 absolute -top-2 left-6 bg-white px-2 border border-amber-100 rounded-full">Notas Administrativas</span>
                                            <p className="text-[13px] font-medium text-slate-600 leading-relaxed italic">
                                                {expense.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 3. Recipient Agent (If applicable) */}
                            {expense.recipient_agent && (
                                <>
                                    <div className="pt-4 border-t border-slate-50" />
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Personal Beneficiario</h3>
                                        </div>
                                        <div className="flex items-center gap-4 p-5 bg-pink-50/30 rounded-2xl border border-pink-100/50 w-fit">
                                            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-chimipink font-black text-lg shadow-sm border border-pink-100">
                                                {expense.recipient_agent.first_name[0]}{expense.recipient_agent.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Pago Realizado a:</p>
                                                <p className="text-lg font-bold text-slate-800 uppercase leading-none mt-1">
                                                    {expense.recipient_agent.first_name} {expense.recipient_agent.last_name}
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>

                        {/* Sidebar Column */}
                        <div className="lg:col-span-4 bg-slate-50/30 p-6 md:p-8 space-y-10">
                            
                            {/* Financial Record */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Registro de Pago</h3>
                                </div>
                                <Card className="border-none shadow-lg shadow-slate-200/50 bg-white p-6 rounded-3xl space-y-6">
                                    {/* Detalle Financiero Estructurado */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Moneda / Cantidad</span>
                                                <p className="text-xs font-bold text-slate-800">
                                                    {expense.currency} {expense.original_amount.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">T. Cambio</span>
                                                <p className="text-xs font-bold text-slate-800">
                                                    {expense.exchange_rate.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/30 text-center">
                                            <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest block mb-1">Equivalente en Euros (€)</span>
                                            <p className="text-2xl font-black text-emerald-600">€ {expense.amount_eur.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 pt-2 border-t border-slate-50">
                                        <div className="flex justify-between items-center group">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Sedes</span>
                                            <span className="text-[11px] font-bold text-slate-700 uppercase">{expense.sede_it || expense.sede_pe || 'Universal'}</span>
                                        </div>
                                        <div className="flex justify-between items-center group">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Método de Pago</span>
                                            <span className="text-[11px] font-bold text-slate-700 uppercase italic">{expense.metodo_it || expense.metodo_pe || 'Efectivo'}</span>
                                        </div>
                                    </div>
                                </Card>
                            </section>

                            {/* Comprobante Principal */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Comprobante Foto</h3>
                                </div>
                                {expense.proof_path ? (
                                    <div className="group relative rounded-3xl overflow-hidden border border-slate-100 shadow-md aspect-square bg-slate-100">
                                        <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:scale-110 transition-transform">
                                            <Receipt size={80} className="text-slate-300" />
                                        </div>
                                        <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent flex flex-col justify-end p-6">
                                            <Button 
                                                variant="secondary"
                                                onClick={() => handleDownload(expense.proof_path!)}
                                                className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold gap-2 rounded-xl h-12 shadow-lg"
                                            >
                                                <Download size={18} /> Ver Comprobante
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <p className="text-xs text-slate-400 font-medium italic">Sin foto de comprobante registrada.</p>
                                    </div>
                                )}
                            </section>

                            {/* Attachments */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Archivos / Anexos</h3>
                                </div>
                                <div className="space-y-3">
                                    {expense.additional_files && expense.additional_files.length > 0 ? (
                                        expense.additional_files.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-chimicyan/50 transition-colors group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-400 font-bold text-[10px]">
                                                        DOC
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{doc.title || doc.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-black tracking-tighter uppercase shrink-0">{(doc.size / 1024).toFixed(0)} KB</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 rounded-full hover:bg-chimicyan/10 text-slate-400 hover:text-chimicyan"
                                                    onClick={() => handleDownload(doc.path)}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-300 italic text-center py-4 uppercase font-bold tracking-widest">Sin otros anexos</p>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
