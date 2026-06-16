import { useEffect, useState, useMemo } from 'react'
import { Plus, FileUp, Pencil, Trash2, TrendingUp, AlertCircle, Layers, ListChecks } from 'lucide-react'
import { TablePagination } from '@/components/ui/pagination'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ReceitaFormModal } from '@/components/financeiro/ReceitaFormModal'
import { TitulosRelacionadosModal } from '@/components/financeiro/TitulosRelacionadosModal'
import {
  getReceitas, createReceita, updateReceita, deleteReceita, faturarReceita, faturarReceitasAgrupadas,
  type ReceitaInput, type Parcela,
} from '@/services/receitasService'
import {
  type Receita, type ReceitaTipo, type ReceitaStatus,
  RECEITA_TIPO_LABELS, RECEITA_STATUS_LABELS, ALL_RECEITA_TIPOS,
} from '@/mocks/financeiroOrigem'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
const todayStr = () => new Date().toISOString().split('T')[0]
function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().split('T')[0]
}

const hoje = new Date().toISOString().split('T')[0]
function isAtrasada(r: Receita) {
  return r.status === 'pendente' && r.data_vencimento < hoje
}

type TipoFilter = 'all' | ReceitaTipo

const TIPO_COLORS: Record<ReceitaTipo, string> = {
  mensalidade: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  voo: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  horas_pre_pagas: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  servico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  outros: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

function PagamentoBadge({ info }: { info: Receita['titulos_info'] }) {
  if (!info) return null
  if (info.todos_pagos) return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      Pago
    </span>
  )
  if (info.parcialmente_pago) return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Parcial
    </span>
  )
  return null
}

interface TableProps {
  items: Receita[]
  selected: Set<string>
  onToggle: (id: string) => void
  onView: (r: Receita) => void
  onFaturar: (r: Receita) => void
  onVerTitulos: (r: Receita) => void
  emptyMessage: string
}

function ReceitasTable({ items, selected, onToggle, onView, onFaturar, onVerTitulos, emptyMessage }: TableProps) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia><TrendingUp className="h-10 w-10 text-muted-foreground opacity-30" /></EmptyMedia>
          <EmptyTitle>{emptyMessage}</EmptyTitle>
          <EmptyDescription>Tente ajustar os filtros ou registre uma nova receita</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 w-10">
                <span className="sr-only">Selecionar</span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Devedor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Vencimento</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(r => (
              <tr key={r.id} className={cn('border-b last:border-0 hover:bg-muted/20 transition-colors', selected.has(r.id) && 'bg-primary/5')}>
                <td className="px-4 py-3">
                  {r.status === 'pendente' && (
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      checked={selected.has(r.id)}
                      onChange={() => onToggle(r.id)}
                    />
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-medium">{r.devedor_nome}</td>
                <td className="px-4 py-3 max-w-[240px] truncate">{r.descricao}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TIPO_COLORS[r.tipo])}>
                    {RECEITA_TIPO_LABELS[r.tipo]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(r.valor)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.data_vencimento)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {isAtrasada(r) && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        Atrasado
                      </span>
                    )}
                    <PagamentoBadge info={r.titulos_info} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1">
                    {r.status === 'pendente' && (
                      <Button size="sm" variant="outline" onClick={() => onFaturar(r)} title="Gerar título a receber">
                        <FileUp className="h-3.5 w-3.5" />
                        Faturar
                      </Button>
                    )}
                    {r.titulos_resumo.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => onVerTitulos(r)} title="Ver títulos relacionados">
                        <ListChecks className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onView(r)} title="Detalhes / editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </>
  )
}

// ── Modal de faturamento (simples ou parcelado) ────────────────────────────────

interface FaturarModalProps {
  receita: Receita | null
  open: boolean
  onClose: () => void
  onConfirm: (parcelas?: Parcela[]) => Promise<void>
}

