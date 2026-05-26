import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Pencil, Trash2, Plane, Wind } from 'lucide-react'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn } from '@/lib/utils'

const inputCls =
  'h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PAGE_SIZE = 10

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
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Plane className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">Nenhum avião cadastrado</p>
      </div>
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
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold tracking-wide">{a.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{fmt(a.tarifa_solo ?? 0)}</td>
                <td className="px-4 py-3 font-medium">{fmt(a.tarifa_duplo_comando ?? 0)}</td>
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
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Wind className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">Nenhum planador cadastrado</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Prefixo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Valor Fixo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tempo Limite</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Adicional/min</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map(a => (
              <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold tracking-wide">{a.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{fmt(a.valor_fixo_inicial ?? 0)}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.minutos_franquia ?? 0} min</td>
                <td className="px-4 py-3 font-medium">{fmt(a.valor_minuto_adicional ?? 0)}</td>
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

  function toAeronavePayload(data: AeronaveFormData): Omit<Aeronave, 'id'> {
    if (data.tipo === 'aviao') {
      return {
        nome: data.nome, tipo: 'aviao', foto: data.foto || null, is_active: data.is_active,
        tarifa_solo: data.valor_solo, tarifa_duplo_comando: data.valor_duplo,
        minutos_franquia: null, valor_fixo_inicial: null, valor_minuto_adicional: null,
      }
    }
    return {
      nome: data.nome, tipo: 'planador', foto: data.foto || null, is_active: data.is_active,
      tarifa_solo: null, tarifa_duplo_comando: null,
      minutos_franquia: data.tempo_limite, valor_fixo_inicial: data.valor_fixo_inicial,
      valor_minuto_adicional: data.valor_por_minuto,
    }
  }

  async function handleSave(data: AeronaveFormData) {
    const payload = toAeronavePayload(data)
    if (editItem) {
      const updated = await updateAeronave(editItem.id, payload)
      setAeronaves(prev => prev.map(a => (a.id === editItem.id ? updated : a)))
    } else {
      const created = await createAeronave(payload)
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
