import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Pencil, Trash2, Plane, Wind } from 'lucide-react'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AeronaveFormModal,
  type AeronaveFormData,
} from '@/components/aeronaves/AeronaveFormModal'
import {
  getAeronaves,
  createAeronave,
  updateAeronave,
  deleteAeronave,
  type Aeronave,
} from '@/services/aeronavesService'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PAGE_SIZE = 10

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function AeronaveThumb({ foto, tipo }: { foto?: string; tipo: 'aviao' | 'planador' }) {
  const Icon = tipo === 'planador' ? Wind : Plane
  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        loading="lazy"
        className="h-10 w-16 rounded-md object-cover border border-border bg-muted shrink-0"
        onError={e => {
          const el = e.currentTarget
          el.onerror = null
          el.src =
            'data:image/svg+xml;utf8,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"/>',
            )
        }}
      />
    )
  }
  return (
    <div className="h-10 w-16 rounded-md bg-muted flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

// ─── Sub-tables ───────────────────────────────────────────────────────────────

function AviaoTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Aeronave[]
  onEdit: (a: Aeronave) => void
  onDelete: (a: Aeronave) => void
}) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia><Plane className="h-8 w-8 text-muted-foreground opacity-30" /></EmptyMedia>
          <EmptyTitle>Nenhum avião cadastrado</EmptyTitle>
          <EmptyDescription>Cadastre aviões para começar a gerenciar a frota</EmptyDescription>
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Prefixo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tarifa Solo (R$/h)</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tarifa Duplo (R$/h)</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map(a => (
              <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AeronaveThumb foto={a.foto} tipo="aviao" />
                    <span className="font-semibold tracking-wide">{a.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{fmt(a.valor_solo)}</td>
                <td className="px-4 py-3 font-medium">{fmt(a.valor_duplo)}</td>
                <td className="px-4 py-3">
                  {a.is_active ? (
                    <Badge variant="success">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(a)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" onClick={() => onDelete(a)} title="Excluir"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

function PlanadorTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Aeronave[]
  onEdit: (a: Aeronave) => void
  onDelete: (a: Aeronave) => void
}) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia><Wind className="h-8 w-8 text-muted-foreground opacity-30" /></EmptyMedia>
          <EmptyTitle>Nenhum planador cadastrado</EmptyTitle>
          <EmptyDescription>Cadastre planadores para começar a gerenciar a frota</EmptyDescription>
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Prefixo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Fixo Solo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Fixo Duplo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tempo Limite</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Adicional/min Solo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Adicional/min Duplo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map(a => (
              <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AeronaveThumb foto={a.foto} tipo="planador" />
                    <span className="font-semibold tracking-wide">{a.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{fmt(a.valor_fixo_inicial)}</td>
                <td className="px-4 py-3 font-medium">{a.valor_fixo_duplo != null ? fmt(a.valor_fixo_duplo) : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.tempo_limite} min</td>
                <td className="px-4 py-3 font-medium">{fmt(a.valor_por_minuto)}</td>
                <td className="px-4 py-3 font-medium">{a.valor_minuto_duplo != null ? fmt(a.valor_minuto_duplo) : '—'}</td>
                <td className="px-4 py-3">
                  {a.is_active ? (
                    <Badge variant="success">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(a)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" onClick={() => onDelete(a)} title="Excluir"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

export default function Aeronaves() {
  const [aeronaves, setAeronaves] = useState<Aeronave[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [editItem, setEditItem] = useState<Aeronave | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Aeronave | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getAeronaves().then(data => {
      setAeronaves(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return aeronaves.filter(a => {
      const matchSearch = !q || a.nome.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && a.is_active) ||
        (statusFilter === 'inactive' && !a.is_active)
      return matchSearch && matchStatus
    })
  }, [aeronaves, search, statusFilter])

  const avioes = filtered.filter(a => a.tipo === 'aviao')
  const planadores = filtered.filter(a => a.tipo === 'planador')

  async function handleSave(data: AeronaveFormData) {
    if (editItem) {
      const updated = await updateAeronave(editItem.id, data)
      setAeronaves(prev => prev.map(a => (a.id === editItem.id ? updated : a)))
    } else {
      const created = await createAeronave(data)
      setAeronaves(prev => [...prev, created])
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteAeronave(deleteTarget.id)
    setAeronaves(prev => prev.filter(a => a.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function openCreate() {
    setEditItem(null)
    setModalOpen(true)
  }

  function openEdit(a: Aeronave) {
    setEditItem(a)
    setModalOpen(true)
  }

  function handleDeleteRequest() {
    setModalOpen(false)
    setDeleteTarget(editItem)
  }

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aeronaves</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie as aeronaves e suas tarifas de voo
        </p>
      </div>

      <div className="flex items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por prefixo..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as typeof statusFilter)}
        >
          <option value="all">Todas</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </FilterSelect>
        <Button onClick={openCreate} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Nova Aeronave
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="aviao">
          <TabsList>
            <TabsTrigger value="aviao">
              <Plane className="h-4 w-4" />
              Aviões
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {avioes.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="planador">
              <Wind className="h-4 w-4" />
              Planadores
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {planadores.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="aviao">
            <Card>
              <CardContent className="p-0">
                <AviaoTable items={avioes} onEdit={openEdit} onDelete={setDeleteTarget} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="planador">
            <Card>
              <CardContent className="p-0">
                <PlanadorTable items={planadores} onEdit={openEdit} onDelete={setDeleteTarget} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <AeronaveFormModal
        aeronave={editItem}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editItem ? handleDeleteRequest : undefined}
      />

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a aeronave{' '}
              <strong className="text-foreground">{deleteTarget?.nome}</strong>? Esta ação não pode
              ser desfeita.
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
