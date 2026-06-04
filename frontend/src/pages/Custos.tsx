import { useEffect, useState, useMemo } from 'react'
import { Plus, FileUp, Pencil, Trash2, TrendingDown } from 'lucide-react'
import { TablePagination } from '@/components/ui/pagination'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { CustoFormModal } from '@/components/financeiro/CustoFormModal'
import {
  getCustos, createCusto, updateCusto, deleteCusto, faturarCusto, type CustoInput,
} from '@/services/custosService'
import {
  type Custo, type CustoTipo, type CustoStatus,
  CUSTO_TIPO_LABELS, CUSTO_STATUS_LABELS, ALL_CUSTO_TIPOS,
} from '@/mocks/financeiroOrigem'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

type TipoFilter = 'all' | CustoTipo

const TIPO_COLORS: Record<CustoTipo, string> = {
  fornecedor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  folha_pagamento: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  conta_fixa: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  outros: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
}

interface TableProps {
  items: Custo[]
  onView: (c: Custo) => void
  onFaturar: (c: Custo) => void
  emptyMessage: string
}

function CustosTable({ items, onView, onFaturar, emptyMessage }: TableProps) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
        <TrendingDown className="h-10 w-10 mb-3 opacity-30" />
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Favorecido</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Vencimento</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(c => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-medium">{c.favorecido_nome}</td>
                <td className="px-4 py-3 max-w-[280px] truncate">{c.descricao}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TIPO_COLORS[c.tipo])}>
                    {CUSTO_TIPO_LABELS[c.tipo]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(c.valor)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(c.data_vencimento)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1">
                    {c.status === 'pendente' && (
                      <Button size="sm" variant="outline" onClick={() => onFaturar(c)} title="Gerar título a pagar">
                        <FileUp className="h-3.5 w-3.5" />
                        Faturar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onView(c)} title="Detalhes / editar">
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

export default function Custos() {
  const [custos, setCustos] = useState<Custo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editCusto, setEditCusto] = useState<Custo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Custo | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getCustos().then(setCustos).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return custos.filter(c => {
      const matchSearch = !q || c.favorecido_nome.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q)
      const matchTipo = tipoFilter === 'all' || c.tipo === tipoFilter
      return matchSearch && matchTipo
    })
  }, [custos, search, tipoFilter])

  const byStatus = (s: CustoStatus) => filtered.filter(c => c.status === s)

  function openCreate() { setEditCusto(null); setModalOpen(true) }
  function openEdit(c: Custo) { setEditCusto(c); setModalOpen(true) }

  async function handleSave(data: CustoInput) {
    if (editCusto) {
      const updated = await updateCusto(editCusto.id, data)
      setCustos(prev => prev.map(c => (c.id === editCusto.id ? updated : c)))
    } else {
      const created = await createCusto(data)
      setCustos(prev => [created, ...prev])
    }
  }

  async function handleFaturar(c: Custo) {
    const updated = await faturarCusto(c.id)
    setCustos(prev => prev.map(x => (x.id === c.id ? updated : x)))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCusto(deleteTarget.id)
      setCustos(prev => prev.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const tabConfig: { value: CustoStatus; label: string; items: Custo[]; badge: string }[] = [
    { value: 'pendente', label: 'Pendentes', items: byStatus('pendente'), badge: 'bg-amber-100 text-amber-700' },
    { value: 'faturado', label: 'Faturados', items: byStatus('faturado'), badge: 'bg-blue-100 text-blue-700' },
    { value: 'quitado', label: 'Quitados', items: byStatus('quitado'), badge: 'bg-emerald-100 text-emerald-700' },
    { value: 'cancelado', label: 'Cancelados', items: byStatus('cancelado'), badge: 'bg-muted text-muted-foreground' },
  ]

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Custos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Origens de valores a pagar. Fature um custo para gerar o título a pagar.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <FilterInput value={search} onChange={setSearch} placeholder="Buscar por favorecido ou descrição..." />
        <FilterSelect value={tipoFilter} onChange={v => setTipoFilter(v as TipoFilter)}>
          <option value="all">Todos os tipos</option>
          {ALL_CUSTO_TIPOS.map(t => (
            <option key={t} value={t}>{CUSTO_TIPO_LABELS[t]}</option>
          ))}
        </FilterSelect>
        <Button onClick={openCreate} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Novo Custo
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="pendente">
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
          {tabConfig.map(t => (
            <TabsContent key={t.value} value={t.value}>
              <Card>
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.items.length} custo{t.items.length !== 1 ? 's' : ''} {CUSTO_STATUS_LABELS[t.value].toLowerCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <CustosTable
                    items={t.items}
                    onView={openEdit}
                    onFaturar={handleFaturar}
                    emptyMessage={`Nenhum custo ${CUSTO_STATUS_LABELS[t.value].toLowerCase()}`}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <CustoFormModal
        custo={editCusto}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editCusto ? () => { setModalOpen(false); setDeleteTarget(editCusto) } : undefined}
      />

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir custo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o custo "{deleteTarget?.descricao}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
