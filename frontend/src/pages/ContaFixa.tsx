import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Pencil, Trash2, ReceiptText } from 'lucide-react'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { useAlert } from '@/components/feedback/alert-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ContaFixaFormModal,
  type ContaFixaFormData,
} from '@/components/contaFixa/ContaFixaFormModal'
import {
  getContasFixas,
  createContaFixa,
  updateContaFixa,
  deleteContaFixa,
  type ContaFixa,
} from '@/services/contaFixaService'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ContaFixa() {
  const alert = useAlert()
  const [contas, setContas] = useState<ContaFixa[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [editItem, setEditItem] = useState<ContaFixa | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContaFixa | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, statusFilter])

  useEffect(() => {
    getContasFixas()
      .then(data => {
        setContas(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contas.filter(c => {
      const matchSearch =
        !q ||
        c.nome.toLowerCase().includes(q) ||
        c.favorecido.toLowerCase().includes(q) ||
        c.descricao.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.is_active) ||
        (statusFilter === 'inactive' && !c.is_active)
      return matchSearch && matchStatus
    })
  }, [contas, search, statusFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)


  async function handleSave(data: ContaFixaFormData) {
    try {
      if (editItem) {
        const updated = await updateContaFixa(editItem.id, data)
        setContas(prev => prev.map(c => (c.id === editItem.id ? updated : c)))
        alert.success('Conta fixa atualizada com sucesso')
      } else {
        const created = await createContaFixa(data)
        setContas(prev => [...prev, created])
        alert.success('Conta fixa cadastrada com sucesso')
      }
    } catch (err) {
      alert.error(err)
      throw err
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteContaFixa(deleteTarget.id)
      setContas(prev => prev.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      alert.success('Conta fixa excluída com sucesso')
    } catch (err) {
      alert.error(err)
    } finally {
      setDeleting(false)
    }
  }

  function openCreate() {
    setEditItem(null)
    setModalOpen(true)
  }

  function openEdit(c: ContaFixa) {
    setEditItem(c)
    setModalOpen(true)
  }

  function handleDeleteRequest() {
    setModalOpen(false)
    setDeleteTarget(editItem)
  }

  const hasNoData = !loading && contas.length === 0

  return (
    <div className={cn("pt-2 flex flex-col gap-6", hasNoData && "flex-1")}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contas Fixas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie as despesas fixas mensais do aeroclube
        </p>
      </div>


      <div className="flex items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou favorecido..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as typeof statusFilter)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </FilterSelect>
        <Button onClick={openCreate} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Nova Conta Fixa
        </Button>
      </div>

      <Card className={cn("flex flex-col", hasNoData && "flex-1")}>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} conta${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("p-0 flex flex-col", hasNoData && "flex-1")}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty className="py-14">
              <EmptyHeader>
                <EmptyMedia><ReceiptText className="h-10 w-10 text-muted-foreground opacity-30" /></EmptyMedia>
                <EmptyTitle>Nenhuma conta fixa encontrada</EmptyTitle>
                <EmptyDescription>Cadastre as despesas recorrentes do aeroclube</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Nome
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                      Favorecido
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      Descrição
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Valor
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Vencimento
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(c => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {c.favorecido}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[220px]">
                        <p className="truncate">{c.descricao}</p>
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{fmt(c.valor)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        Dia {c.dia_vencimento}
                      </td>
                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <Badge variant="success">Ativa</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inativa
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(c)}
                            title="Editar conta fixa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(c)}
                            title="Excluir conta fixa"
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
          )}
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      <ContaFixaFormModal
        contaFixa={editItem}
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
              Tem certeza que deseja excluir a conta{' '}
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
