import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Pencil, Trash2, UserX, Landmark } from 'lucide-react'
import { DadosBancariosModal } from '@/components/financeiro/DadosBancariosModal'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
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
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  type Cliente,
} from '@/services/clientesService'

// ── Modal de criação/edição ────────────────────────────────────────────────────

interface ClienteFormModalProps {
  cliente: Cliente | null
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onDeleteRequest?: () => void
}

function ClienteFormModal({ cliente, open, onClose, onSave, onDeleteRequest }: ClienteFormModalProps) {
  const [nome, setNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [contato, setContato] = useState('')
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setNome(cliente?.nome ?? '')
      setCpfCnpj(cliente?.cpf_cnpj ?? '')
      setEmail(cliente?.email ?? '')
      setContato(cliente?.contato ?? '')
      setCep(cliente?.cep ?? '')
      setLogradouro(cliente?.logradouro ?? '')
      setNumero(cliente?.numero ?? '')
      setBairro(cliente?.bairro ?? '')
      setCidade(cliente?.cidade ?? '')
      setUf(cliente?.uf ?? '')
      setError('')
    }
  }, [open, cliente])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    try {
      await onSave({
        nome: nome.trim(), cpf_cnpj: cpfCnpj, email, contato,
        cep, logradouro, numero, bairro, cidade, uf: uf.toUpperCase(),
        is_active: true,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {cliente ? 'Atualize os dados do cliente.' : 'Cadastre um cliente de serviço do aeroclube.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome / Razão Social</label>
            <Input
              placeholder="Nome completo ou razão social"
              value={nome}
              onChange={e => setNome(e.target.value)}
              hasError={!!error}
              helper={error || undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CPF / CNPJ</label>
              <Input placeholder="000.000.000-00" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contato</label>
              <Input placeholder="(19) 99999-9999" value={contato} onChange={e => setContato(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">E-mail</label>
            <Input type="email" placeholder="contato@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="pt-1">
            <p className="text-xs text-muted-foreground">Endereço (exigido para gerar a remessa CNAB)</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">Logradouro</label>
              <Input placeholder="Rua / Avenida" value={logradouro} onChange={e => setLogradouro(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Número</label>
              <Input placeholder="123" value={numero} onChange={e => setNumero(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CEP</label>
              <Input placeholder="00000-000" value={cep} onChange={e => setCep(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bairro</label>
              <Input placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">UF</label>
              <Input placeholder="SP" maxLength={2} value={uf} onChange={e => setUf(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cidade</label>
            <Input placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
          </div>

          <DialogFooter>
            <div className="flex w-full items-center gap-2">
              {cliente && onDeleteRequest && (
                <Button
                  type="button" variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                  onClick={onDeleteRequest} disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : cliente ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editItem, setEditItem] = useState<Cliente | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null)
  const [dadosBancariosTarget, setDadosBancariosTarget] = useState<Cliente | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, statusFilter])

  useEffect(() => {
    getClientes(true).then(data => { setClientes(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clientes.filter(c => {
      const matchSearch = !q || c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.cpf_cnpj.includes(q)
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && c.is_active) || (statusFilter === 'inactive' && !c.is_active)
      return matchSearch && matchStatus
    })
  }, [clientes, search, statusFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleSave(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) {
    if (editItem) {
      const updated = await updateCliente(editItem.id, data)
      setClientes(prev => prev.map(c => (c.id === editItem.id ? updated : c)))
    } else {
      const created = await createCliente(data)
      setClientes(prev => [...prev, created])
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteCliente(deleteTarget.id)
    setClientes(prev => prev.filter(c => c.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pessoas e empresas que contratam serviços do aeroclube
        </p>
      </div>

      <div className="flex items-center gap-3">
        <FilterInput value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail ou CPF/CNPJ..." />
        <FilterSelect value={statusFilter} onChange={v => setStatusFilter(v as typeof statusFilter)}>
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </FilterSelect>
        <Button onClick={() => { setEditItem(null); setModalOpen(true) }} className="ml-auto shrink-0">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading ? 'Carregando...' : `${filtered.length} cliente${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <UserX className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">CPF / CNPJ</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">E-mail</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Contato</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(c => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.cpf_cnpj || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.contato || '—'}</td>
                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setDadosBancariosTarget(c)} title="Dados bancários">
                            <Landmark className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => { setEditItem(c); setModalOpen(true) }} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setDeleteTarget(c)}
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
        cliente={editItem}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editItem ? () => { setModalOpen(false); setDeleteTarget(editItem) } : undefined}
      />

      <DadosBancariosModal
        open={!!dadosBancariosTarget}
        onClose={() => setDadosBancariosTarget(null)}
        entidadeId={dadosBancariosTarget?.id}
        titularNome={dadosBancariosTarget?.nome}
      />

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Deseja excluir o cliente <strong className="text-foreground">{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
