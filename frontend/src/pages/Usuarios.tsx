import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TablePagination } from '@/components/ui/pagination'
import { UserPlus, Eye, Trash2, UserCheck, UserX } from 'lucide-react'
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
import { UserFormModal, type UserFormData } from '@/components/users/UserFormModal'
import { getUsers, createUser, deleteUser, resetPassword, type User, type UserProfile } from '@/services/usersService'
import { PROFILE_LABELS } from '@/mocks/users'
import { cn } from '@/lib/utils'

const PROFILE_COLORS: Record<UserProfile, string> = {
  admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  aluno: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  socio: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  externo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  instrutor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  funcionario: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

export default function Usuarios() {
  const alert = useAlert()
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState<UserProfile | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, profileFilter, statusFilter])

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchSearch =
        !q ||
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.cpf.includes(q)
      const matchProfile = profileFilter === 'all' || u.perfis.includes(profileFilter)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active)
      return matchSearch && matchProfile && matchStatus
    })
  }, [users, search, profileFilter, statusFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleSave(data: UserFormData): Promise<void> {
    try {
      const created = await createUser(data)
      setUsers(prev => [...prev, created])
      alert.success('Usuário cadastrado com sucesso')
    } catch (err) {
      alert.error(err)
      throw err
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      alert.success('Usuário excluído com sucesso')
    } catch (err) {
      alert.error(err)
    } finally {
      setDeleting(false)
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    setResetting(true)
    try {
      await resetPassword(resetTarget.id)
      setResetSuccess(true)
      alert.success('Senha redefinida com sucesso')
    } catch (err) {
      alert.error(err)
    } finally {
      setResetting(false)
    }
  }

  function closeResetDialog() {
    setResetTarget(null)
    setResetSuccess(false)
  }

  const hasNoData = !loading && users.length === 0

  return (
    <div className={cn("pt-2 flex flex-col gap-6", hasNoData && "flex-1")}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie os usuários do sistema</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, e-mail ou CPF..."
        />
        <FilterSelect
          value={profileFilter}
          onChange={v => setProfileFilter(v as UserProfile | 'all')}
        >
          <option value="all">Todos os perfis</option>
          <option value="admin">Administrador</option>
          <option value="aluno">Aluno</option>
          <option value="socio">Sócio</option>
          <option value="externo">Aluno Externo</option>
          <option value="instrutor">Instrutor</option>
          <option value="funcionario">Funcionário</option>
        </FilterSelect>
        <FilterSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as typeof statusFilter)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </FilterSelect>
        <Button onClick={() => setModalOpen(true)} className="ml-auto shrink-0">
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      <Card className={cn("flex flex-col", hasNoData && "flex-1")}>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} usuário${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("p-0 flex flex-col", hasNoData && "flex-1")}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty className="py-14">
              <EmptyHeader>
                <EmptyMedia><UserX className="h-10 w-10 text-muted-foreground opacity-30" /></EmptyMedia>
                <EmptyTitle>Nenhum usuário encontrado</EmptyTitle>
                <EmptyDescription>Tente ajustar os filtros de busca</EmptyDescription>
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
                      CPF
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Perfis
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                      Cadastro
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
                  {paginated.map(user => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{user.nome}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {user.cpf}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.perfis.map(p => (
                            <span
                              key={p}
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                PROFILE_COLORS[p],
                                user.perfil_ativo === p && 'ring-1 ring-current ring-offset-1',
                              )}
                              title={user.perfil_ativo === p ? 'Perfil ativo' : undefined}
                            >
                              {PROFILE_LABELS[p]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {fmtDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_active ? (
                          <Badge variant="success" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <UserX className="h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/usuarios/${user.id}`)}
                            title="Ver perfil"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(user)}
                            title="Excluir usuário"
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

      {/* Create Modal */}
      <UserFormModal
        user={null}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário{' '}
              <strong className="text-foreground">{deleteTarget?.nome}</strong>? O usuário será
              desativado e não poderá mais acessar o sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
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

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={o => !o && closeResetDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              {resetSuccess
                ? `Senha de ${resetTarget?.nome} foi resetada com sucesso. A nova senha é: aero + 5 primeiros dígitos do CPF.`
                : `A senha de ${resetTarget?.nome} será resetada para: aero + 5 primeiros dígitos do CPF. O usuário deverá trocar a senha no próximo acesso.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {resetSuccess ? (
              <Button onClick={closeResetDialog}>Fechar</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={closeResetDialog}
                  disabled={resetting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={resetting}
                >
                  {resetting ? 'Resetando...' : 'Resetar Senha'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
