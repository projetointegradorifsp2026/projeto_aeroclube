import { useEffect, useState, useMemo } from 'react'
import { Search, UserPlus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
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
import { UserFormModal, type UserFormData } from '@/components/users/UserFormModal'
import { getUsers, createUser, updateUser, deleteUser, type User, type UserProfile } from '@/services/usersService'
import { PROFILE_LABELS } from '@/mocks/users'
import { cn } from '@/lib/utils'

const PROFILE_COLORS: Record<UserProfile, string> = {
  administrador: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  aluno: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  socio: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  cliente_externo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  colaborador: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState<UserProfile | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [editUser, setEditUser] = useState<User | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  async function handleSave(data: UserFormData): Promise<void> {
    if (editUser) {
      const updated = await updateUser(editUser.id, data)
      setUsers(prev => prev.map(u => (u.id === editUser.id ? updated : u)))
    } else {
      const created = await createUser(data)
      setUsers(prev => [...prev, created])
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteUser(deleteTarget.id)
    setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function openCreate() {
    setEditUser(null)
    setModalOpen(true)
  }

  function openEdit(user: User) {
    setEditUser(user)
    setModalOpen(true)
  }

  return (
    <div className="pt-2 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground transition-shadow"
                placeholder="Buscar por nome, e-mail ou CPF..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
              value={profileFilter}
              onChange={e => setProfileFilter(e.target.value as UserProfile | 'all')}
            >
              <option value="all">Todos os perfis</option>
              <option value="administrador">Administrador</option>
              <option value="aluno">Aluno</option>
              <option value="socio">Sócio</option>
              <option value="cliente_externo">Cliente Externo</option>
              <option value="colaborador">Colaborador</option>
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} usuário${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <UserX className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum usuário encontrado</p>
              <p className="text-xs mt-1">Tente ajustar os filtros de busca</p>
            </div>
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
                  {filtered.map(user => (
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
                              title={
                                user.perfil_ativo === p ? 'Perfil ativo' : undefined
                              }
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
                            onClick={() => openEdit(user)}
                            title="Editar usuário"
                          >
                            <Pencil className="h-3.5 w-3.5" />
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
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <UserFormModal
        user={editUser}
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
              <strong className="text-foreground">{deleteTarget?.nome}</strong>? Esta ação não pode
              ser desfeita.
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
    </div>
  )
}
