import { useEffect, useState, useMemo } from 'react'
import {
    Plane,
    FileText,
    UserPlus,
    BookOpen,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
    Wallet,
    AlertTriangle,
    CheckCircle2,
    Clock,
    History,
    ChartSpline,
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
import { getTitulosReceber, createTituloReceber, type TituloReceber } from '@/services/titulosReceberService'
import { getTitulosPagar, createTituloPagar, type TituloPagar } from '@/services/titulosPagarService'
import { getVoos, type Voo } from '@/services/voosService'
import { getCurrentUser } from '@/services/api/auth'
import { getUsers, createUser, type User } from '@/services/usersService'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { UserFormModal, type UserFormData } from '@/components/users/UserFormModal'
import { TituloPagarFormModal, type TituloPagarFormData } from '@/components/titulos/TituloPagarFormModal'
import { TituloReceberFormModal, type TituloReceberFormData } from '@/components/titulos/TituloReceberFormModal'

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
            {[0.25, 0.5, 0.75, 1].map(f => (
                <line key={f} x1={P.l} x2={W - P.r} y1={P.t + ch * (1 - f)} y2={P.t + ch * (1 - f)}
                    stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 3" />
            ))}
            <path d={makeAreaPath(saiPts, baseY)} fill="url(#ag-sai)" />
            <path d={makeAreaPath(entPts, baseY)} fill="url(#ag-ent)" />
            <path d={makeSmoothPath(saiPts)} fill="none" stroke="#F43F5E" strokeWidth="1.5" strokeOpacity="0.7" />
            <path d={makeSmoothPath(entPts)} fill="none" stroke="#6366F1" strokeWidth="2" />
            <circle cx={entPts[entPts.length - 1][0]} cy={entPts[entPts.length - 1][1]} r={3.5} fill="#6366F1" />
            <circle cx={saiPts[saiPts.length - 1][0]} cy={saiPts[saiPts.length - 1][1]} r={3} fill="#F43F5E" fillOpacity="0.7" />
            {data.map((item, i) => (
                <text key={item.periodo} x={px(i)} y={H - 18} textAnchor="middle" fontSize={8} fill="#9CA3AF">
                    {item.periodo}
                </text>
            ))}
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
            {[0.25, 0.5, 0.75, 1].map(f => (
                <line key={f} x1={P.l} x2={W - P.r} y1={P.t + ch * (1 - f)} y2={P.t + ch * (1 - f)}
                    stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 3" />
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
            <text x={W - P.r} y={H - 5} textAnchor="end" fontSize={7.5} fill="#9CA3AF">Mês</text>
        </svg>
    )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

interface QuickLinkItem {
    label: string
    to?: string
    onClick?: () => void
    icon: typeof Plane
    iconBg: string
    iconColor: string
}

const QUICK_LINKS_ADMIN_BASE: Omit<QuickLinkItem, 'onClick'>[] = [
    { label: 'Registrar voo', to: '/voos/novo', icon: Plane, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Títulos a Pagar', icon: FileText, iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400' },
    { label: 'Títulos a Receber', icon: BookOpen, iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Cadastrar usuário', icon: UserPlus, iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
]

const QUICK_LINKS_ALUNO: QuickLinkItem[] = [
    { label: 'Meus Voos', to: '/voos', icon: Plane, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Minhas Faturas', to: '/titulos-a-receber', icon: FileText, iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400' },
    { label: 'Movimentações', to: '/movimentacoes', icon: ChartSpline, iconBg: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400' },
    { label: 'Meu Perfil', to: '#perfil', icon: BookOpen, iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
]

const QUICK_LINKS_INSTRUTOR: QuickLinkItem[] = [
    { label: 'Registrar Voo', to: '/voos/novo', icon: Plane, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Diário de Bordo', to: '/voos', icon: History, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Meus Pagamentos', to: '/titulos-a-pagar', icon: FileText, iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Meu Perfil', to: '#perfil', icon: BookOpen, iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
]

const QUICK_LINKS_FUNCIONARIO: QuickLinkItem[] = [
    { label: 'Meus Pagamentos', to: '/titulos-a-pagar', icon: FileText, iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Movimentações', to: '/movimentacoes', icon: TrendingUp, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Meu Perfil', to: '#perfil', icon: BookOpen, iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
]

function QuickCard({ label, to, onClick, icon: Icon, iconBg, iconColor }: QuickLinkItem) {
    const navigate = useNavigate()
    const user = getCurrentUser()

    const className = "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:shadow-sm hover:border-border/80 transition-all group w-full text-left"
    const inner = (
        <>
            <div className={cn('rounded-lg p-2 shrink-0', iconBg)}>
                <Icon className={cn('h-4 w-4', iconColor)} />
            </div>
            <span className="flex-1">{label}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </>
    )

    if (onClick) {
        return <button onClick={onClick} className={className}>{inner}</button>
    }

    function handleClick(e: React.MouseEvent) {
        if (to === '#perfil' && user) {
            e.preventDefault()
            navigate(`/usuarios/${user.id}`)
        }
    }

    return (
        <Link to={to!} onClick={handleClick} className={className}>
            {inner}
        </Link>
    )
}

interface FinCardProps {
    label: string
    value: number
    loading: boolean
    icon: typeof TrendingDown
    iconBg: string
    iconColor: string
    trend?: { value: number; up: boolean }
    subtitle?: string
}

function FinCard({ label, value, loading, icon: Icon, iconBg, iconColor, trend, subtitle }: FinCardProps) {
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
                        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                        {trend && (
                            <p className={cn('flex items-center gap-1 text-xs mt-1.5', trend.up ? 'text-emerald-600' : 'text-rose-500')}>
                                {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {trend.value}% vs mês anterior
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

function MovRow({ mov }: { mov: Movimentacao }) {
    const isEntrada = mov.tipo === 'entrada'
    const isCarteira = mov.tipo === 'carteira'
    const isDebito = isCarteira && mov.carteira_debito
    return (
        <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3">
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium mb-1',
                    isEntrada ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : isCarteira ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                )}>
                    {isEntrada ? 'Entrada' : isCarteira ? 'Carteira' : 'Saída'}
                </span>
                <p className="text-xs text-muted-foreground">{mov.pessoa}</p>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px]">
                <p className="truncate">{mov.descricao}</p>
            </td>
            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                <span className={isEntrada ? 'text-emerald-600 dark:text-emerald-400'
                    : isCarteira ? 'text-teal-600 dark:text-teal-400'
                    : 'text-rose-600 dark:text-rose-400'}>
                    {isEntrada ? '+' : isDebito ? '−' : isCarteira ? '+' : '−'}{fmt(mov.valor)}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                {fmtDate(mov.data)}
            </td>
        </tr>
    )
}

function TituloCard({ titulo }: { titulo: TituloVencer }) {
    const isPagar = titulo.tipo === 'pagar'
    return (
        <div className={cn('rounded-xl border bg-card px-4 py-3 border-l-[3px]',
            isPagar ? 'border-border border-l-rose-400' : 'border-border border-l-emerald-400',
        )}>
            <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium mb-1.5',
                isPagar ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            )}>
                {isPagar ? 'A pagar' : 'A receber'}
            </span>
            <p className="text-xs text-muted-foreground mb-0.5">{titulo.descricao}</p>
            <p className="text-xl font-bold">{fmt(titulo.valor)}</p>
        </div>
    )
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

interface AlertItem {
    id: string
    descricao: string
    valor: number
    data: string
    urgente: boolean // vencido ou vence em <= 3 dias
}

function AlertBanner({ alerts }: { alerts: AlertItem[] }) {
    if (alerts.length === 0) return null
    const vencidos = alerts.filter(a => a.urgente)
    const proximos = alerts.filter(a => !a.urgente)
    return (
        <div className="space-y-2">
            {vencidos.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/30">
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-1">
                            {vencidos.length === 1 ? '1 título vencido' : `${vencidos.length} títulos vencidos`}
                        </p>
                        <div className="space-y-0.5">
                            {vencidos.slice(0, 3).map(a => (
                                <p key={a.id} className="text-xs text-rose-600 dark:text-rose-400 truncate">
                                    {a.descricao} — <span className="font-medium">{fmt(a.valor)}</span> (venceu em {fmtDate(a.data)})
                                </p>
                            ))}
                            {vencidos.length > 3 && <p className="text-xs text-rose-500">+{vencidos.length - 3} outros</p>}
                        </div>
                    </div>
                </div>
            )}
            {proximos.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                            {proximos.length === 1 ? '1 título vence em breve' : `${proximos.length} títulos vencem em breve`}
                        </p>
                        <div className="space-y-0.5">
                            {proximos.slice(0, 3).map(a => (
                                <p key={a.id} className="text-xs text-amber-600 dark:text-amber-400 truncate">
                                    {a.descricao} — <span className="font-medium">{fmt(a.valor)}</span> (vence em {fmtDate(a.data)})
                                </p>
                            ))}
                            {proximos.length > 3 && <p className="text-xs text-amber-500">+{proximos.length - 3} outros</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Voos recentes table (used in user dashboard) ─────────────────────────────

function VooRow({ voo, asInstrutor }: { voo: Voo; asInstrutor?: boolean }) {
    return (
        <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(voo.data)}</td>
            <td className="px-4 py-3 font-medium text-sm">{voo.aeronave_nome}</td>
            {asInstrutor && (
                <td className="px-4 py-3 text-sm text-muted-foreground">{voo.participante_nome}</td>
            )}
            <td className="px-4 py-3 whitespace-nowrap text-sm">
                <p className="font-medium">{Math.round(voo.tempo_decimal * 60)} min</p>
                <p className="text-xs text-muted-foreground">{voo.tempo_decimal.toFixed(1).replace('.', ',')} h</p>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{fmt(voo.valor_voo)}</td>
        </tr>
    )
}

// ─── Painel de títulos a vencer (reutilizado) ─────────────────────────────────

function TitulosVencerPanel({
    loading,
    titulos,
    linkTo,
    linkLabel,
}: {
    loading: boolean
    titulos: TituloVencer[]
    linkTo: string
    linkLabel: string
}) {
    const grouped = titulos.reduce<Record<string, TituloVencer[]>>((acc, t) => {
        if (!acc[t.data]) acc[t.data] = []
        acc[t.data].push(t)
        return acc
    }, {})
    const dates = Object.keys(grouped).sort()

    return (
        <div className="mt-8 rounded-xl border border-border bg-card h-full flex flex-col overflow-hidden max-h-[810px]">
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between shrink-0">
                <p className="font-semibold text-base">Próximos vencimentos</p>
            </div>
            <div className="flex-1 overflow-hidden min-h-0"
                style={{
                    maskImage: 'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)',
                }}>
                {loading ? (
                    <div className="p-4 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                ) : dates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                        <CheckCircle2 className="h-8 w-8 opacity-30" />
                        <p className="text-sm">Nenhum vencimento pendente.</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-5 overflow-hidden">
                        {dates.map(date => (
                            <div key={date}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 capitalize">
                                    {fmtDateLong(date)}
                                </p>
                                <div className="space-y-2">
                                    {grouped[date].map(t => <TituloCard key={t.id} titulo={t} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="px-4 py-3 border-t border-border shrink-0">
                <Link to={linkTo} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    {linkLabel}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    )
}

// ─── Dashboard Admin ──────────────────────────────────────────────────────────

function DashboardAdmin() {
    const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
    const [periodos, setPeriodos] = useState<PeriodoData[]>([])
    const [despesas, setDespesas] = useState<DespesaCategoria[]>([])
    const [movs, setMovs] = useState<Movimentacao[]>([])
    const [titulos, setTitulos] = useState<TituloVencer[]>([])
    const [loading, setLoading] = useState(true)
    const [userModalOpen, setUserModalOpen] = useState(false)
    const [pagarModalOpen, setPagarModalOpen] = useState(false)
    const [receberModalOpen, setReceberModalOpen] = useState(false)

    useEffect(() => {
        Promise.all([getResumoFinanceiro(), getPeriodoData(), getDespesas(), getMovimentacoes(), getTitulosVencer()])
            .then(([r, p, d, m, t]) => {
                setResumo(r); setPeriodos(p); setDespesas(d); setMovs(m); setTitulos(t)
                setLoading(false)
            })
    }, [])

    async function handleSaveUser(data: UserFormData) {
        await createUser(data)
        setUserModalOpen(false)
    }

    async function handleSavePagar(data: TituloPagarFormData) {
        await Promise.all(
            data.parcela_vencimentos.map((venc, i) =>
                createTituloPagar({
                    tipo: data.tipo,
                    favorecido: data.favorecido,
                    descricao: data.descricao,
                    num_parcela: i + 1,
                    total_parcelas: data.total_parcelas,
                    valor: data.parcela_valores[i] ?? data.valor,
                    multa: 0,
                    data_emissao: data.data_emissao,
                    data_vencimento: venc,
                    status: 'em_aberto',
                    valor_pago: null,
                    data_pagamento: null,
                    recorrente: data.recorrente,
                })
            )
        )
        setPagarModalOpen(false)
    }

    async function handleSaveReceber(data: TituloReceberFormData) {
        await Promise.all(
            data.parcela_vencimentos.map((venc, i) =>
                createTituloReceber({
                    usuario_id: data.usuario_id,
                    usuario_nome: data.usuario_nome,
                    cliente_externo_id: data.cliente_externo_id,
                    tipo: data.tipo,
                    descricao: data.descricao,
                    num_parcela: i + 1,
                    total_parcelas: data.total_parcelas,
                    valor: data.parcela_valores[i] ?? data.valor,
                    valor_pago: 0,
                    juros_aplicado: 0,
                    multa: 0,
                    data_emissao: data.data_emissao,
                    data_vencimento: venc,
                    data_pagamento: null,
                    status: 'em_aberto',
                })
            )
        )
        setReceberModalOpen(false)
    }

    const adminQuickLinks: QuickLinkItem[] = QUICK_LINKS_ADMIN_BASE.map(l => {
        if (l.label === 'Títulos a Pagar') return { ...l, onClick: () => setPagarModalOpen(true) }
        if (l.label === 'Títulos a Receber') return { ...l, onClick: () => setReceberModalOpen(true) }
        if (l.label === 'Cadastrar usuário') return { ...l, onClick: () => setUserModalOpen(true) }
        return l
    })

    const titulosGrouped = titulos.reduce<Record<string, TituloVencer[]>>((acc, t) => {
        if (!acc[t.data]) acc[t.data] = []
        acc[t.data].push(t)
        return acc
    }, {})
    const titulosDates = Object.keys(titulosGrouped).sort()

    return (
        <div className="pt-2 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Acompanhe as operações e finanças do aeroclube em um só lugar.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-10">
                <div className="space-y-6 min-w-0 h-fit">
                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Acessos rápidos</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {adminQuickLinks.map(l => <QuickCard key={l.label} {...l} />)}
                        </div>
                    </section>

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Resumo Financeiro</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FinCard label="Títulos a Pagar em Aberto" value={resumo?.titulosPagar ?? 0}
                                loading={loading} icon={TrendingDown} iconBg="bg-chart-5/10 dark:bg-chart-5/20" iconColor="text-chart-5" />
                            <FinCard label="Títulos a Receber em Aberto" value={resumo?.titulosReceber ?? 0}
                                loading={loading} icon={TrendingUp} iconBg="bg-chart-2/10 dark:bg-chart-2/20" iconColor="text-chart-2" />
                        </div>
                    </section>

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Últimas movimentações</p>
                        <Card>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/30">
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody>{movs.map(m => <MovRow key={m.id} mov={m} />)}</tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>

                <div className="h-full">
                    <div className="mt-8 rounded-xl border border-border bg-card h-full flex flex-col overflow-hidden max-h-[810px]">
                        <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
                            <p className="font-semibold text-base">Títulos a vencer</p>
                        </div>
                        <div className="flex-1 overflow-hidden min-h-0"
                            style={{ maskImage: 'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)' }}>
                            {loading ? (
                                <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
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
                                                {titulosGrouped[date].map(t => <TituloCard key={t.id} titulo={t} />)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-3 border-t border-border shrink-0">
                            <Link to="/titulos-a-receber" className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                                Ver mais <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <UserFormModal
                open={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                onSave={handleSaveUser}
            />
            <TituloPagarFormModal
                open={pagarModalOpen}
                onClose={() => setPagarModalOpen(false)}
                onSave={handleSavePagar}
            />
            <TituloReceberFormModal
                open={receberModalOpen}
                onClose={() => setReceberModalOpen(false)}
                onSave={handleSaveReceber}
            />
        </div>
    )
}

// ─── Dashboard Aluno / Sócio / Externo ────────────────────────────────────────

function DashboardAluno({ perfil }: { perfil: string }) {
    const currentUser = getCurrentUser()
    const userId = String(currentUser?.id ?? '')
    const userName = currentUser?.nome ?? 'Usuário'

    const [loading, setLoading] = useState(true)
    const [meusTitulos, setMeusTitulos] = useState<TituloReceber[]>([])
    const [meusVoos, setMeusVoos] = useState<Voo[]>([])
    const [meusUsers, setMeusUsers] = useState<User[]>([])

    useEffect(() => {
        Promise.all([getTitulosReceber(), getVoos(), getUsers()])
            .then(([tr, vs, us]) => {
                setMeusTitulos(tr.filter(t => t.usuario_id === userId && t.tipo !== 'carteira'))
                setMeusVoos(vs.filter(v => v.participante_id === userId).sort((a, b) => b.data.localeCompare(a.data)))
                setMeusUsers(us)
                setLoading(false)
            })
    }, [userId])

    const saldoDevedor = useMemo(() =>
        meusTitulos.filter(t => t.status !== 'baixado').reduce((s, t) => s + (t.valor - t.valor_pago), 0),
        [meusTitulos])

    const totalPago = useMemo(() =>
        meusTitulos.filter(t => t.status === 'baixado').reduce((s, t) => s + t.valor_pago, 0),
        [meusTitulos])

    const meUser = meusUsers.find(u => u.id === userId)
    const saldoCarteira = meUser?.saldo_carteira ?? 0

    const hoje = new Date().toISOString().split('T')[0]
    const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    const alerts: AlertItem[] = useMemo(() =>
        meusTitulos
            .filter(t => t.status !== 'baixado' && t.data_vencimento <= em7dias)
            .map(t => ({
                id: t.id,
                descricao: t.descricao,
                valor: t.valor - t.valor_pago,
                data: t.data_vencimento,
                urgente: t.data_vencimento < hoje,
            }))
            .sort((a, b) => a.data.localeCompare(b.data)),
        [meusTitulos, hoje, em7dias])

    const titulos: TituloVencer[] = useMemo(() =>
        meusTitulos
            .filter(t => t.status !== 'baixado')
            .map(t => ({ id: t.id, descricao: t.descricao, valor: t.valor - t.valor_pago, data: t.data_vencimento, tipo: 'pagar' as const }))
            .sort((a, b) => a.data.localeCompare(b.data)),
        [meusTitulos])

    const perfilLabel: Record<string, string> = { aluno: 'Aluno', socio: 'Sócio', externo: 'Aluno Externo' }

    return (
        <div className="pt-2 space-y-6">
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{perfilLabel[perfil] ?? perfil}</p>
                <h1 className="text-2xl font-bold">Olá, {userName.split(' ')[0]}!</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Acompanhe suas atividades e financeiro no aeroclube.</p>
            </div>

            {!loading && <AlertBanner alerts={alerts} />}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-10">
                <div className="space-y-6 min-w-0">

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Acessos rápidos</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {QUICK_LINKS_ALUNO.map(l => <QuickCard key={l.label} {...l} />)}
                        </div>
                    </section>

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Meu resumo financeiro</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FinCard
                                label="Pendente a pagar"
                                value={saldoDevedor}
                                loading={loading}
                                icon={TrendingDown}
                                iconBg="bg-rose-100 dark:bg-rose-900/30"
                                iconColor="text-rose-600 dark:text-rose-400"
                                subtitle={`${meusTitulos.filter(t => t.status !== 'baixado').length} título(s) em aberto`}
                            />
                            <FinCard
                                label="Total já pago"
                                value={totalPago}
                                loading={loading}
                                icon={CheckCircle2}
                                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                subtitle={`${meusTitulos.filter(t => t.status === 'baixado').length} título(s) quitado(s)`}
                            />
                            <FinCard
                                label="Saldo na carteira"
                                value={saldoCarteira}
                                loading={loading}
                                icon={Wallet}
                                iconBg="bg-teal-100 dark:bg-teal-900/30"
                                iconColor="text-teal-600 dark:text-teal-400"
                                subtitle={saldoCarteira > 0 ? 'Disponível para voos' : 'Sem saldo disponível'}
                            />
                        </div>
                    </section>

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Meus últimos voos</p>
                        <Card>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                                ) : meusVoos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                        <Plane className="h-8 w-8 mb-2 opacity-30" />
                                        <p className="text-sm">Nenhum voo registrado ainda.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/30">
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Data</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aeronave</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Tempo</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {meusVoos.slice(0, 6).map(v => <VooRow key={v.id} voo={v} />)}
                                        </tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>
                        {meusVoos.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2 text-right">
                                Total: <span className="font-medium">{meusVoos.length} voo(s)</span>
                            </p>
                        )}
                    </section>
                </div>

                <div>
                    <TitulosVencerPanel
                        loading={loading}
                        titulos={titulos}
                        linkTo="/titulos-a-receber"
                        linkLabel="Ver todos os títulos"
                    />
                </div>
            </div>
        </div>
    )
}

// ─── Dashboard Instrutor / Funcionário ────────────────────────────────────────

function DashboardInstrutor({ perfil }: { perfil: string }) {
    const currentUser = getCurrentUser()
    const userId = String(currentUser?.id ?? '')
    const userName = currentUser?.nome ?? 'Usuário'

    const [loading, setLoading] = useState(true)
    const [meusPagamentos, setMeusPagamentos] = useState<TituloPagar[]>([])
    const [meusVoos, setMeusVoos] = useState<Voo[]>([])

    useEffect(() => {
        Promise.all([getTitulosPagar(), getVoos()])
            .then(([tp, vs]) => {
                // títulos a pagar onde o favorecido é este usuário
                setMeusPagamentos(tp.filter(t =>
                    t.tipo === 'folha' &&
                    // match pelo nome já que a FK é resolvida para nome no frontend
                    t.favorecido === (currentUser?.nome ?? '')
                ))
                setMeusVoos(
                    vs.filter(v => v.instrutor_id === userId || v.participante_id === userId)
                      .sort((a, b) => b.data.localeCompare(a.data))
                )
                setLoading(false)
            })
    }, [userId, currentUser?.nome])

    const totalAReceber = useMemo(() =>
        meusPagamentos.filter(t => t.status === 'em_aberto').reduce((s, t) => s + t.valor, 0),
        [meusPagamentos])

    const totalRecebido = useMemo(() =>
        meusPagamentos.filter(t => t.status === 'baixado').reduce((s, t) => s + (t.valor_pago ?? t.valor), 0),
        [meusPagamentos])

    const voosComoInstrutor = useMemo(() => meusVoos.filter(v => v.instrutor_id === userId), [meusVoos, userId])

    const hoje = new Date().toISOString().split('T')[0]
    const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    const alerts: AlertItem[] = useMemo(() =>
        meusPagamentos
            .filter(t => t.status === 'em_aberto' && t.data_vencimento <= em7dias)
            .map(t => ({
                id: t.id,
                descricao: t.descricao,
                valor: t.valor,
                data: t.data_vencimento,
                urgente: t.data_vencimento < hoje,
            }))
            .sort((a, b) => a.data.localeCompare(b.data)),
        [meusPagamentos, hoje, em7dias])

    // Para o painel de vencimentos, o instrutor vê "o que vai receber" como tipo 'receber'
    const titulosVencer: TituloVencer[] = useMemo(() =>
        meusPagamentos
            .filter(t => t.status === 'em_aberto')
            .map(t => ({ id: t.id, descricao: t.descricao, valor: t.valor, data: t.data_vencimento, tipo: 'receber' as const }))
            .sort((a, b) => a.data.localeCompare(b.data)),
        [meusPagamentos])

    const perfilLabel: Record<string, string> = { instrutor: 'Instrutor', funcionario: 'Funcionário' }

    return (
        <div className="pt-2 space-y-6">
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{perfilLabel[perfil] ?? perfil}</p>
                <h1 className="text-2xl font-bold">Olá, {userName.split(' ')[0]}!</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Acompanhe seus voos e pagamentos do aeroclube.</p>
            </div>

            {!loading && <AlertBanner alerts={alerts} />}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-10">
                <div className="space-y-6 min-w-0">

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Acessos rápidos</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(perfil === 'instrutor' ? QUICK_LINKS_INSTRUTOR : QUICK_LINKS_FUNCIONARIO).map(l => <QuickCard key={l.label} {...l} />)}
                        </div>
                    </section>

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Meu resumo</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FinCard
                                label="A receber do aeroclube"
                                value={totalAReceber}
                                loading={loading}
                                icon={TrendingUp}
                                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                subtitle={`${meusPagamentos.filter(t => t.status === 'em_aberto').length} pagamento(s) pendente(s)`}
                            />
                            <FinCard
                                label="Total já recebido"
                                value={totalRecebido}
                                loading={loading}
                                icon={CheckCircle2}
                                iconBg="bg-blue-100 dark:bg-blue-900/30"
                                iconColor="text-blue-600 dark:text-blue-400"
                                subtitle={`${meusPagamentos.filter(t => t.status === 'baixado').length} pagamento(s)`}
                            />
                            <Card>
                                <CardContent className="px-3 py-3 sm:px-5 sm:py-4">
                                    {loading ? (
                                        <><Skeleton className="h-4 w-3/4 mb-3" /><Skeleton className="h-7 w-2/3" /></>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                                                <p className="text-xs sm:text-sm text-muted-foreground leading-snug">Voos como instrutor</p>
                                                <div className="rounded-lg p-1.5 sm:p-2 bg-violet-100 dark:bg-violet-900/30 shrink-0">
                                                    <Plane className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600 dark:text-violet-400" />
                                                </div>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold tracking-tight">{voosComoInstrutor.length}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {voosComoInstrutor.reduce((s, v) => s + v.tempo_decimal, 0).toFixed(1).replace('.', ',')} h totais
                                            </p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Meus últimos voos como instrutor</p>
                        <Card>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                                ) : voosComoInstrutor.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                        <Plane className="h-8 w-8 mb-2 opacity-30" />
                                        <p className="text-sm">Nenhum voo registrado ainda.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/30">
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Data</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aeronave</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Tempo</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {voosComoInstrutor.slice(0, 6).map(v => <VooRow key={v.id} voo={v} asInstrutor />)}
                                        </tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>

                <div>
                    <TitulosVencerPanel
                        loading={loading}
                        titulos={titulosVencer}
                        linkTo="/titulos-a-pagar"
                        linkLabel="Ver todos os pagamentos"
                    />
                </div>
            </div>
        </div>
    )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const user = getCurrentUser()
    const perfil = user?.perfil_ativo ?? ''

    if (perfil === 'admin') return <DashboardAdmin />
    if (perfil === 'instrutor' || perfil === 'funcionario') return <DashboardInstrutor perfil={perfil} />
    return <DashboardAluno perfil={perfil} />
}
