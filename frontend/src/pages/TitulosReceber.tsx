import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Search, Plus, Pencil, CircleDollarSign, CircleAlert } from 'lucide-react'
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
  TituloReceberFormModal,
  type TituloReceberFormData,
} from '@/components/titulos/TituloReceberFormModal'
import {
  getTitulosReceber,
  createTituloReceber,
  updateTituloReceber,
  deleteTituloReceber,
  baixarTituloReceber,
  type TituloReceber,
} from '@/services/titulosReceberService'
import { TITULO_RECEBER_TIPO_LABELS, type TituloReceberTipo } from '@/mocks/titulos'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
const todayStr = () => new Date().toISOString().split('T')[0]
const isAtrasado = (t: TituloReceber) =>
  t.status !== 'baixado' && new Date(t.data_vencimento + 'T00:00:00') < new Date()

type TipoFilter = 'all' | TituloReceberTipo

const TIPO_COLORS: Record<TituloReceberTipo, string> = {
  mensalidade: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  pontual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  servico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  voo: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
}

function TipoBadge({ tipo }: { tipo: TituloReceberTipo }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TIPO_COLORS[tipo])}>
      {TITULO_RECEBER_TIPO_LABELS[tipo]}
    </span>
  )
}

const inputCls =
  'h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

// ─── Table ────────────────────────────────────────────────────────────────────

interface TableProps {
  items: TituloReceber[]
  showBaixa: boolean
  onBaixa: (t: TituloReceber) => void
  onEdit: (t: TituloReceber) => void
  emptyMessage: string
}

