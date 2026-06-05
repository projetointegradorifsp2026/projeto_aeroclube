import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Eye, Trash2, Users } from 'lucide-react'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  deleteEntidade,
  type Entidade,
} from '@/services/entidadesService'
import { ENTIDADE_TIPO_LABELS } from '@/mocks/entidades'
import { cn } from '@/lib/utils'

const inputCls =
  'h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const TIPO_COLORS: Record<'funcionario' | 'instrutor', string> = {
  funcionario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  instrutor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

export default function Funcionario() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Entidade[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'all' | 'funcionario' | 'instrutor'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Entidade | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, tipoFilter, statusFilter])

  useEffect(() => {
    Promise.all([getEntidades('funcionario'), getEntidades('instrutor')]).then(
      ([funcs, insts]) => {
        setItems([...funcs, ...insts])
        setLoading(false)
      },
    )
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(e => {
      const matchSearch =
        !q ||
        e.nome.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.cpf_cnpj.includes(q)
      const matchTipo = tipoFilter === 'all' || e.tipo === tipoFilter
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && e.is_active) ||
        (statusFilter === 'inactive' && !e.is_active)
      return matchSearch && matchTipo && matchStatus
    })
  }, [items, search, tipoFilter, statusFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleSave(data: EntidadeFormData) {
    const created = await createEntidade(data)
    setItems(prev => [...prev, created])
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteEntidade(deleteTarget.id, deleteTarget.tipo)
    setItems(prev => prev.filter(e => e.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function openCreate() {
    setModalOpen(true)
  }

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Funcionários e Instrutores</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie os colaboradores do aeroclube
        </p>
      </div>

      <div className="flex items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, e-mail ou CPF..."
        />
        <FilterSelect
          value={tipoFilter}
          onChange={v => setTipoFilter(v as typeof tipoFilter)}
        >
          <option value="all">Todos os tipos</option>
          <option value="funcionario">Funcionários</option>
          <option value="instrutor">Instrutores</option>
        </FilterSelect>
        <FilterSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as typeof statusFilter)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </FilterSelect>
        <Button onClick={openCreate} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Novo Cadastro
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} colaborador${filtered.length !== 1 ? 'es' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <Users className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum colaborador encontrado</p>
              <p className="text-xs mt-1">Tente ajustar os filtros ou faça um novo cadastro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Nome
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      CPF
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
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{e.nome}</p>
                          <p className="text-xs text-muted-foreground">{e.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            TIPO_COLORS[e.tipo as 'funcionario' | 'instrutor'],
                          )}
                        >
                          {ENTIDADE_TIPO_LABELS[e.tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {e.cpf_cnpj}
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
                            onClick={() => navigate(`/funcionario/${e.id}`)}
                            title="Ver perfil"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(e)}
                            title="Excluir colaborador"
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

      <EntidadeFormModal
        entidade={null}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        tiposPermitidos={['funcionario', 'instrutor']}
        titulo="Novo Colaborador"
      />

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{' '}
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
