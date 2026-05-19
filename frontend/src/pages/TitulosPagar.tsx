import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Eye, ArrowDownToLine, CircleAlert, CircleDollarSign } from 'lucide-react'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  TituloPagarFormModal,
  type TituloPagarFormData,
} from '@/components/titulos/TituloPagarFormModal'
import { TituloPagarDetailModal } from '@/components/titulos/TituloPagarDetailModal'
import {
  getTitulosPagar,
  createTituloPagar,
  updateTituloPagar,
  deleteTituloPagar,
  baixarTituloPagar,
  type TituloPagar,
} from '@/services/titulosPagarService'
import { TITULO_PAGAR_TIPO_LABELS, type TituloPagarTipo } from '@/mocks/titulos'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
const todayStr = () => new Date().toISOString().split('T')[0]
const isAtrasado = (t: TituloPagar) =>
  t.status === 'em_aberto' && new Date(t.data_vencimento + 'T00:00:00') < new Date()

type TipoFilter = 'all' | TituloPagarTipo

const TIPO_COLORS: Record<TituloPagarTipo, string> = {
  fornecedor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  folha: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  conta_fixa: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  outros: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function TipoBadge({ tipo }: { tipo: TituloPagarTipo }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TIPO_COLORS[tipo])}>
      {TITULO_PAGAR_TIPO_LABELS[tipo]}
    </span>
  )
}

const inputCls =
  'h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

// ─── Table ────────────────────────────────────────────────────────────────────

interface TableProps {
  items: TituloPagar[]
  showBaixa: boolean
  showMulta: boolean
  onBaixa: (t: TituloPagar) => void
  onView: (t: TituloPagar) => void
  emptyMessage: string
}

