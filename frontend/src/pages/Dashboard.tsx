import { useEffect, useState } from 'react'
import {
    Plane,
    FileText,
    UserPlus,
    BookOpen,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    getResumoFinanceiro,
    getPeriodoData,
    getDespesas,
    getMovimentacoes,
    getTitulosVencer,
    type ResumoFinanceiro,
    type PeriodoData,
    type DespesaCategoria,
    type Movimentacao,
    type TituloVencer,
} from '@/services/dashboardService'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })

const fmtDateLong = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
    })

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function makeSmoothPath(pts: [number, number][]): string {
    if (pts.length === 0) return ''
    let d = `M ${pts[0][0]},${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
        const cpX = (pts[i - 1][0] + pts[i][0]) / 2
        d += ` C ${cpX},${pts[i - 1][1]} ${cpX},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`
    }
    return d
}

function makeAreaPath(pts: [number, number][], baseY: number): string {
    const line = makeSmoothPath(pts)
    if (!line) return ''
    return `${line} L ${pts[pts.length - 1][0]},${baseY} L ${pts[0][0]},${baseY} Z`
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function AreaChart({ data }: { data: PeriodoData[] }) {
    const W = 380
    const H = 148
    const P = { t: 10, r: 10, b: 36, l: 10 }
    const cw = W - P.l - P.r
    const ch = H - P.t - P.b
    const maxV = Math.max(...data.map(d => Math.max(d.entradas, d.saidas)), 1)
    const px = (i: number) => P.l + (i / (data.length - 1)) * cw
    const py = (v: number) => P.t + ch - (v / maxV) * ch
    const entPts = data.map<[number, number]>((d, i) => [px(i), py(d.entradas)])
    const saiPts = data.map<[number, number]>((d, i) => [px(i), py(d.saidas)])
    const baseY = P.t + ch

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="ag-ent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="ag-sai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.01" />
                </linearGradient>
            </defs>

            {/* Horizontal guide lines */}
            {[0.25, 0.5, 0.75, 1].map(f => (
                <line
                    key={f}
                    x1={P.l}
                    x2={W - P.r}
                    y1={P.t + ch * (1 - f)}
                    y2={P.t + ch * (1 - f)}
                    stroke="#E5E7EB"
                    strokeWidth="0.5"
                    strokeDasharray="4 3"
                />
            ))}

            {/* Area fills */}
            <path d={makeAreaPath(saiPts, baseY)} fill="url(#ag-sai)" />
            <path d={makeAreaPath(entPts, baseY)} fill="url(#ag-ent)" />

            {/* Lines */}
            <path d={makeSmoothPath(saiPts)} fill="none" stroke="#F43F5E" strokeWidth="1.5" strokeOpacity="0.7" />
            <path d={makeSmoothPath(entPts)} fill="none" stroke="#6366F1" strokeWidth="2" />

            {/* Dots on last point */}
            <circle cx={entPts[entPts.length - 1][0]} cy={entPts[entPts.length - 1][1]} r={3.5} fill="#6366F1" />
            <circle cx={saiPts[saiPts.length - 1][0]} cy={saiPts[saiPts.length - 1][1]} r={3} fill="#F43F5E" fillOpacity="0.7" />

            {/* X-axis labels */}
            {data.map((item, i) => (
                <text
                    key={item.periodo}
                    x={px(i)}
                    y={H - 18}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#9CA3AF"
                >
                    {item.periodo}
                </text>
            ))}

            {/* Legend */}
            <circle cx={P.l} cy={H - 5} r={3} fill="#6366F1" />
            <text x={P.l + 7} y={H - 1} fontSize={8} fill="#6B7280">Entradas</text>
            <circle cx={P.l + 56} cy={H - 5} r={3} fill="#F43F5E" fillOpacity="0.8" />
            <text x={P.l + 63} y={H - 1} fontSize={8} fill="#6B7280">Saídas</text>
        </svg>
    )
}

function BarChart({ data }: { data: DespesaCategoria[] }) {
    const W = 380
    const H = 148
    const P = { t: 10, r: 10, b: 36, l: 10 }
    const cw = W - P.l - P.r
    const ch = H - P.t - P.b
    const maxV = Math.max(...data.map(d => d.valor), 1)
    const slotW = cw / data.length
    const gap = 6

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="bg-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A5B4FC" />
                    <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
            </defs>

            {/* Horizontal guide lines */}
            {[0.25, 0.5, 0.75, 1].map(f => (
                <line
                    key={f}
                    x1={P.l}
                    x2={W - P.r}
                    y1={P.t + ch * (1 - f)}
                    y2={P.t + ch * (1 - f)}
                    stroke="#E5E7EB"
                    strokeWidth="0.5"
                    strokeDasharray="4 3"
                />
            ))}

            {data.map((item, i) => {
                const barH = (item.valor / maxV) * ch
                const x = P.l + i * slotW + gap / 2
                const y = P.t + ch - barH
                const labelX = x + (slotW - gap) / 2
                return (
                    <g key={item.categoria}>
                        <rect x={x} y={y} width={slotW - gap} height={barH} rx={3} fill="url(#bg-bar)" />
                        <text x={labelX} y={H - 18} textAnchor="middle" fontSize={8} fill="#9CA3AF">
                            {item.categoria}
                        </text>
                    </g>
                )
            })}

            <text x={W - P.r} y={H - 5} textAnchor="end" fontSize={7.5} fill="#9CA3AF">
                Mês
            </text>
        </svg>
    )
}

// ─── Quick access ─────────────────────────────────────────────────────────────

interface QuickLinkItem {
    label: string
    to: string
    icon: typeof Plane
    iconBg: string
    iconColor: string
}

const QUICK_LINKS: QuickLinkItem[] = [
    {
        label: 'Registrar voo',
        to: '/voos',
        icon: Plane,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
        label: 'Títulos a Pagar',
        to: '/titulos-a-pagar',
        icon: FileText,
        iconBg: 'bg-rose-100 dark:bg-rose-900/30',
        iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
        label: 'Títulos a Receber',
        to: '/titulos-a-receber',
        icon: BookOpen,
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        label: 'Cadastrar usuário',
        to: '/usuarios',
        icon: UserPlus,
        iconBg: 'bg-violet-100 dark:bg-violet-900/30',
        iconColor: 'text-violet-600 dark:text-violet-400',
    },
]

function QuickCard({ label, to, icon: Icon, iconBg, iconColor }: QuickLinkItem) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:shadow-sm hover:border-border/80 transition-all group"
        >
            <div className={cn('rounded-lg p-2 shrink-0', iconBg)}>
                <Icon className={cn('h-4 w-4', iconColor)} />
            </div>
            <span className="flex-1">{label}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
    )
}

// ─── Financial card ───────────────────────────────────────────────────────────

interface FinCardProps {
    label: string
    value: number
    loading: boolean
    icon: typeof TrendingDown
    iconBg: string
    iconColor: string
    trend?: { value: number; up: boolean }
}

function FinCard({
    label,
    value,
    loading,
    icon: Icon,
    iconBg,
    iconColor,
    trend,
}: FinCardProps) {
    return (
        <Card>
            <CardContent className="px-3 py-3 sm:px-5 sm:py-4">
                {loading ? (
                    <>
                        <Skeleton className="h-4 w-3/4 mb-3" />
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-3 w-1/2 mt-2" />
                    </>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                            <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{label}</p>
                            <div className={cn('rounded-lg p-1.5 sm:p-2 shrink-0', iconBg)}>
                                <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', iconColor)} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold tracking-tight">{fmt(value)}</p>
                        {trend && (
                            <p
                                className={cn(
                                    'flex items-center gap-1 text-xs mt-1.5',
                                    trend.up ? 'text-emerald-600' : 'text-rose-500',
                                )}
                            >
                                {trend.up ? (
                                    <TrendingUp className="h-3 w-3" />
                                ) : (
                                    <TrendingDown className="h-3 w-3" />
                                )}
                                {trend.value}% vs mês anterior
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Movimentação row ─────────────────────────────────────────────────────────

function MovRow({ mov }: { mov: Movimentacao }) {
    const isEntrada = mov.tipo === 'entrada'
    return (
        <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3">
                <span
                    className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium mb-1',
                        isEntrada
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                    )}
                >
                    {isEntrada ? 'Entrada' : 'Saída'}
                </span>
                <p className="text-xs text-muted-foreground">{mov.pessoa}</p>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px]">
                <p className="truncate">{mov.descricao}</p>
            </td>
            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                <span className={
                    isEntrada
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                }>
                    {isEntrada ? '+' : '−'}{fmt(mov.valor)}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                {fmtDate(mov.data)}
            </td>
        </tr>
    )
}

// ─── Título a vencer card ─────────────────────────────────────────────────────

function TituloCard({ titulo }: { titulo: TituloVencer }) {
    const isPagar = titulo.tipo === 'pagar'
    return (
        <div
            className={cn(
                'rounded-xl border bg-card px-4 py-3 border-l-[3px]',
                isPagar
                    ? 'border-border border-l-rose-400'
                    : 'border-border border-l-emerald-400',
            )}
        >
            <span
                className={cn(
                    'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium mb-1.5',
                    isPagar
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                )}
            >
                {isPagar ? 'A pagar' : 'A receber'}
            </span>
            <p className="text-xs text-muted-foreground mb-0.5">{titulo.descricao}</p>
            <p className="text-xl font-bold">{fmt(titulo.valor)}</p>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
    const [periodos, setPeriodos] = useState<PeriodoData[]>([])
    const [despesas, setDespesas] = useState<DespesaCategoria[]>([])
    const [movs, setMovs] = useState<Movimentacao[]>([])
    const [titulos, setTitulos] = useState<TituloVencer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            getResumoFinanceiro(),
            getPeriodoData(),
            getDespesas(),
            getMovimentacoes(),
            getTitulosVencer(),
        ]).then(([r, p, d, m, t]) => {
            setResumo(r)
            setPeriodos(p)
            setDespesas(d)
            setMovs(m)
            setTitulos(t)
            setLoading(false)
        })
    }, [])

    const titulosGrouped = titulos.reduce<Record<string, TituloVencer[]>>((acc, t) => {
        if (!acc[t.data]) acc[t.data] = []
        acc[t.data].push(t)
        return acc
    }, {})
    const titulosDates = Object.keys(titulosGrouped).sort()

    return (
        <div className="pt-2 space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Acompanhe as operações e finanças do aeroclube em um só lugar.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-10">

                {/* ── LEFT ──────────────────────────────────────────────────────────── */}
                <div className="space-y-6 min-w-0 h-fit">

                    {/* Acessos rápidos */}
                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Acessos rápidos</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {QUICK_LINKS.map(l => (
                                <QuickCard key={l.label} {...l} />
                            ))}
                        </div>
                    </section>

                    {/* Resumo Financeiro */}
                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Resumo Financeiro</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FinCard
                                label="Títulos a Pagar em Aberto"
                                value={resumo?.titulosPagar ?? 0}
                                loading={loading}
                                icon={TrendingDown}
                                iconBg="bg-chart-5/10 dark:bg-chart-5/20"
                                iconColor="text-chart-5"
                            />
                            <FinCard
                                label="Títulos a Receber em Aberto"
                                value={resumo?.titulosReceber ?? 0}
                                loading={loading}
                                icon={TrendingUp}
                                iconBg="bg-chart-2/10 dark:bg-chart-2/20"
                                iconColor="text-chart-2"
                            />
                        </div>
                    </section>

                    {/* Últimas movimentações */}
                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                            Últimas movimentações
                        </p>
                        <Card>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-4 space-y-3">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <Skeleton key={i} className="h-14 w-full" />
                                        ))}
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/30">
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                                    Título
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                                    Descrição
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                                                    Valor
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                                                    Data
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movs.map(m => (
                                                <MovRow key={m.id} mov={m} />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>

                {/* ── RIGHT ─────────────────────────────────────────────────────────── */}
                <div className="h-full max-h-[810px]">
                    <div className="mt-8 rounded-xl border border-border bg-card h-full flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between shrink-0">
                            <p className="font-semibold text-base">Títulos a vencer</p>
                        </div>

                        {/* Content — fades out cards that don't fully fit */}
                        <div
                            className="flex-1 overflow-hidden min-h-0"
                            style={{
                                maskImage: 'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)',
                            }}
                        >
                            {loading ? (
                                <div className="p-4 space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : titulosDates.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">Nenhum título a vencer.</p>
                            ) : (
                                <div className="p-4 space-y-5 overflow-hidden">
                                    {titulosDates.map(date => (
                                        <div key={date}>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 capitalize">
                                                {fmtDateLong(date)}
                                            </p>
                                            <div className="space-y-2">
                                                {titulosGrouped[date].map(t => (
                                                    <TituloCard key={t.id} titulo={t} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Ver mais */}
                        <div className="px-4 py-3 border-t border-border shrink-0">
                            <Link
                                to="/titulos-a-receber"
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                                Ver mais
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
