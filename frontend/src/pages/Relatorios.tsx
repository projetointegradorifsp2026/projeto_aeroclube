import { useEffect, useState, useCallback } from 'react'
import {
    Download,
    FileSpreadsheet,
    Filter,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    FileText,
    BookOpen,
    RefreshCw,
    X,
    Check,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterSelect, FilterInput } from '@/components/ui/filter-controls'
import { cn } from '@/lib/utils'
import {
    getRelatorioMetadados,
    getRelatorioPreview,
    exportarRelatorio,
    type RelatorioMetadados,
    type RelatorioResultado,
    type RelatorioParams,
} from '@/services/relatoriosService'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Fonte = 'receber' | 'pagar'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hojeStr() {
    return new Date().toISOString().split('T')[0]
}

function primeiroMes() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── SourceTab ────────────────────────────────────────────────────────────────

function SourceTab({
    fonte,
    active,
    onClick,
}: {
    fonte: Fonte
    active: boolean
    onClick: () => void
}) {
    const isReceber = fonte === 'receber'
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl border transition-colors',
                active
                    ? isReceber
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted/50',
            )}
        >
            {isReceber ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {isReceber ? 'Títulos a Receber' : 'Títulos a Pagar'}
        </button>
    )
}

// ─── FieldSelector ────────────────────────────────────────────────────────────

function FieldSelector({
    campos,
    selected,
    onChange,
}: {
    campos: Record<string, string>
    selected: string[]
    onChange: (v: string[]) => void
}) {
    function toggle(key: string) {
        onChange(
            selected.includes(key)
                ? selected.length > 1
                    ? selected.filter(k => k !== key)
                    : selected
                : [...selected, key],
        )
    }

    function selectAll() {
        onChange(Object.keys(campos))
    }

    function clearAll() {
        onChange([Object.keys(campos)[0]])
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colunas</p>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="text-xs text-primary hover:underline"
                    >
                        Todas
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    <button
                        onClick={clearAll}
                        className="text-xs text-muted-foreground hover:underline"
                    >
                        Limpar
                    </button>
                </div>
            </div>
            <div className="space-y-1">
                {Object.entries(campos).map(([key, label]) => {
                    const checked = selected.includes(key)
                    return (
                        <label
                            key={key}
                            className={cn(
                                'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 cursor-pointer select-none text-sm transition-colors',
                                checked ? 'bg-primary/5 text-primary' : 'hover:bg-muted/50 text-foreground',
                            )}
                        >
                            <span className={cn(
                                'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                                checked ? 'bg-primary border-primary' : 'border-input',
                            )}>
                                {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                            </span>
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => toggle(key)}
                            />
                            {label}
                        </label>
                    )
                })}
            </div>
        </div>
    )
}

// ─── PreviewTable ─────────────────────────────────────────────────────────────

