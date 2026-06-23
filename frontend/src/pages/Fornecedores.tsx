import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Pencil, Trash2, Building2, Landmark } from 'lucide-react'
import { DadosBancariosModal } from '@/components/financeiro/DadosBancariosModal'
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
  EntidadeFormModal,
  type EntidadeFormData,
} from '@/components/entidades/EntidadeFormModal'
import {
  getEntidades,
  createEntidade,
  updateEntidade,
  deleteEntidade,
  type Entidade,
} from '@/services/entidadesService'
import { cn } from '@/lib/utils'

export default function Fornecedores() {
  const alert = useAlert()
  const [fornecedores, setFornecedores] = useState<Entidade[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [editItem, setEditItem] = useState<Entidade | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Entidade | null>(null)
  const [dadosBancariosTarget, setDadosBancariosTarget] = useState<Entidade | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, statusFilter])

  useEffect(() => {
    getEntidades('fornecedor').then(data => {
      setFornecedores(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return fornecedores.filter(e => {
      const matchSearch =
        !q ||
        e.nome.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.cpf_cnpj.includes(q)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && e.is_active) ||
        (statusFilter === 'inactive' && !e.is_active)
      return matchSearch && matchStatus
    })
  }, [fornecedores, search, statusFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleSave(data: EntidadeFormData) {
    try {
      if (editItem) {
        const updated = await updateEntidade(editItem.id, data)
        setFornecedores(prev => prev.map(e => (e.id === editItem.id ? updated : e)))
        alert.success('Fornecedor atualizado com sucesso')
      } else {
        const created = await createEntidade(data)
        setFornecedores(prev => [...prev, created])
        alert.success('Fornecedor cadastrado com sucesso')
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
      await deleteEntidade(deleteTarget.id, deleteTarget.tipo)
      setFornecedores(prev => prev.filter(e => e.id !== deleteTarget.id))
      setDeleteTarget(null)
      alert.success('Fornecedor excluído com sucesso')
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

  function openEdit(e: Entidade) {
    setEditItem(e)
    setModalOpen(true)
  }

  function handleDeleteRequest() {
    setModalOpen(false)
    setDeleteTarget(editItem)
  }

  const hasNoData = !loading && fornecedores.length === 0

  return (
    <div className={cn("pt-2 flex flex-col gap-6", hasNoData && "flex-1")}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie os fornecedores do aeroclube
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, e-mail ou CNPJ..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as typeof statusFilter)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </FilterSelect>
        <Button onClick={openCreate} className="w-full sm:w-auto sm:ml-auto">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className={cn("flex flex-col", hasNoData && "flex-1")}>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} fornecedor${filtered.length !== 1 ? 'es' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
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
                <EmptyMedia><Building2 className="h-10 w-10 text-muted-foreground opacity-30" /></EmptyMedia>
                <EmptyTitle>Nenhum fornecedor encontrado</EmptyTitle>
                <EmptyDescription>Tente ajustar os filtros ou cadastre um novo fornecedor</EmptyDescription>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      CNPJ / CPF
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                      E-mail
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                      Contato
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
                  {paginated.map(e => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{e.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {e.cpf_cnpj}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {e.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {e.contato}
                      </td>
                      <td className="px-4 py-3">
                        {e.is_active ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDadosBancariosTarget(e)}
                            title="Dados bancários"
                          >
                            <Landmark className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(e)}
                            title="Editar fornecedor"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(e)}
                            title="Excluir fornecedor"
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

      <DadosBancariosModal
        open={!!dadosBancariosTarget}
        onClose={() => setDadosBancariosTarget(null)}
        entidadeId={dadosBancariosTarget?.id}
        titularNome={dadosBancariosTarget?.nome}
      />

      <EntidadeFormModal
        entidade={editItem}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editItem ? handleDeleteRequest : undefined}
        tipoFixo="fornecedor"
        titulo={editItem ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      />

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o fornecedor{' '}
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
