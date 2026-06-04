import { useEffect, useState, useMemo } from 'react'
import { Plus, FileUp, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { TablePagination } from '@/components/ui/pagination'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ReceitaFormModal } from '@/components/financeiro/ReceitaFormModal'
import {
  getReceitas, createReceita, updateReceita, deleteReceita, faturarReceita,
} from '@/services/receitasService'
import { type ReceitaInput } from '@/services/receitasService'
import {
  type Receita, type ReceitaTipo, type ReceitaStatus,
  RECEITA_TIPO_LABELS, RECEITA_STATUS_LABELS, ALL_RECEITA_TIPOS,
} from '@/mocks/financeiroOrigem'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

type TipoFilter = 'all' | ReceitaTipo

const TIPO_COLORS: Record<ReceitaTipo, string> = {
  mensalidade: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  voo: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  horas_pre_pagas: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  servico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  outros: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

interface TableProps {
  items: Receita[]
  onView: (r: Receita) => void
  onFaturar: (r: Receita) => void
  emptyMessage: string
}

function ReceitasTable({ items, onView, onFaturar, emptyMessage }: TableProps) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
        <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Devedor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Vencimento</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-medium">{r.devedor_nome}</td>
                <td className="px-4 py-3 max-w-[280px] truncate">{r.descricao}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TIPO_COLORS[r.tipo])}>
                    {RECEITA_TIPO_LABELS[r.tipo]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(r.valor)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.data_vencimento)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1">
                    {r.status === 'pendente' && (
                      <Button size="sm" variant="outline" onClick={() => onFaturar(r)} title="Gerar título a receber">
                        <FileUp className="h-3.5 w-3.5" />
                        Faturar
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

export default function Receitas() {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editReceita, setEditReceita] = useState<Receita | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Receita | null>(null)
  const [deleting, setDeleting] = useState(false)

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
  const pendentes = byStatus('pendente')
  const faturadas = byStatus('faturada')
  const quitadas = byStatus('quitada')
  const canceladas = byStatus('cancelada')

  function openCreate() { setEditReceita(null); setModalOpen(true) }
  function openEdit(r: Receita) { setEditReceita(r); setModalOpen(true) }

  async function handleSave(data: ReceitaInput) {
    if (editReceita) {
      const updated = await updateReceita(editReceita.id, data)
      setReceitas(prev => prev.map(r => (r.id === editReceita.id ? updated : r)))
    } else {
      const created = await createReceita(data)
      setReceitas(prev => [created, ...prev])
      // Se gerou título, a receita criada já volta como faturada
    }
  }

  async function handleFaturar(r: Receita) {
    const updated = await faturarReceita(r.id)
    setReceitas(prev => prev.map(x => (x.id === r.id ? updated : x)))
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

  const tabConfig: { value: ReceitaStatus; label: string; items: Receita[]; badge: string }[] = [
    { value: 'pendente', label: 'Pendentes', items: pendentes, badge: 'bg-amber-100 text-amber-700' },
    { value: 'faturada', label: 'Faturadas', items: faturadas, badge: 'bg-blue-100 text-blue-700' },
    { value: 'quitada', label: 'Quitadas', items: quitadas, badge: 'bg-emerald-100 text-emerald-700' },
    { value: 'cancelada', label: 'Canceladas', items: canceladas, badge: 'bg-muted text-muted-foreground' },
  ]

  return (
    <div className="pt-2 space-y-6">
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
                    {t.items.length} receita{t.items.length !== 1 ? 's' : ''} {RECEITA_STATUS_LABELS[t.value].toLowerCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ReceitasTable
                    items={t.items}
                    onView={openEdit}
                    onFaturar={handleFaturar}
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
