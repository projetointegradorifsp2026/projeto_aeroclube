import { useEffect, useState, useMemo, useCallback } from 'react'
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
    BarChart2,
    RefreshCw,
    SlidersHorizontal,
    ChevronDown,
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterSelect } from '@/components/ui/filter-controls'
import {
    getDashboardResumo,
    getVencidosPorMes,
    getEntradasPorGrupo,
    getHistoricoAnual,
    getMovimentacoes,
    getTitulosVencer,
    type ResumoFinanceiro,
    type VencidoMes,
    type EntradaGrupo,
    type MesHistorico,
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

const fmtShort = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(1)}K`
    return fmt(v)
}

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

// ─── Chart helpers ────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#06B6D4']

function TooltipMoeda({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
            {label && <p className="font-semibold mb-1">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: <span className="font-medium">{fmt(p.value)}</span>
                </p>
            ))}
        </div>
    )
}

function TooltipQtd({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
            {label && <p className="font-semibold mb-1">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: <span className="font-medium">{p.value} título(s)</span>
                </p>
            ))}
        </div>
    )
}

// ─── Quick links ──────────────────────────────────────────────────────────────

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

// ─── FinCard ──────────────────────────────────────────────────────────────────

interface FinCardProps {
    label: string
    value: number
    loading: boolean
    icon: typeof TrendingDown
    iconBg: string
    iconColor: string
    trend?: { value: number; up: boolean }
    subtitle?: string
    valueColor?: string
}

function FinCard({ label, value, loading, icon: Icon, iconColor, trend, subtitle, valueColor }: FinCardProps) {
    return (
        <Card className="relative">
            <CardContent className="px-3 py-3 sm:px-4 sm:py-2">
                <div className="absolute bottom-[-8px] right-[-8px]">
                    <Icon className={cn('h-0 w-0 md:h-20 md:w-20', iconColor)} />
                </div>
                {loading ? (
                    <>
                        <Skeleton className="h-4 w-3/4 mb-3" />
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-3 w-1/2 mt-2" />
                    </>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 z-40">
                            <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{label}</p>

                        </div>
                        <p className={cn('text-xl sm:text-2xl font-bold tracking-tight  z-40', valueColor)}>{fmt(value)}</p>
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

// ─── TituloCard ───────────────────────────────────────────────────────────────

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

// ─── AlertBanner ─────────────────────────────────────────────────────────────

interface AlertItem {
    id: string
    descricao: string
    valor: number
    data: string
    urgente: boolean
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

// ─── VooRow ───────────────────────────────────────────────────────────────────

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

// ─── TitulosVencerPanel ───────────────────────────────────────────────────────

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

// ─── ChartCard wrapper ────────────────────────────────────────────────────────

function ChartCard({
    title,
    loading,
    onRefresh,
    filters,
    children,
    empty,
}: {
    title: string
    loading: boolean
    onRefresh?: () => void
    filters?: React.ReactNode
    children: React.ReactNode
    empty?: boolean
}) {
    const [filtersOpen, setFiltersOpen] = useState(false)
    return (
        <Card className="h-full">
            <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <p className="font-semibold text-sm">{title}</p>
                    <div className="flex items-center gap-2">
                        {filters && (
                            <button
                                type="button"
                                onClick={() => setFiltersOpen(o => !o)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Filtros
                                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', filtersOpen && 'rotate-180')} />
                            </button>
                        )}
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                                title="Atualizar"
                            >
                                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                            </button>
                        )}
                    </div>
                </div>
                {filters && filtersOpen && (
                    <div className="flex flex-wrap items-start gap-3 mb-4 p-3 rounded-lg bg-muted/30 border border-border">
                        {filters}
                    </div>
                )}
                {loading ? (
                    <div className="h-48 flex items-end gap-3 px-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="flex-1 rounded" style={{ height: `${30 + Math.random() * 70}%` }} />
                        ))}
                    </div>
                ) : empty ? (
                    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <BarChart2 className="h-8 w-8 opacity-30" />
                        <p className="text-sm">Nenhum dado para o período selecionado.</p>
                    </div>
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    )
}

// ─── Gráfico 1: Vencidos por Mês ─────────────────────────────────────────────

const MESES_OPCOES = [
    { value: '3', label: '3 meses' },
    { value: '6', label: '6 meses' },
    { value: '12', label: '12 meses' },
    { value: '24', label: '24 meses' },
]

const CATEGORIA_RECEBER_OPCOES = [
    { value: '', label: 'Todas as categorias' },
    { value: 'mensalidade', label: 'Mensalidade' },
    { value: 'voo', label: 'Cobrança de Voo' },
    { value: 'servico', label: 'Serviço' },
    { value: 'outros', label: 'Outros' },
]

const CATEGORIA_PAGAR_OPCOES = [
    { value: '', label: 'Todas as categorias' },
    { value: 'fornecedor', label: 'Fornecedor' },
    { value: 'folha_pagamento', label: 'Folha de Pagamento' },
    { value: 'conta_fixa', label: 'Conta Fixa' },
    { value: 'outros', label: 'Outros' },
]

function buildPeriodo(meses: string): { data_inicio: string; data_fim: string } {
    const hoje = new Date()
    const fim = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const n = parseInt(meses)
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1), 1)
    const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { data_inicio: inicio, data_fim: fim }
}

function GraficoVencidosPorMes() {
    const [tipo, setTipo] = useState<'receber' | 'pagar'>('receber')
    const [metrica, setMetrica] = useState<'valor' | 'quantidade'>('valor')
    const [meses, setMeses] = useState('12')
    const [categoria, setCategoria] = useState('')
    const [data, setData] = useState<VencidoMes[]>([])
    const [loading, setLoading] = useState(true)

    const fetch = useCallback(() => {
        setLoading(true)
        const periodo = buildPeriodo(meses)
        getVencidosPorMes({ tipo, metrica, categoria: categoria || undefined, ...periodo })
            .then(setData)
            .finally(() => setLoading(false))
    }, [tipo, metrica, meses, categoria])

    useEffect(() => { fetch() }, [fetch])

    const barColor = tipo === 'receber' ? '#10B981' : '#F43F5E'
    const catOpcoes = tipo === 'receber' ? CATEGORIA_RECEBER_OPCOES : CATEGORIA_PAGAR_OPCOES

    return (
        <ChartCard
            title="Títulos Vencidos por Mês"
            loading={loading}
            onRefresh={fetch}
            empty={!loading && data.length === 0}
            filters={
                <>
                    <FilterSelect value={tipo} onChange={v => { setTipo(v as 'receber' | 'pagar'); setCategoria('') }} defaultValue="receber">
                        <option value="receber">A Receber</option>
                        <option value="pagar">A Pagar</option>
                    </FilterSelect>
                    <FilterSelect value={metrica} onChange={v => setMetrica(v as 'valor' | 'quantidade')} defaultValue="valor">
                        <option value="valor">Valor</option>
                        <option value="quantidade">Quantidade</option>
                    </FilterSelect>
                    <FilterSelect value={meses} onChange={setMeses} defaultValue="12">
                        {MESES_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FilterSelect>
                    <FilterSelect value={categoria} onChange={setCategoria} defaultValue="">
                        {catOpcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FilterSelect>
                </>
            }
        >
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                        width={metrica === 'valor' ? 72 : 40}
                        tickFormatter={metrica === 'valor' ? fmtShort : undefined}
                    />
                    <Tooltip content={metrica === 'valor' ? <TooltipMoeda /> : <TooltipQtd />} />
                    <Bar
                        dataKey={metrica}
                        name={metrica === 'valor' ? 'Valor vencido' : 'Quantidade'}
                        fill={barColor}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

// ─── Gráfico 2: Entradas por Grupo ───────────────────────────────────────────

type GrupoVisualizacao = 'pizza' | 'barras' | 'colunas'

const PERIODO_OPCOES = [
    { value: 'mes', label: 'Mês atual' },
    { value: 'trimestre', label: 'Trimestre' },
    { value: 'semestre', label: 'Semestre' },
    { value: 'ano', label: 'Ano atual' },
]

function buildPeriodoDatas(periodo: string): { data_inicio: string; data_fim: string } {
    const hoje = new Date()
    const fim = hoje.toISOString().split('T')[0]
    let inicio: Date
    if (periodo === 'mes') {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    } else if (periodo === 'trimestre') {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
    } else if (periodo === 'semestre') {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
    } else {
        inicio = new Date(hoje.getFullYear(), 0, 1)
    }
    return { data_inicio: inicio.toISOString().split('T')[0], data_fim: fim }
}

function GraficoEntradasPorGrupo() {
    const [periodo, setPeriodo] = useState('mes')
    const [vis, setVis] = useState<GrupoVisualizacao>('pizza')
    const [data, setData] = useState<EntradaGrupo[]>([])
    const [loading, setLoading] = useState(true)

    const fetch = useCallback(() => {
        setLoading(true)
        getEntradasPorGrupo(buildPeriodoDatas(periodo))
            .then(setData)
            .finally(() => setLoading(false))
    }, [periodo])

    useEffect(() => { fetch() }, [fetch])

    const total = data.reduce((s, d) => s + d.valor, 0)

    return (
        <ChartCard
            title="Entradas Financeiras por Grupo"
            loading={loading}
            onRefresh={fetch}
            empty={!loading && data.length === 0}
            filters={
                <>
                    <FilterSelect value={periodo} onChange={setPeriodo} defaultValue="mes">
                        {PERIODO_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </FilterSelect>
                    <FilterSelect value={vis} onChange={v => setVis(v as GrupoVisualizacao)} defaultValue="pizza">
                        <option value="pizza">Pizza</option>
                        <option value="barras">Barras</option>
                        <option value="colunas">Colunas</option>
                    </FilterSelect>
                </>
            }
        >
            {vis === 'pizza' && (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="valor"
                                nameKey="grupo"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={2}
                                label={({ percentual }) => `${percentual}%`}
                                labelLine={false}
                            >
                                {data.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => fmt(v)} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {vis === 'barras' && (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 3" horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                        <YAxis type="category" dataKey="grupo" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={96} />
                        <Tooltip content={<TooltipMoeda />} />
                        <Bar dataKey="valor" name="Valor recebido" radius={[0, 4, 4, 0]} maxBarSize={28}>
                            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}

            {vis === 'colunas' && (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="grupo" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={72} tickFormatter={fmtShort} />
                        <Tooltip content={<TooltipMoeda />} />
                        <Bar dataKey="valor" name="Valor recebido" radius={[4, 4, 0, 0]} maxBarSize={56}>
                            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}

            {total > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                    Total do período: <span className="font-medium text-foreground">{fmt(total)}</span>
                </p>
            )}
        </ChartCard>
    )
}

// ─── Gráfico 3: Histórico Anual ───────────────────────────────────────────────

const TIPO_RECEBER_OPCOES = [
    { value: 'mensalidade', label: 'Mensalidade' },
    { value: 'voo', label: 'Cobrança de Voo' },
    { value: 'servico', label: 'Serviço' },
    { value: 'outros', label: 'Outros' },
]

const TIPO_PAGAR_OPCOES = [
    { value: 'fornecedor', label: 'Fornecedor' },
    { value: 'folha_pagamento', label: 'Folha de Pagamento' },
    { value: 'conta_fixa', label: 'Conta Fixa' },
    { value: 'outros', label: 'Outros' },
]

function MultiCheckbox({
    label,
    options,
    selected,
    onChange,
}: {
    label: string
    options: { value: string; label: string }[]
    selected: string[]
    onChange: (v: string[]) => void
}) {
    function toggle(val: string) {
        onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val])
    }
    return (
        <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => toggle(opt.value)}
                        className={cn(
                            'px-2 py-0.5 rounded-full text-xs border transition-colors',
                            selected.includes(opt.value)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary/50',
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

type SerieSaldo = 'entradas' | 'saidas' | 'saldo'

function GraficoHistoricoAnual() {
    const anoAtual = new Date().getFullYear()
    const [ano, setAno] = useState(anoAtual)
    const [series, setSeries] = useState<SerieSaldo[]>(['entradas', 'saidas', 'saldo'])
    const [tiposReceber, setTiposReceber] = useState<string[]>([])
    const [tiposPagar, setTiposPagar] = useState<string[]>([])
    const [data, setData] = useState<MesHistorico[]>([])
    const [loading, setLoading] = useState(true)

    const anosOpcoes = Array.from({ length: 5 }, (_, i) => anoAtual - i)

    const fetch = useCallback(() => {
        setLoading(true)
        getHistoricoAnual({
            ano,
            tipo_receber: tiposReceber.join(',') || undefined,
            tipo_pagar: tiposPagar.join(',') || undefined,
        })
            .then(setData)
            .finally(() => setLoading(false))
    }, [ano, tiposReceber, tiposPagar])

    useEffect(() => { fetch() }, [fetch])

    // Trunca meses futuros quando o ano selecionado é o corrente (mês atual fica à direita)
    const mesAtual = new Date().getMonth() + 1
    const dataExibida = ano === anoAtual ? data.filter(m => m.mes <= mesAtual) : data

    function toggleSerie(s: SerieSaldo) {
        setSeries(prev =>
            prev.includes(s)
                ? prev.length > 1 ? prev.filter(x => x !== s) : prev
                : [...prev, s]
        )
    }

    const SERIES_CONFIG: { key: SerieSaldo; label: string; color: string }[] = [
        { key: 'entradas', label: 'Entradas', color: '#10B981' },
        { key: 'saidas', label: 'Saídas', color: '#F43F5E' },
        { key: 'saldo', label: 'Saldo', color: '#6366F1' },
    ]

    return (
        <ChartCard
            title="Histórico de Entradas e Saídas"
            loading={loading}
            onRefresh={fetch}
            empty={!loading && data.every(m => m.entradas === 0 && m.saidas === 0)}
            filters={
                <>
                    <FilterSelect
                        value={String(ano)}
                        onChange={v => setAno(Number(v))}
                        defaultValue={String(anoAtual)}
                    >
                        {anosOpcoes.map(a => <option key={a} value={a}>{a}</option>)}
                    </FilterSelect>
                    <div className="flex items-center rounded-lg border border-border overflow-hidden">
                        {SERIES_CONFIG.map((s, i) => (
                            <button
                                key={s.key}
                                onClick={() => toggleSerie(s.key)}
                                className={cn(
                                    'px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors',
                                    i > 0 && 'border-l border-border',
                                    series.includes(s.key)
                                        ? 'text-foreground'
                                        : 'text-muted-foreground/40',
                                )}
                                style={series.includes(s.key) ? { backgroundColor: `${s.color}18`, color: s.color } : {}}
                            >
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <MultiCheckbox
                        label="Tipo Entradas (A Receber)"
                        options={TIPO_RECEBER_OPCOES}
                        selected={tiposReceber}
                        onChange={setTiposReceber}
                    />
                    <MultiCheckbox
                        label="Tipo Saídas (A Pagar)"
                        options={TIPO_PAGAR_OPCOES}
                        selected={tiposPagar}
                        onChange={setTiposPagar}
                    />
                </>
            }
        >
            <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dataExibida} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={72} tickFormatter={fmtShort} />
                    <Tooltip content={<TooltipMoeda />} />
                    {series.includes('entradas') && (
                        <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#10B981" strokeWidth={2} fill="url(#gradEntradas)" dot={false} activeDot={{ r: 4 }} />
                    )}
                    {series.includes('saidas') && (
                        <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#F43F5E" strokeWidth={2} fill="url(#gradSaidas)" dot={false} activeDot={{ r: 4 }} />
                    )}
                    {series.includes('saldo') && (
                        <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#6366F1" strokeWidth={2} fill="url(#gradSaldo)" dot={false} activeDot={{ r: 4 }} />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

// ─── Dashboard Admin ──────────────────────────────────────────────────────────

function DashboardAdmin() {
    const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
    const [, setMovs] = useState<Movimentacao[]>([])
    const [, setTitulos] = useState<TituloVencer[]>([])
    const [loading, setLoading] = useState(true)
    const [userModalOpen, setUserModalOpen] = useState(false)
    const [pagarModalOpen, setPagarModalOpen] = useState(false)
    const [receberModalOpen, setReceberModalOpen] = useState(false)

    useEffect(() => {
        Promise.all([getDashboardResumo(), getMovimentacoes(), getTitulosVencer()])
            .then(([r, m, t]) => {
                setResumo(r); setMovs(m); setTitulos(t)
                setLoading(false)
            })
            .catch(() => setLoading(false))
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
                    cliente_id: data.cliente_id,
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

    return (
        <div className="pt-2 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Visão financeira e operacional do aeroclube.</p>
            </div>

            <div className="grid grid-cols-1 gap-10">
                {/* ── Coluna principal ── */}
                <div className="space-y-6 min-w-0 h-fit">

                    {/* Acessos rápidos */}
                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Acessos rápidos</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {adminQuickLinks.map(l => <QuickCard key={l.label} {...l} />)}
                        </div>
                    </section>

                    {/* Cards de resumo financeiro (6 cards) */}
                    <section>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Resumo Financeiro</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <FinCard
                                label="Total a Receber"
                                value={resumo?.total_receber ?? 0}
                                loading={loading}
                                icon={TrendingUp}
                                iconBg="bg-muted"
                                iconColor="text-gray-200"
                                subtitle="Saldo em aberto"
                            />
                            <FinCard
                                label="Total a Pagar"
                                value={resumo?.total_pagar ?? 0}
                                loading={loading}
                                icon={TrendingDown}
                                iconBg="bg-muted"
                                iconColor="text-gray-200"
                                subtitle="Saldo em aberto"
                            />
                            <FinCard
                                label="Vencidos a Receber"
                                value={resumo?.vencidos_receber ?? 0}
                                loading={loading}
                                icon={AlertTriangle}
                                iconBg="bg-muted"
                                iconColor="text-gray-200"
                                subtitle="Títulos vencidos"
                            />
                            <FinCard
                                label="Recebidos no Mês"
                                value={resumo?.recebidos_mes ?? 0}
                                loading={loading}
                                icon={CheckCircle2}
                                iconBg="bg-muted"
                                iconColor="text-gray-200"
                                subtitle="Baixas no mês atual"
                            />
                            <FinCard
                                label="Pagos no Mês"
                                value={resumo?.pagos_mes ?? 0}
                                loading={loading}
                                icon={Wallet}
                                iconBg="bg-muted"
                                iconColor="text-gray-200"
                                subtitle="Saídas no mês atual"
                            />
                            <FinCard
                                label="Saldo do Mês"
                                value={resumo?.saldo_mes ?? 0}
                                loading={loading}
                                icon={ChartSpline}
                                iconBg="bg-muted"
                                iconColor="text-gray-200"
                                subtitle="Entradas − Saídas"
                            />
                        </div>
                    </section>

                    {/* Gráfico 1 + 2 */}
                    <div className="grid grid-cols-2 gap-4 items-start">
                        <section className="h-full">
                            <GraficoVencidosPorMes />
                        </section>
                        <section className="h-full">
                            <GraficoEntradasPorGrupo />
                        </section>
                    </div>


                    {/* Gráfico 3 */}
                    <section>
                        <GraficoHistoricoAnual />
                    </section>
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
                                iconColor="text-gray-200"
                                subtitle={`${meusTitulos.filter(t => t.status !== 'baixado').length} título(s) em aberto`}
                            />
                            <FinCard
                                label="Total já pago"
                                value={totalPago}
                                loading={loading}
                                icon={CheckCircle2}
                                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                                iconColor="text-gray-200"
                                subtitle={`${meusTitulos.filter(t => t.status === 'baixado').length} título(s) quitado(s)`}
                            />
                            <FinCard
                                label="Saldo na carteira"
                                value={saldoCarteira}
                                loading={loading}
                                icon={Wallet}
                                iconBg="bg-teal-100 dark:bg-teal-900/30"
                                iconColor="text-gray-200"
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
                setMeusPagamentos(tp.filter(t =>
                    t.tipo === 'folha' &&
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
                                iconColor="text-gray-200"
                                subtitle={`${meusPagamentos.filter(t => t.status === 'em_aberto').length} pagamento(s) pendente(s)`}
                            />
                            <FinCard
                                label="Total já recebido"
                                value={totalRecebido}
                                loading={loading}
                                icon={CheckCircle2}
                                iconBg="bg-blue-100 dark:bg-blue-900/30"
                                iconColor="text-gray-200"
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