function PreviewTable({
    resultado,
    loading,
    page,
    onPage,
    onSort,
    ordenarPor,
    ordenarDir,
    camposInteiros,
}: {
    resultado: RelatorioResultado | null
    loading: boolean
    page: number
    onPage: (p: number) => void
    onSort: (campo: string) => void
    ordenarPor: string
    ordenarDir: 'asc' | 'desc'
    camposInteiros: Set<string>
}) {
    if (loading) {
        return (
            <div className="space-y-2 p-4">
                <Skeleton className="h-8 w-full" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        )
    }

    if (!resultado || resultado.count === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <FileSpreadsheet className="h-10 w-10 opacity-20" />
                <p className="text-sm">Nenhum resultado para os filtros aplicados.</p>
            </div>
        )
    }

    const campos = resultado.campos
    const keys = Object.keys(campos)

    return (
        <div className="flex flex-col">
            {/* Tabela com scroll horizontal */}
            <div className="w-full overflow-x-auto">
                <table className="text-sm min-w-full w-max">
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b bg-muted/50">
                            {keys.map(k => (
                                <th
                                    key={k}
                                    className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground group select-none"
                                    onClick={() => onSort(k)}
                                >
                                    <span className="flex items-center gap-1">
                                        {campos[k]}
                                        <ArrowUpDown
                                            className={cn(
                                                'h-3 w-3 transition-opacity',
                                                ordenarPor === k
                                                    ? 'opacity-100 text-primary'
                                                    : 'opacity-0 group-hover:opacity-40',
                                            )}
                                        />
                                        {ordenarPor === k && (
                                            <span className="text-[10px] text-primary">
                                                {ordenarDir === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {resultado.results.map((row, i) => (
                            <tr
                                key={i}
                                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                            >
                                {keys.map(k => {
                                    const val = row[k]
                                    const isStatus = k === 'status'
                                    const isInteiro = camposInteiros.has(k)
                                    const isMonetario = typeof val === 'number' && !isInteiro
                                    return (
                                        <td key={k} className="px-3 py-2.5 whitespace-nowrap">
                                            {isStatus ? (
                                                <span className={cn(
                                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                                    String(val) === 'Em Aberto'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                                                )}>
                                                    {String(val)}
                                                </span>
                                            ) : isMonetario ? (
                                                <span className="font-medium tabular-nums">
                                                    {Number(val).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </span>
                                            ) : (
                                                <span className="text-foreground">{String(val ?? '—')}</span>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card shrink-0">
                <p className="text-xs text-muted-foreground">
                    {resultado.count} registro(s) · página {page} de {resultado.num_pages}
                </p>
                <div className="flex items-center gap-1">
                    <button
                        disabled={page <= 1}
                        onClick={() => onPage(page - 1)}
                        className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(resultado.num_pages, 5) }, (_, i) => {
                        const p = i + 1
                        return (
                            <button
                                key={p}
                                onClick={() => onPage(p)}
                                className={cn(
                                    'h-7 w-7 rounded-lg text-xs border transition-colors',
                                    page === p
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'border-border hover:bg-muted/50',
                                )}
                            >
                                {p}
                            </button>
                        )
                    })}
                    {resultado.num_pages > 5 && (
                        <span className="text-xs text-muted-foreground px-1">…{resultado.num_pages}</span>
                    )}
                    <button
                        disabled={page >= resultado.num_pages}
                        onClick={() => onPage(page + 1)}
                        className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50 transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Relatorios() {
    const [fonte, setFonte] = useState<Fonte>('receber')
    const [meta, setMeta] = useState<RelatorioMetadados | null>(null)
    const [metaLoading, setMetaLoading] = useState(true)

    // Campos selecionados
    const [camposSel, setCamposSel] = useState<string[]>([])

    // Filtros
    const [dataInicio, setDataInicio] = useState(primeiroMes())
    const [dataFim, setDataFim] = useState(hojeStr())
    const [dataField, setDataField] = useState('data_vencimento')
    const [statusFiltro, setStatusFiltro] = useState('')
    const [tipoFiltro, setTipoFiltro] = useState('')
    const [busca, setBusca] = useState('')

    // Ordenação
    const [ordenarPor, setOrdenarPor] = useState('data_vencimento')
    const [ordenarDir, setOrdenarDir] = useState<'asc' | 'desc'>('asc')

    // Preview
    const [page, setPage] = useState(1)
    const [resultado, setResultado] = useState<RelatorioResultado | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState<'excel' | 'csv' | null>(null)

    // ── Metadados ──────────────────────────────────────────────────────────
    useEffect(() => {
        setMetaLoading(true)
        getRelatorioMetadados()
            .then(m => {
                setMeta(m)
                setCamposSel(Object.keys(m.campos[fonte]))
            })
            .finally(() => setMetaLoading(false))
    }, [])

    // Ao trocar fonte, reinicia campos e filtros específicos de tipo
    function handleFonte(f: Fonte) {
        setFonte(f)
        if (meta) setCamposSel(Object.keys(meta.campos[f]))
        setTipoFiltro('')
        setOrdenarPor('data_vencimento')
        setPage(1)
        setResultado(null)
    }

    // ── Preview ────────────────────────────────────────────────────────────
    const buildParams = useCallback((): RelatorioParams => ({
        fonte,
        campos: camposSel,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        data_field: dataField,
        status: statusFiltro || undefined,
        tipo: tipoFiltro || undefined,
        busca: busca || undefined,
        ordenar_por: ordenarPor,
        ordenar_dir: ordenarDir,
        page,
    }), [fonte, camposSel, dataInicio, dataFim, dataField, statusFiltro, tipoFiltro, busca, ordenarPor, ordenarDir, page])

    function buscarPreview(p = page) {
        setLoading(true)
        setPage(p)
        getRelatorioPreview({ ...buildParams(), page: p })
            .then(setResultado)
            .finally(() => setLoading(false))
    }

    function handleSort(campo: string) {
        if (campo === ordenarPor) {
            setOrdenarDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setOrdenarPor(campo)
            setOrdenarDir('asc')
        }
    }

    // Re-busca ao mudar ordenação
    useEffect(() => {
        if (resultado) buscarPreview(1)
    }, [ordenarPor, ordenarDir])

    // ── Export ─────────────────────────────────────────────────────────────
    async function handleExport(formato: 'excel' | 'csv') {
        setExporting(formato)
        try {
            await exportarRelatorio(buildParams(), formato)
        } finally {
            setExporting(null)
        }
    }

    function limparFiltros() {
        setDataInicio(primeiroMes())
        setDataFim(hojeStr())
        setDataField('data_vencimento')
        setStatusFiltro('')
        setTipoFiltro('')
        setBusca('')
        setPage(1)
        setResultado(null)
    }

    // ─────────────────────────────────────────────────────────────────────────

    const camposDisponiveis = meta?.campos[fonte] ?? {}
    const tiposDisponiveis = meta?.tipos[fonte] ?? []
    const statusDisponiveis = meta?.status[fonte] ?? []
    const dataFieldsDisponiveis = meta?.data_fields[fonte] ?? []
    const camposInteiros = new Set<string>(meta?.campos_inteiros ?? [])

    const temFiltrosAtivos =
        statusFiltro || tipoFiltro || busca ||
        dataInicio !== primeiroMes() || dataFim !== hojeStr()

    return (
        <div className="pt-2 space-y-6">
            {/* Cabeçalho */}
            <div>
                <h1 className="text-2xl font-bold">Relatórios</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Consultas personalizadas com exportação em Excel ou CSV.
                </p>
            </div>

            {/* Seleção de fonte */}
            <div className="flex flex-wrap gap-3">
                <SourceTab fonte="receber" active={fonte === 'receber'} onClick={() => handleFonte('receber')} />
                <SourceTab fonte="pagar" active={fonte === 'pagar'} onClick={() => handleFonte('pagar')} />
            </div>

            {metaLoading ? (
                <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6">
                    <Skeleton className="h-96 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">

                    {/* ── Painel esquerdo: campos + filtros ── */}
                    <div className="space-y-4">

                        {/* Seletor de colunas */}
                        <Card>
                            <CardContent className="p-4">
                                <FieldSelector
                                    campos={camposDisponiveis}
                                    selected={camposSel}
                                    onChange={setCamposSel}
                                />
                            </CardContent>
                        </Card>

                        {/* Filtros */}
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                        <Filter className="h-3.5 w-3.5" /> Filtros
                                    </p>
                                    {temFiltrosAtivos && (
                                        <button
                                            onClick={limparFiltros}
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3 w-3" /> Limpar
                                        </button>
                                    )}
                                </div>

                                {/* Período */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Filtrar por data</label>
                                    <FilterSelect
                                        value={dataField}
                                        onChange={setDataField}
                                        defaultValue="data_vencimento"
                                        className="w-full"
                                    >
                                        {dataFieldsDisponiveis.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </FilterSelect>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">De</label>
                                        <input
                                            type="date"
                                            value={dataInicio}
                                            onChange={e => setDataInicio(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Até</label>
                                        <input
                                            type="date"
                                            value={dataFim}
                                            onChange={e => setDataFim(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                                        />
                                    </div>
                                </div>

                                {/* Situação */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Situação</label>
                                    <FilterSelect
                                        value={statusFiltro}
                                        onChange={setStatusFiltro}
                                        defaultValue=""
                                        className="w-full"
                                    >
                                        <option value="">Todas</option>
                                        {statusDisponiveis.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </FilterSelect>
                                </div>

                                {/* Tipo/Categoria */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">
                                        {fonte === 'receber' ? 'Categoria' : 'Tipo'}
                                    </label>
                                    <FilterSelect
                                        value={tipoFiltro}
                                        onChange={setTipoFiltro}
                                        defaultValue=""
                                        className="w-full"
                                    >
                                        <option value="">Todos</option>
                                        {tiposDisponiveis.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </FilterSelect>
                                </div>

                                {/* Busca */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">Descrição</label>
                                    <FilterInput
                                        value={busca}
                                        onChange={setBusca}
                                        placeholder="Buscar na descrição..."
                                        className="w-full"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ordenação */}
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <ArrowUpDown className="h-3.5 w-3.5" /> Ordenação
                                </p>
                                <FilterSelect
                                    value={ordenarPor}
                                    onChange={v => { setOrdenarPor(v); setOrdenarDir('asc') }}
                                    defaultValue="data_vencimento"
                                    className="w-full"
                                >
                                    {(meta?.ordenar_por[fonte] ?? []).map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </FilterSelect>
                                <div className="flex rounded-lg border border-border overflow-hidden w-full">
                                    {(['asc', 'desc'] as const).map(dir => (
                                        <button
                                            key={dir}
                                            onClick={() => setOrdenarDir(dir)}
                                            className={cn(
                                                'flex-1 py-1.5 text-xs font-medium transition-colors',
                                                dir === 'asc' ? '' : 'border-l border-border',
                                                ordenarDir === dir
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-muted/50',
                                            )}
                                        >
                                            {dir === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ações */}
                        <div className="space-y-2">
                            <button
                                onClick={() => buscarPreview(1)}
                                disabled={loading || camposSel.length === 0}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {loading
                                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Consultando...</>
                                    : <><RefreshCw className="h-4 w-4" /> Consultar</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* ── Painel direito: preview + export ── */}
                    <div className="space-y-3 min-w-0 overflow-hidden">

                        {/* Barra de export */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                {resultado && !loading && (
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">{resultado.count}</span> registro(s) encontrado(s)
                                        {resultado.count > resultado.page_size && (
                                            <span className="ml-1">(mostrando {resultado.page_size} por página)</span>
                                        )}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExport('excel')}
                                    disabled={!resultado || resultado.count === 0 || exporting !== null}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50 disabled:opacity-40 transition-colors"
                                >
                                    {exporting === 'excel'
                                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                                        : <Download className="h-4 w-4 text-emerald-600" />
                                    }
                                    Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => handleExport('csv')}
                                    disabled={!resultado || resultado.count === 0 || exporting !== null}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50 disabled:opacity-40 transition-colors"
                                >
                                    {exporting === 'csv'
                                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                                        : <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                                    }
                                    CSV (.csv)
                                </button>
                            </div>
                        </div>

                        {/* Preview table */}
                        <Card className="overflow-hidden w-full">
                            <CardContent className="p-0">
                                {!resultado && !loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                                        <FileSpreadsheet className="h-12 w-12 opacity-15" />
                                        <div className="text-center">
                                            <p className="text-sm font-medium">Nenhuma consulta realizada</p>
                                            <p className="text-xs mt-1">Configure os filtros e clique em <strong>Consultar</strong> para ver os dados.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <PreviewTable
                                        resultado={resultado}
                                        loading={loading}
                                        page={page}
                                        onPage={p => buscarPreview(p)}
                                        onSort={handleSort}
                                        ordenarPor={ordenarPor}
                                        ordenarDir={ordenarDir}
                                        camposInteiros={camposInteiros}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Nota sobre export */}
                        {resultado && resultado.count > 0 && (
                            <p className="text-xs text-muted-foreground">
                                A exportação inclui <strong>todos os {resultado.count} registro(s)</strong> que correspondem aos filtros, independente da página atual.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