function FaturarModal({ receita, open, onClose, onConfirm }: FaturarModalProps) {
  const [modo, setModo] = useState<'simples' | 'parcelado'>('simples')
  const [numParcelas, setNumParcelas] = useState(2)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !receita) return
    setModo('simples')
    setNumParcelas(2)
    gerarParcelasIguais(2, receita.valor, receita.data_vencimento)
  }, [open, receita])

  function gerarParcelasIguais(n: number, total: number, dataBase: string) {
    const valorParcela = parseFloat((total / n).toFixed(2))
    const diff = parseFloat((total - valorParcela * n).toFixed(2))
    const novas: Parcela[] = Array.from({ length: n }, (_, i) => ({
      valor: i === 0 ? valorParcela + diff : valorParcela,
      data_vencimento: addMonths(dataBase, i),
    }))
    setParcelas(novas)
  }

  function handleNumParcelasChange(n: number) {
    setNumParcelas(n)
    if (receita) gerarParcelasIguais(n, receita.valor, receita.data_vencimento)
  }

  function updateParcela(i: number, field: keyof Parcela, value: string) {
    setParcelas(prev => prev.map((p, idx) =>
      idx === i ? { ...p, [field]: field === 'valor' ? parseFloat(value) || 0 : value } : p,
    ))
  }

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0)
  const diff = receita ? Math.abs(totalParcelas - receita.valor) > 0.01 : false

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm(modo === 'parcelado' ? parcelas : undefined)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!receita) return null
  const selectCls = 'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Faturar Receita</DialogTitle>
          <DialogDescription>{receita.descricao} — {fmt(receita.valor)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Modo</label>
            <select className={selectCls} value={modo} onChange={e => setModo(e.target.value as 'simples' | 'parcelado')}>
              <option value="simples">Título único</option>
              <option value="parcelado">Parcelado</option>
            </select>
          </div>
          {modo === 'parcelado' && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Número de parcelas</label>
                <select className={selectCls} value={numParcelas} onChange={e => handleNumParcelasChange(parseInt(e.target.value))}>
                  {[2,3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parcelas</label>
                {parcelas.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr] gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Parcela {i + 1}</label>
                      <Input
                        type="number" step={0.01} min={0}
                        value={p.valor || ''}
                        onChange={e => updateParcela(i, 'valor', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Vencimento</label>
                      <input
                        type="date"
                        className={selectCls}
                        value={p.data_vencimento}
                        onChange={e => updateParcela(i, 'data_vencimento', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                {diff && (
                  <p className="text-xs text-destructive">
                    Soma ({fmt(totalParcelas)}) ≠ valor da receita ({fmt(receita.valor)})
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || (modo === 'parcelado' && diff)}>
            {saving ? 'Faturando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal de agrupamento ──────────────────────────────────────────────────────

// Identidade do devedor de uma receita (usuário OU cliente). Receitas só podem ser
// agrupadas num título se compartilharem o mesmo devedor.
function devedorKey(r: Receita): string {
  if (r.participante_id) return `u:${r.participante_id}`
  if (r.cliente_id) return `c:${r.cliente_id}`
  return 'none'
}

// Extrai a mensagem de erro do backend (o client lança Error(JSON.stringify(err))).
function msgErro(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  try {
    const o = JSON.parse(raw)
    if (o && typeof o === 'object') {
      if (typeof o.detail === 'string') return o.detail
      const first = Object.values(o)[0]
      if (Array.isArray(first)) return String(first[0])
      if (typeof first === 'string') return first
    }
  } catch {
    /* não era JSON */
  }
  return raw
}

interface AgrupamentoModalProps {
  receitas: Receita[]
  open: boolean
  onClose: () => void
  onConfirm: (data_vencimento?: string) => Promise<void>
}

function AgrupamentoModal({ receitas, open, onClose, onConfirm }: AgrupamentoModalProps) {
  const [dataVenc, setDataVenc] = useState(todayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const total = receitas.reduce((s, r) => s + r.valor, 0)

  useEffect(() => {
    if (open && receitas.length > 0) {
      const maxDate = receitas.map(r => r.data_vencimento).sort().at(-1) ?? todayStr()
      setDataVenc(maxDate)
      setError('')
    }
  }, [open, receitas])

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await onConfirm(dataVenc)
      onClose()
    } catch (e) {
      setError(msgErro(e) || 'Não foi possível agrupar as receitas.')
    } finally {
      setSaving(false)
    }
  }

  const selectCls = 'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Faturar em Conjunto</DialogTitle>
          <DialogDescription>
            {receitas.length} receitas do mesmo devedor serão agrupadas num único título a receber.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="rounded-lg border border-border divide-y divide-border max-h-44 overflow-y-auto">
            {receitas.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground truncate pr-4">{r.descricao}</span>
                <span className="font-medium whitespace-nowrap">{fmt(r.valor)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data de vencimento</label>
            <input type="date" className={selectCls} value={dataVenc} onChange={e => setDataVenc(e.target.value)} />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || !dataVenc}>
            {saving ? 'Faturando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Receitas() {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editReceita, setEditReceita] = useState<Receita | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Receita | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [faturarTarget, setFaturarTarget] = useState<Receita | null>(null)
  const [agrupamentoOpen, setAgrupamentoOpen] = useState(false)
  const [titulosTarget, setTitulosTarget] = useState<Receita | null>(null)

  useEffect(() => {
    getReceitas().then(setReceitas).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return receitas.filter(r => {
      const matchSearch = !q || r.devedor_nome.toLowerCase().includes(q) || r.descricao.toLowerCase().includes(q)
      const matchTipo = tipoFilter === 'all' || r.tipo === tipoFilter
      return matchSearch && matchTipo
    })
  }, [receitas, search, tipoFilter])

  const byStatus = (s: ReceitaStatus) => filtered.filter(r => r.status === s)

  function openCreate() { setEditReceita(null); setModalOpen(true) }
  function openEdit(r: Receita) { setEditReceita(r); setModalOpen(true) }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      // Ao adicionar, garante que toda a seleção seja do MESMO devedor.
      // Se o devedor for diferente do que já está selecionado, recomeça a seleção
      // com esta receita (um título a receber tem um único devedor).
      const alvo = receitas.find(r => r.id === id)
      if (alvo && next.size > 0) {
        const algumSelecionado = receitas.find(r => next.has(r.id))
        if (algumSelecionado && devedorKey(alvo) !== devedorKey(algumSelecionado)) {
          return new Set([id])
        }
      }
      next.add(id)
      return next
    })
  }

  async function handleSave(data: ReceitaInput) {
    if (editReceita) {
      const updated = await updateReceita(editReceita.id, data)
      setReceitas(prev => prev.map(r => (r.id === editReceita.id ? updated : r)))
    } else {
      const created = await createReceita(data)
      setReceitas(prev => [created, ...prev])
    }
  }

  async function handleFaturarConfirm(parcelas?: Parcela[]) {
    if (!faturarTarget) return
    const updated = await faturarReceita(faturarTarget.id, parcelas)
    setReceitas(prev => prev.map(x => (x.id === faturarTarget.id ? updated : x)))
  }

  async function handleAgrupamentoConfirm(data_vencimento?: string) {
    const ids = [...selected]
    // Erros (ex.: 400 de devedores diferentes) são propagados para o modal exibir.
    await faturarReceitasAgrupadas(ids, data_vencimento)
    const refreshed = await getReceitas()
    setReceitas(refreshed)
    setSelected(new Set())
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteReceita(deleteTarget.id)
      setReceitas(prev => prev.filter(r => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const selectedReceitas = receitas.filter(r => selected.has(r.id))

  const tabConfig: { value: ReceitaStatus; label: string; items: Receita[]; badge: string }[] = [
    { value: 'pendente', label: 'Pendentes', items: byStatus('pendente'), badge: 'bg-amber-100 text-amber-700' },
    { value: 'faturada', label: 'Faturadas', items: byStatus('faturada'), badge: 'bg-blue-100 text-blue-700' },
    { value: 'quitada', label: 'Quitadas', items: byStatus('quitada'), badge: 'bg-emerald-100 text-emerald-700' },
  ]

  const hasNoData = !loading && receitas.length === 0

  return (
    <div className={cn("pt-2 flex flex-col gap-6", hasNoData && "flex-1")}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Origens de valores a receber. Fature uma receita para gerar o título de cobrança.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <FilterInput value={search} onChange={setSearch} placeholder="Buscar por devedor ou descrição..." />
        <FilterSelect value={tipoFilter} onChange={v => setTipoFilter(v as TipoFilter)}>
          <option value="all">Todos os tipos</option>
          {ALL_RECEITA_TIPOS.map(t => (
            <option key={t} value={t}>{RECEITA_TIPO_LABELS[t]}</option>
          ))}
        </FilterSelect>
        <Button onClick={openCreate} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Nova Receita
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="pendente" className="flex-1">
          <div className="flex items-center justify-between">
            <TabsList>
              {tabConfig.map(t => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                  {t.items.length > 0 && (
                    <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium', t.badge)}>{t.items.length}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {selected.size >= 2 && (
              <Button variant="outline" size="lg" onClick={() => setAgrupamentoOpen(true)}>
                <Layers className="h-4 w-4" />
                Faturar em conjunto ({selected.size})
              </Button>
            )}
          </div>
          {tabConfig.map(t => (
            <TabsContent key={t.value} value={t.value}>
              <Card className={cn("flex flex-col", hasNoData && "flex-1")}>
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.items.length} receita{t.items.length !== 1 ? 's' : ''} {RECEITA_STATUS_LABELS[t.value].toLowerCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className={cn("p-0 flex flex-col", hasNoData && "flex-1")}>
                  <ReceitasTable
                    items={t.items}
                    selected={selected}
                    onToggle={toggleSelect}
                    onView={openEdit}
                    onFaturar={r => setFaturarTarget(r)}
                    onVerTitulos={r => setTitulosTarget(r)}
                    emptyMessage={`Nenhuma receita ${RECEITA_STATUS_LABELS[t.value].toLowerCase()}`}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <ReceitaFormModal
        receita={editReceita}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editReceita ? () => { setModalOpen(false); setDeleteTarget(editReceita) } : undefined}
      />

      <FaturarModal
        receita={faturarTarget}
        open={!!faturarTarget}
        onClose={() => setFaturarTarget(null)}
        onConfirm={handleFaturarConfirm}
      />

      <AgrupamentoModal
        receitas={selectedReceitas}
        open={agrupamentoOpen}
        onClose={() => setAgrupamentoOpen(false)}
        onConfirm={handleAgrupamentoConfirm}
      />

      <TitulosRelacionadosModal
        open={!!titulosTarget}
        onClose={() => setTitulosTarget(null)}
        titulo={`Títulos — ${titulosTarget?.descricao ?? ''}`}
        descricao={titulosTarget ? `${titulosTarget.titulos_resumo.length} título(s) a receber` : undefined}
        titulos={titulosTarget?.titulos_resumo ?? []}
      />

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir receita</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a receita "{deleteTarget?.descricao}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
