import Link from "next/link"
import { cn } from "@/lib/utils"

interface LinkedResourceCardProps {
    href: string
    title: string
    subtitle: string
    variant?: "sky" | "pink"
}

export function LinkedResourceCard({ href, title, subtitle, variant = "sky" }: LinkedResourceCardProps) {
    const variants = {
        sky: {
            bg: "bg-sky-50/50",
            border: "border-sky-100/50",
            text: "text-sky-600/70"
        },
        pink: {
            bg: "bg-chimipink/5",
            border: "border-pink-100/50",
            text: "text-chimipink"
        }
    }

    const current = variants[variant]

    return (
        <Link href={href}>
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer active:scale-95 shadow-sm",
                current.bg,
                current.border
            )}>
                <div>
                    <p className={cn(
                        "text-[10px] font-black uppercase tracking-tighter leading-none mb-1",
                        current.text
                    )}>
                        {title}
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                        {subtitle}
                    </p>
                </div>
            </div>
        </Link>
    )
}
