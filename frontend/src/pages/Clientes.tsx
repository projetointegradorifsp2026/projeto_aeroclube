import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Search, UserPlus, Pencil, Trash2, UserX } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getUsers, createUser, updateUser, deleteUser, type User, type UserProfile } from '@/services/usersService'
import { PROFILE_LABELS } from '@/mocks/users'
import { cn } from '@/lib/utils'

const inputCls =
  'h-10 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const selectCls =
  'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'

const CLIENTE_PERFIS: UserProfile[] = ['aluno', 'socio', 'cliente_externo']

const PERFIL_COLORS: Record<UserProfile, string> = {
  administrador: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  aluno: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  socio: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  cliente_externo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  colaborador: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

// ─── Inline form modal ────────────────────────────────────────────────────────

interface ClienteFormData {
  nome: string
  email: string
  cpf: string
  perfis: UserProfile[]
  perfil_ativo: UserProfile
  is_active: boolean
}

function makeEmptyCliente(): ClienteFormData {
  return { nome: '', email: '', cpf: '', perfis: ['aluno'], perfil_ativo: 'aluno', is_active: true }
}

type FormErrors = { nome?: string; email?: string; cpf?: string; perfis?: string }

function ClienteFormModal({
  user,
  open,
  onClose,
  onSave,
  onDeleteRequest,
}: {
  user: User | null
  open: boolean
  onClose: () => void
  onSave: (data: ClienteFormData) => Promise<void>
  onDeleteRequest?: () => void
}) {
  const [form, setForm] = useState<ClienteFormData>(makeEmptyCliente)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!user

  useEffect(() => {
    if (open) {
      setForm(
        user
          ? {
              nome: user.nome,
              email: user.email,
              cpf: user.cpf,
              perfis: user.perfis.filter(p => CLIENTE_PERFIS.includes(p)),
              perfil_ativo: user.perfil_ativo,
              is_active: user.is_active,
            }
          : makeEmptyCliente(),
      )
      setErrors({})
    }
  }, [user, open])

  function togglePerfil(p: UserProfile) {
    setForm(prev => {
      const has = prev.perfis.includes(p)
      const next = has ? prev.perfis.filter(x => x !== p) : [...prev.perfis, p]
      return {
        ...prev,
        perfis: next,
        perfil_ativo: next.includes(prev.perfil_ativo) ? prev.perfil_ativo : (next[0] ?? 'aluno'),
      }
    })
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.email.trim()) e.email = 'E-mail é obrigatório'
    if (!form.cpf.trim()) e.cpf = 'CPF é obrigatório'
    if (form.perfis.length === 0) e.perfis = 'Selecione pelo menos um perfil'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados do cliente.' : 'Cadastre um novo aluno, sócio ou cliente externo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome</label>
            <Input
              placeholder="Nome completo"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              hasError={!!errors.nome}
              helper={errors.nome}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                hasError={!!errors.email}
                helper={errors.email}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CPF</label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
                hasError={!!errors.cpf}
                helper={errors.cpf}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Perfis</label>
            <div className="flex flex-wrap gap-2">
              {CLIENTE_PERFIS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePerfil(p)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    form.perfis.includes(p)
                      ? cn(PERFIL_COLORS[p], 'border-current')
                      : 'border-input text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {PROFILE_LABELS[p]}
                </button>
              ))}
            </div>
            {errors.perfis && <p className="text-xs text-destructive">{errors.perfis}</p>}
          </div>

          {form.perfis.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Perfil ativo</label>
              <select
                className={selectCls}
                value={form.perfil_ativo}
                onChange={e => setForm(p => ({ ...p, perfil_ativo: e.target.value as UserProfile }))}
              >
                {form.perfis.map(p => (
                  <option key={p} value={p}>
                    {PROFILE_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Ativo</span>
          </label>

          <DialogFooter>
            <div className="flex w-full items-center gap-2">
              {isEdit && onDeleteRequest && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                  onClick={onDeleteRequest}
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

export default function Clientes() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState<UserProfile | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [editUser, setEditUser] = useState<User | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, profileFilter, statusFilter])

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data.filter(u => u.perfis.some(p => CLIENTE_PERFIS.includes(p))))
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

  async function handleSave(data: ClienteFormData) {
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

  function openEdit(u: User) {
    setEditUser(u)
    setModalOpen(true)
  }

  function handleDeleteRequest() {
    setModalOpen(false)
    setDeleteTarget(editUser)
  }

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Alunos, sócios e clientes externos do aeroclube
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            className={cn(inputCls, 'w-full pl-8 pr-3')}
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={inputCls}
          value={profileFilter}
          onChange={e => setProfileFilter(e.target.value as UserProfile | 'all')}
        >
          <option value="all">Todos os perfis</option>
          <option value="aluno">Aluno</option>
          <option value="socio">Sócio</option>
          <option value="cliente_externo">Cliente Externo</option>
        </select>
        <select
          className={inputCls}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <Button onClick={openCreate} className="ml-auto shrink-0">
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} cliente${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
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
              <p className="text-sm font-medium">Nenhum cliente encontrado</p>
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
                  {paginated.map(u => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {u.cpf}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.perfis
                            .filter(p => CLIENTE_PERFIS.includes(p))
                            .map(p => (
                              <span
                                key={p}
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                  PERFIL_COLORS[p],
                                  u.perfil_ativo === p && 'ring-1 ring-current ring-offset-1',
                                )}
                              >
                                {PROFILE_LABELS[p]}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {fmtDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
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
                            onClick={() => openEdit(u)}
                            title="Editar cliente"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(u)}
                            title="Excluir cliente"
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

      <ClienteFormModal
        user={editUser}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editUser ? handleDeleteRequest : undefined}
      />

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente{' '}
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