function TitulosTable({ items, showBaixa, showMulta, onBaixa, onView, emptyMessage }: TableProps) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
        <ArrowDownToLine className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Favorecido
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                Tipo
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                Descrição
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                Parcela
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Vencimento
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Valor
              </th>
              {showMulta && (
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                  Multa
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map(t => (
            <tr key={t.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">{t.favorecido}</p>
                  {t.recorrente && (
                    <p className="text-xs text-muted-foreground">Recorrente</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <TipoBadge tipo={t.tipo} />
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px]">
                <p className="truncate">{t.descricao}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                {t.num_parcela}/{t.total_parcelas}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {t.status === 'baixado' && t.data_pagamento ? (
                  <div>
                    <p className="text-muted-foreground">{fmtDate(t.data_vencimento)}</p>
                    <p className="text-xs text-emerald-600">Pago em {fmtDate(t.data_pagamento)}</p>
                  </div>
                ) : (
                  <p className={cn('text-muted-foreground', isAtrasado(t) && 'text-rose-500 font-medium')}>
                    {fmtDate(t.data_vencimento)}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 font-medium whitespace-nowrap">
                {fmt(t.valor)}
              </td>
              {showMulta && (
                <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                  {t.multa > 0
                    ? <span className="text-rose-500 font-medium">{fmt(t.multa)}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onView(t)}
                    title="Ver detalhes"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {showBaixa && (
                    <Button size="sm" onClick={() => onBaixa(t)}>
                      Dar baixa
                      <CircleDollarSign className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TitulosPagar() {
  const [titulos, setTitulos] = useState<TituloPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all')

  const [editTitulo, setEditTitulo] = useState<TituloPagar | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TituloPagar | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [baixaTarget, setBaixaTarget] = useState<TituloPagar | null>(null)
  const [baixaMulta, setBaixaMulta] = useState('0')
  const [baixaData, setBaixaData] = useState('')
  const [baixando, setBaixando] = useState(false)

  const [viewTitulo, setViewTitulo] = useState<TituloPagar | null>(null)

  useEffect(() => {
    getTitulosPagar().then(data => {
      setTitulos(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return titulos
      .filter(t => {
        const matchSearch =
          !q ||
          t.favorecido.toLowerCase().includes(q) ||
          t.descricao.toLowerCase().includes(q)
        const matchTipo = tipoFilter === 'all' || t.tipo === tipoFilter
        return matchSearch && matchTipo
      })
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  }, [titulos, search, tipoFilter])

  const emAbertoList = filtered.filter(t => t.status === 'em_aberto' && !isAtrasado(t))
  const emAtrasoList = filtered.filter(t => isAtrasado(t))
  const baixadoList = filtered.filter(t => t.status === 'baixado')

  async function handleSave(data: TituloPagarFormData): Promise<void> {
    if (editTitulo) {
      const updated = await updateTituloPagar(editTitulo.id, {
        tipo: data.tipo,
        favorecido: data.favorecido,
        descricao: data.descricao,
        num_parcela: editTitulo.num_parcela,
        total_parcelas: editTitulo.total_parcelas,
        valor: data.valor,
        multa: data.multa,
        data_emissao: data.data_emissao,
        data_vencimento: data.parcela_vencimentos[0],
        recorrente: data.recorrente,
      })
      setTitulos(prev => prev.map(t => (t.id === editTitulo.id ? updated : t)))
    } else {
      const created = await Promise.all(
        data.parcela_vencimentos.map((venc, i) =>
          createTituloPagar({
            tipo: data.tipo,
            favorecido: data.favorecido,
            descricao: data.descricao,
            num_parcela: i + 1,
            total_parcelas: data.total_parcelas,
            valor: data.recorrente ? (data.parcela_valores[i] ?? data.valor) : data.valor,
            multa: 0,
            data_emissao: data.data_emissao,
            data_vencimento: venc,
            status: 'em_aberto',
            valor_pago: null,
            data_pagamento: null,
            recorrente: data.recorrente,
          }),
        ),
      )
      setTitulos(prev => [...prev, ...created])
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteTituloPagar(deleteTarget.id)
    setTitulos(prev => prev.filter(t => t.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function openCreate() {
    setEditTitulo(null)
    setModalOpen(true)
  }

  function openEdit(t: TituloPagar) {
    setEditTitulo(t)
    setModalOpen(true)
  }

  function handleDeleteRequest() {
    setModalOpen(false)
    setDeleteTarget(editTitulo)
  }

  function openBaixa(t: TituloPagar) {
    setBaixaTarget(t)
    setBaixaMulta((t.multa ?? 0).toFixed(2))
    setBaixaData(todayStr())
  }

  function openView(t: TituloPagar) {
    setViewTitulo(t)
  }

  function handleViewEdit(t: TituloPagar) {
    setViewTitulo(null)
    openEdit(t)
  }

  function handleViewBaixa(t: TituloPagar) {
    setViewTitulo(null)
    openBaixa(t)
  }

  function handleViewDeleteRequest(t: TituloPagar) {
    setViewTitulo(null)
    setDeleteTarget(t)
  }

  async function handleBaixa() {
    if (!baixaTarget) return
    setBaixando(true)
    const multa = parseFloat(baixaMulta) || 0
    const valorPago = baixaTarget.valor + multa
    const updated = await baixarTituloPagar(baixaTarget.id, valorPago, baixaData, multa)
    setTitulos(prev => prev.map(t => (t.id === baixaTarget.id ? updated : t)))
    setBaixaTarget(null)
    setBaixando(false)
  }

  return (
    <div className="pt-2 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Títulos a Pagar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie os títulos a pagar do aeroclube
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <FilterInput
          size="sm"
          value={search}
          onChange={setSearch}
          placeholder="Buscar por favorecido ou descrição..."
        />
        <FilterSelect
          size="sm"
          value={tipoFilter}
          onChange={v => setTipoFilter(v as TipoFilter)}
        >
          <option value="all">Todos os tipos</option>
          <option value="fornecedor">Fornecedor</option>
          <option value="folha">Folha de Pagamento</option>
          <option value="conta_fixa">Conta Fixa</option>
          <option value="outros">Outros</option>
        </FilterSelect>
        <Button onClick={openCreate} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Novo Título
        </Button>
      </div>

      {/* Tabs + Tables */}
      {loading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="em_aberto">
          <TabsList>
            <TabsTrigger value="em_aberto">
              Em aberto
              {emAbertoList.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-xs font-medium">
                  {emAbertoList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="em_atraso">
              <CircleAlert className="h-3.5 w-3.5" />
              Em atraso
              {emAtrasoList.length > 0 && (
                <span className="ml-1 rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.5 text-xs font-medium">
                  {emAtrasoList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="baixado">
              Baixados
              {baixadoList.length > 0 && (
                <span className="ml-1.5 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-xs font-medium">
                  {baixadoList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="em_aberto">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {emAbertoList.length} título{emAbertoList.length !== 1 ? 's' : ''} em aberto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TitulosTable
                  items={emAbertoList}
                  showBaixa
                  showMulta={false}
                  onBaixa={openBaixa}
                  onView={openView}
                  emptyMessage="Nenhum título em aberto"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="em_atraso">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {emAtrasoList.length} título{emAtrasoList.length !== 1 ? 's' : ''} em atraso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TitulosTable
                  items={emAtrasoList}
                  showBaixa
                  showMulta
                  onBaixa={openBaixa}
                  onView={openView}
                  emptyMessage="Nenhum título em atraso"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="baixado">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {baixadoList.length} título{baixadoList.length !== 1 ? 's' : ''} baixado{baixadoList.length !== 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TitulosTable
                  items={baixadoList}
                  showBaixa={false}
                  showMulta
                  onBaixa={openBaixa}
                  onView={openView}
                  emptyMessage="Nenhum título baixado"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Create / Edit Modal */}
      <TituloPagarFormModal
        titulo={editTitulo}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editTitulo ? handleDeleteRequest : undefined}
      />

      {/* Detail Modal */}
      <TituloPagarDetailModal
        titulo={viewTitulo}
        allTitulos={titulos}
        open={!!viewTitulo}
        onClose={() => setViewTitulo(null)}
        onEdit={handleViewEdit}
        onBaixa={handleViewBaixa}
        onDeleteRequest={handleViewDeleteRequest}
      />

      {/* Baixa Dialog */}
      {(() => {
        const atrasado = !!baixaTarget && isAtrasado(baixaTarget)
        const multa = parseFloat(baixaMulta) || 0
        const totalAPagar = (baixaTarget?.valor ?? 0) + multa
        return (
          <Dialog open={!!baixaTarget} onOpenChange={o => !o && setBaixaTarget(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Dar baixa no título</DialogTitle>
                <DialogDescription>
                  <strong className="text-foreground">{baixaTarget?.favorecido}</strong>
                  {' — '}
                  {baixaTarget?.descricao}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor original</span>
                    <span className="font-medium">{baixaTarget && fmt(baixaTarget.valor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span className={atrasado ? 'text-rose-500 font-medium' : ''}>
                      {baixaTarget && fmtDate(baixaTarget.data_vencimento)}
                    </span>
                  </div>
                  {atrasado && multa > 0 && (
                    <div className="flex justify-between pt-1 border-t border-border">
                      <span className="text-muted-foreground">Total c/ multa</span>
                      <span className="font-medium">{fmt(totalAPagar)}</span>
                    </div>
                  )}
                </div>

                {atrasado && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Multa (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                      value={baixaMulta}
                      onChange={e => setBaixaMulta(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Valor a pagar (R$)</label>
                  <div className="h-10 flex items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm font-medium">
                    {fmt(totalAPagar)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data de pagamento</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                    value={baixaData}
                    onChange={e => setBaixaData(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBaixaTarget(null)} disabled={baixando}>
                  Cancelar
                </Button>
                <Button onClick={handleBaixa} disabled={baixando || !baixaData}>
                  {baixando ? 'Baixando...' : 'Confirmar Baixa'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o título de{' '}
              <strong className="text-foreground">{deleteTarget?.favorecido}</strong>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