function TitulosTable({ items, showBaixa, onBaixa, onEdit, emptyMessage }: TableProps) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
        <CircleDollarSign className="h-10 w-10 mb-3 opacity-30" />
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
                Devedor
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
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map(t => (
            <tr key={t.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium">{t.usuario_nome}</p>
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
                    <p className="text-xs text-emerald-600">Recebido em {fmtDate(t.data_pagamento)}</p>
                  </div>
                ) : (
                  <p className={cn('text-muted-foreground', isAtrasado(t) && 'text-rose-500 font-medium')}>
                    {fmtDate(t.data_vencimento)}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="font-medium">{fmt(t.valor)}</p>
                {t.status === 'pago_parcial' && (
                  <p className="text-xs text-muted-foreground">
                    Pago: {fmt(t.valor_pago)}
                  </p>
                )}
                {t.juros_aplicado > 0 && (
                  <p className="text-xs text-rose-500">+{fmt(t.juros_aplicado)} juros</p>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(t)}
                    title="Editar título"
                  >
                    <Pencil className="h-3.5 w-3.5" />
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

export default function TitulosReceber() {
  const [titulos, setTitulos] = useState<TituloReceber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all')

  const [editTitulo, setEditTitulo] = useState<TituloReceber | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TituloReceber | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [baixaTarget, setBaixaTarget] = useState<TituloReceber | null>(null)
  const [baixaValor, setBaixaValor] = useState('')
  const [baixaData, setBaixaData] = useState('')
  const [baixando, setBaixando] = useState(false)

  useEffect(() => {
    getTitulosReceber().then(data => {
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
          t.usuario_nome.toLowerCase().includes(q) ||
          t.descricao.toLowerCase().includes(q)
        const matchTipo = tipoFilter === 'all' || t.tipo === tipoFilter
        return matchSearch && matchTipo
      })
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  }, [titulos, search, tipoFilter])

  const emAbertoList = filtered.filter(
    t => (t.status === 'em_aberto' || t.status === 'pago_parcial') && !isAtrasado(t),
  )
  const emAtrasoList = filtered.filter(t => isAtrasado(t))
  const baixadoList = filtered.filter(t => t.status === 'baixado')

  async function handleSave(data: TituloReceberFormData): Promise<void> {
    if (editTitulo) {
      const updated = await updateTituloReceber(editTitulo.id, {
        usuario_nome: data.usuario_nome,
        tipo: data.tipo,
        descricao: data.descricao,
        num_parcela: editTitulo.num_parcela,
        total_parcelas: editTitulo.total_parcelas,
        valor: data.valor,
        juros_aplicado: data.juros_aplicado,
        data_emissao: data.data_emissao,
        data_vencimento: data.parcela_vencimentos[0],
      })
      setTitulos(prev => prev.map(t => (t.id === editTitulo.id ? updated : t)))
    } else {
      const created = await Promise.all(
        data.parcela_vencimentos.map((venc, i) =>
          createTituloReceber({
            usuario_nome: data.usuario_nome,
            tipo: data.tipo,
            descricao: data.descricao,
            num_parcela: i + 1,
            total_parcelas: data.total_parcelas,
            valor: data.valor,
            valor_pago: 0,
            juros_aplicado: data.juros_aplicado,
            data_emissao: data.data_emissao,
            data_vencimento: venc,
            data_pagamento: null,
            status: 'em_aberto',
          }),
        ),
      )
      setTitulos(prev => [...prev, ...created])
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteTituloReceber(deleteTarget.id)
    setTitulos(prev => prev.filter(t => t.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function openCreate() {
    setEditTitulo(null)
    setModalOpen(true)
  }

  function openEdit(t: TituloReceber) {
    setEditTitulo(t)
    setModalOpen(true)
  }

  function handleDeleteRequest() {
    setModalOpen(false)
    setDeleteTarget(editTitulo)
  }

  function openBaixa(t: TituloReceber) {
    const restante = t.valor + t.juros_aplicado - t.valor_pago
    setBaixaTarget(t)
    setBaixaValor(restante.toFixed(2))
    setBaixaData(todayStr())
  }

  async function handleBaixa() {
    if (!baixaTarget) return
    setBaixando(true)
    const updated = await baixarTituloReceber(
      baixaTarget.id,
      parseFloat(baixaValor),
      baixaData,
    )
    setTitulos(prev => prev.map(t => (t.id === baixaTarget.id ? updated : t)))
    setBaixaTarget(null)
    setBaixando(false)
  }

  const restanteBaixa = baixaTarget
    ? baixaTarget.valor + baixaTarget.juros_aplicado - baixaTarget.valor_pago
    : 0

  return (
    <div className="pt-2 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Títulos a Receber</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie os títulos a receber do aeroclube
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            className={cn(inputCls, 'w-full pl-8 pr-3')}
            placeholder="Buscar por devedor ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={inputCls}
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value as TipoFilter)}
        >
          <option value="all">Todos os tipos</option>
          <option value="mensalidade">Mensalidade</option>
          <option value="pontual">Pontual</option>
          <option value="servico">Serviço</option>
          <option value="voo">Voo</option>
        </select>
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
                  onBaixa={openBaixa}
                  onEdit={openEdit}
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
                  onBaixa={openBaixa}
                  onEdit={openEdit}
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
                  onBaixa={openBaixa}
                  onEdit={openEdit}
                  emptyMessage="Nenhum título baixado"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Create / Edit Modal */}
      <TituloReceberFormModal
        titulo={editTitulo}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editTitulo ? handleDeleteRequest : undefined}
      />

      {/* Baixa Dialog */}
      <Dialog open={!!baixaTarget} onOpenChange={o => !o && setBaixaTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
            <DialogDescription>
              <strong className="text-foreground">{baixaTarget?.usuario_nome}</strong>
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
              {baixaTarget && baixaTarget.juros_aplicado > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Juros</span>
                  <span className="text-rose-500">+{fmt(baixaTarget.juros_aplicado)}</span>
                </div>
              )}
              {baixaTarget && baixaTarget.valor_pago > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Já recebido</span>
                  <span className="text-emerald-600">−{fmt(baixaTarget.valor_pago)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 mt-1">
                <span className="text-muted-foreground font-medium">Saldo restante</span>
                <span className="font-semibold">{fmt(restanteBaixa)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor a receber (R$)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                value={baixaValor}
                onChange={e => setBaixaValor(e.target.value)}
              />
              {parseFloat(baixaValor) > 0 && parseFloat(baixaValor) < restanteBaixa && (
                <p className="text-xs text-muted-foreground">
                  Baixa parcial — saldo de {fmt(restanteBaixa - parseFloat(baixaValor))} permanecerá em aberto
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data de recebimento</label>
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
            <Button
              onClick={handleBaixa}
              disabled={baixando || !baixaValor || !baixaData || parseFloat(baixaValor) <= 0}
            >
              {baixando ? 'Registrando...' : 'Confirmar Recebimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o título de{' '}
              <strong className="text-foreground">{deleteTarget?.usuario_nome}</strong>? Esta ação
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
