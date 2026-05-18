import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  UserCheck,
  UserX,
  Receipt,
  CheckSquare,
  Wallet,
  Eye,
  EyeOff,
  Plus,
  Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TablePagination } from '@/components/ui/pagination'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getUsers, updateUser, addSaldoCarteira, debitarCarteira, type User } from '@/services/usersService'
import { UserFormModal, type UserFormData } from '@/components/users/UserFormModal'
import {
  getTitulosReceber,
  baixarTituloReceber,
  createTituloReceber,
  type TituloReceber,
} from '@/services/titulosReceberService'
import { getTitulosPagar, createTituloPagar } from '@/services/titulosPagarService'
import { PROFILE_LABELS, type UserProfile } from '@/mocks/users'
import { TITULO_RECEBER_TIPO_LABELS, type TituloReceberStatus } from '@/mocks/titulos'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
const todayStr = () => new Date().toISOString().split('T')[0]

type MovRow = {
  id: string
  tipo: 'entrada' | 'saida'
  data: string
  descricao: string
  valor: number
  valor_pago: number
  status: 'em_aberto' | 'pago_parcial' | 'baixado'
}

const PROFILE_COLORS: Record<UserProfile, string> = {
  administrador: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  aluno: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  socio: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  cliente_externo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  colaborador: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const TITULO_STATUS_LABELS: Record<TituloReceberStatus, string> = {
  em_aberto: 'Em aberto',
  pago_parcial: 'Pago parcial',
  baixado: 'Baixado',
}

const TITULO_STATUS_COLORS: Record<TituloReceberStatus, string> = {
  em_aberto: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pago_parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  baixado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const PAGE_SIZE = 5

export default function UsuarioPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  // Carteira
  const [saldoVisible, setSaldoVisible] = useState(false)
  const [addSaldoOpen, setAddSaldoOpen] = useState(false)
  const [addSaldoValor, setAddSaldoValor] = useState('')
  const [addSaldoData, setAddSaldoData] = useState(todayStr())
  const [addSaldoSaving, setAddSaldoSaving] = useState(false)
  const [removeSaldoOpen, setRemoveSaldoOpen] = useState(false)
  const [removeSaldoValor, setRemoveSaldoValor] = useState('')
  const [removeSaldoData, setRemoveSaldoData] = useState(todayStr())
  const [removeSaldoSaving, setRemoveSaldoSaving] = useState(false)

  const [movimentacoes, setMovimentacoes] = useState<MovRow[]>([])
  const [movPage, setMovPage] = useState(1)

  const [titulos, setTitulos] = useState<TituloReceber[]>([])
  const [titulosPage, setTitulosPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [baixaTarget, setBaixaTarget] = useState<TituloReceber | null>(null)
  const [baixaValor, setBaixaValor] = useState('')
  const [baixaData, setBaixaData] = useState(todayStr())
  const [baixando, setBaixando] = useState(false)

  const [batchOpen, setBatchOpen] = useState(false)
  const [batchData, setBatchData] = useState(todayStr())
  const [batchBaixando, setBatchBaixando] = useState(false)

  async function reloadMovimentacoes(nomeUsuario: string) {
    const [allReceber, allPagar] = await Promise.all([getTitulosReceber(), getTitulosPagar()])
    const userReceber = allReceber.filter(t => t.usuario_id === id && t.status === 'baixado')
    const userPagar = allPagar.filter(t => t.favorecido === nomeUsuario && t.status === 'baixado')
    const entradas: MovRow[] = userReceber.map(t => ({
      id: `r-${t.id}`,
      tipo: 'entrada' as const,
      data: t.data_emissao,
      descricao: t.descricao,
      valor: t.valor + t.juros_aplicado,
      valor_pago: t.valor_pago,
      status: t.status,
    }))
    const saidas: MovRow[] = userPagar.map(t => ({
      id: `p-${t.id}`,
      tipo: 'saida' as const,
      data: t.data_emissao,
      descricao: t.descricao,
      valor: t.valor,
      valor_pago: t.valor_pago ?? 0,
      status: t.status,
    }))
    setMovimentacoes([...entradas, ...saidas].sort((a, b) => b.data.localeCompare(a.data)))
    setMovPage(1)
  }

  useEffect(() => {
    if (!id) return
    Promise.all([getUsers(), getTitulosReceber(), getTitulosPagar()]).then(
      ([users, allReceber, allPagar]) => {
        const found = users.find(u => u.id === id)
        if (!found) { navigate('/usuarios'); return }

        const userReceber = allReceber.filter(t => t.usuario_id === id && t.status === 'baixado')
        const userPagar = allPagar.filter(t => t.favorecido === found.nome && t.status === 'baixado')

        const entradas: MovRow[] = userReceber.map(t => ({
          id: `r-${t.id}`,
          tipo: 'entrada' as const,
          data: t.data_emissao,
          descricao: t.descricao,
          valor: t.valor + t.juros_aplicado,
          valor_pago: t.valor_pago,
          status: t.status,
        }))
        const saidas: MovRow[] = userPagar.map(t => ({
          id: `p-${t.id}`,
          tipo: 'saida' as const,
          data: t.data_emissao,
          descricao: t.descricao,
          valor: t.valor,
          valor_pago: t.valor_pago ?? 0,
          status: t.status,
        }))

        setUser(found)
        setMovimentacoes(
          [...entradas, ...saidas].sort((a, b) => b.data.localeCompare(a.data)),
        )
        setTitulos(
          userReceber
            .filter(t => t.status !== 'baixado')
            .sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento)),
        )
        setLoadingUser(false)
      },
    )
  }, [id, navigate])

  const movTotalPages = Math.ceil(movimentacoes.length / PAGE_SIZE)
  const movPaginated = movimentacoes.slice((movPage - 1) * PAGE_SIZE, movPage * PAGE_SIZE)

  const titulosTotalPages = Math.ceil(titulos.length / PAGE_SIZE)
  const titulosPaginated = titulos.slice((titulosPage - 1) * PAGE_SIZE, titulosPage * PAGE_SIZE)

  const selectableTitulos = titulos
  const allSelected =
    selectableTitulos.length > 0 && selectableTitulos.every(t => selectedIds.has(t.id))
  const someSelected = selectableTitulos.some(t => selectedIds.has(t.id)) && !allSelected
  const selectedTitulos = titulos.filter(t => selectedIds.has(t.id))
  const totalBatch = selectedTitulos.reduce(
    (sum, t) => sum + (t.valor + t.juros_aplicado - t.valor_pago),
    0,
  )

  function toggleSelect(tid: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(tid)) next.delete(tid)
      else next.add(tid)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableTitulos.map(t => t.id)))
    }
  }

  async function handleSaveUser(data: UserFormData) {
    if (!user) return
    const updated = await updateUser(user.id, data)
    setUser(updated)
  }

  async function handleAddSaldo() {
    if (!user) return
    const valor = parseFloat(addSaldoValor)
    if (!valor || valor <= 0 || !addSaldoData) return
    setAddSaldoSaving(true)
    const [updatedUser] = await Promise.all([
      addSaldoCarteira(user.id, valor),
      createTituloReceber({
        usuario_id: user.id,
        usuario_nome: user.nome,
        tipo: 'carteira',
        descricao: `Recarga de carteira`,
        num_parcela: 1,
        total_parcelas: 1,
        valor,
        valor_pago: valor,
        juros_aplicado: 0,
        data_emissao: addSaldoData,
        data_vencimento: addSaldoData,
        data_pagamento: addSaldoData,
        status: 'baixado',
      }),
    ])
    setUser(updatedUser)
    await reloadMovimentacoes(updatedUser.nome)
    setAddSaldoOpen(false)
    setAddSaldoValor('')
    setAddSaldoSaving(false)
  }

  async function handleRemoveSaldo() {
    if (!user) return
    const valor = parseFloat(removeSaldoValor)
    if (!valor || valor <= 0 || valor > user.saldo_carteira || !removeSaldoData) return
    setRemoveSaldoSaving(true)
    const [updatedUser] = await Promise.all([
      debitarCarteira(user.id, valor),
      createTituloPagar({
        tipo: 'outros',
        favorecido: user.nome,
        descricao: `Remoção de saldo da carteira`,
        num_parcela: 1,
        total_parcelas: 1,
        valor,
        data_emissao: removeSaldoData,
        data_vencimento: removeSaldoData,
        status: 'baixado',
        valor_pago: valor,
        data_pagamento: removeSaldoData,
        recorrente: false,
      }),
    ])
    setUser(updatedUser)
    await reloadMovimentacoes(updatedUser.nome)
    setRemoveSaldoOpen(false)
    setRemoveSaldoValor('')
    setRemoveSaldoSaving(false)
  }

  async function handleBaixa() {
    if (!baixaTarget) return
    setBaixando(true)
    const updated = await baixarTituloReceber(baixaTarget.id, parseFloat(baixaValor), baixaData)
    setTitulos(prev =>
      prev
        .map(t => (t.id === updated.id ? updated : t))
        .filter(t => t.status !== 'baixado')
        .sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento)),
    )
    setBaixaTarget(null)
    setBaixaValor('')
    setBaixando(false)
  }

  async function handleBatchBaixa() {
    setBatchBaixando(true)
    const updates = await Promise.all(
      selectedTitulos.map(t => {
        const remaining = t.valor + t.juros_aplicado - t.valor_pago
        return baixarTituloReceber(t.id, remaining, batchData)
      }),
    )
    setTitulos(prev =>
      prev
        .map(t => updates.find(u => u.id === t.id) ?? t)
        .filter(t => t.status !== 'baixado')
        .sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento)),
    )
    setSelectedIds(new Set())
    setBatchOpen(false)
    setBatchBaixando(false)
  }

  if (loadingUser) {
    return (
      <div className="pt-2 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!user) return null

  const addSaldoNum = parseFloat(addSaldoValor)
  const addSaldoError =
    addSaldoValor && !isNaN(addSaldoNum) && addSaldoNum <= 0
      ? 'O valor deve ser maior que zero'
      : null

  const removeSaldoNum = parseFloat(removeSaldoValor)
  const removeSaldoError = (() => {
    if (!removeSaldoValor) return null
    if (isNaN(removeSaldoNum) || removeSaldoNum <= 0) return 'O valor deve ser maior que zero'
    if (removeSaldoNum > user.saldo_carteira)
      return `Saldo insuficiente (máximo: ${fmt(user.saldo_carteira)})`
    return null
  })()

  return (
    <div className="pt-2 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{user.nome}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Perfil do usuário</p>
        </div>
      </div>

      {/* Dados + Carteira lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados do Usuário */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Dados do Usuário</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</dt>
                <dd className="mt-1 text-sm font-medium">{user.nome}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</dt>
                <dd className="mt-1 text-sm">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF</dt>
                <dd className="mt-1 text-sm">{user.cpf}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de cadastro</dt>
                <dd className="mt-1 text-sm">{fmtDate(user.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</dt>
                <dd className="mt-1">
                  {user.is_active ? (
                    <Badge variant="success" className="gap-1">
                      <UserCheck className="h-3 w-3" />Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <UserX className="h-3 w-3" />Inativo
                    </Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfis</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
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
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Carteira */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Carteira</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-5 space-y-5">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Saldo disponível
              </dt>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {saldoVisible ? fmt(user.saldo_carteira) : 'R$ ••••••'}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSaldoVisible(v => !v)}
                  title={saldoVisible ? 'Ocultar saldo' : 'Mostrar saldo'}
                >
                  {saldoVisible ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setAddSaldoValor(''); setAddSaldoData(todayStr()); setAddSaldoOpen(true) }}
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setRemoveSaldoValor(''); setRemoveSaldoData(todayStr()); setRemoveSaldoOpen(true) }}
                disabled={user.saldo_carteira <= 0}
              >
                <Minus className="h-4 w-4" />
                Remover
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimentações */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Movimentações</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {movimentacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Receipt className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Data</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Descrição</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Pago</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movPaginated.map(m => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(m.data)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          m.tipo === 'entrada'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                        )}>
                          {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate font-medium">{m.descricao}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        <span className={m.tipo === 'entrada'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                        }>
                          {m.tipo === 'entrada' ? '+' : '-'}{fmt(m.valor)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {m.valor_pago > 0 ? fmt(m.valor_pago) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {m.status === 'baixado'
                          ? <Badge variant="success">Baixado</Badge>
                          : m.status === 'pago_parcial'
                          ? <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400">Pago Parcial</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Em Aberto</Badge>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination page={movPage} totalPages={movTotalPages} onPageChange={setMovPage} />
        </CardContent>
      </Card>

      {/* Títulos a Receber */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Títulos a Receber</CardTitle>
            </div>
            {selectedIds.size > 0 && (
              <Button size="sm" onClick={() => { setBatchData(todayStr()); setBatchOpen(true) }}>
                <CheckSquare className="h-4 w-4" />
                Baixa múltipla ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {titulos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Receipt className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum título em aberto</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected }}
                        onChange={toggleAll}
                        title="Selecionar todos"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Descrição</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">Parcela</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Vencimento</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">Pago</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {titulosPaginated.map(t => (
                    <tr
                      key={t.id}
                      className={cn(
                        'hover:bg-muted/20 transition-colors',
                        selectedIds.has(t.id) && 'bg-primary/5',
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{TITULO_RECEBER_TIPO_LABELS[t.tipo]}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.descricao}</td>
                      <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">{t.num_parcela}/{t.total_parcelas}</td>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">{fmtDate(t.data_vencimento)}</td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{fmt(t.valor + t.juros_aplicado)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground hidden sm:table-cell">{fmt(t.valor_pago)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TITULO_STATUS_COLORS[t.status])}>
                          {TITULO_STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setBaixaTarget(t); setBaixaValor(''); setBaixaData(todayStr()) }}
                        >
                          Baixar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination page={titulosPage} totalPages={titulosTotalPages} onPageChange={setTitulosPage} />
        </CardContent>
      </Card>

      {/* Modal de edição */}
      <UserFormModal user={user} open={editOpen} onClose={() => setEditOpen(false)} onSave={handleSaveUser} />

      {/* Dialog: Adicionar Saldo */}
      <Dialog open={addSaldoOpen} onOpenChange={o => !o && setAddSaldoOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Saldo</DialogTitle>
            <DialogDescription>
              Um título baixado será gerado como comprovante do crédito adicionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor a adicionar (R$)</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0,00"
                value={addSaldoValor}
                onChange={e => setAddSaldoValor(e.target.value)}
                hasError={!!addSaldoError}
                helper={addSaldoError ?? undefined}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={addSaldoData}
                onChange={e => setAddSaldoData(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Saldo atual: </span>
              <span className="font-medium">{fmt(user.saldo_carteira)}</span>
              {addSaldoValor && !addSaldoError && parseFloat(addSaldoValor) > 0 && (
                <>
                  <span className="text-muted-foreground mx-1.5">→</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {fmt(user.saldo_carteira + parseFloat(addSaldoValor))}
                  </span>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSaldoOpen(false)} disabled={addSaldoSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddSaldo}
              disabled={
                addSaldoSaving ||
                !addSaldoValor ||
                !!addSaldoError ||
                parseFloat(addSaldoValor) <= 0 ||
                !addSaldoData
              }
            >
              {addSaldoSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Remover Saldo */}
      <Dialog open={removeSaldoOpen} onOpenChange={o => !o && setRemoveSaldoOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Saldo</DialogTitle>
            <DialogDescription>
              O valor será debitado da carteira e registrado como saída nas movimentações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor a remover (R$)</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                max={user.saldo_carteira}
                placeholder="0,00"
                value={removeSaldoValor}
                onChange={e => setRemoveSaldoValor(e.target.value)}
                hasError={!!removeSaldoError}
                helper={removeSaldoError ?? undefined}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={removeSaldoData}
                onChange={e => setRemoveSaldoData(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Saldo atual: </span>
              <span className="font-medium">{fmt(user.saldo_carteira)}</span>
              {removeSaldoValor && !removeSaldoError && parseFloat(removeSaldoValor) > 0 && (
                <>
                  <span className="text-muted-foreground mx-1.5">→</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {fmt(user.saldo_carteira - parseFloat(removeSaldoValor))}
                  </span>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveSaldoOpen(false)} disabled={removeSaldoSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleRemoveSaldo}
              disabled={
                removeSaldoSaving ||
                !removeSaldoValor ||
                !!removeSaldoError ||
                parseFloat(removeSaldoValor) <= 0 ||
                !removeSaldoData
              }
            >
              {removeSaldoSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Baixa individual */}
      {(() => {
        const valorRecebido = parseFloat(baixaValor)
        const restante = baixaTarget
          ? baixaTarget.valor + baixaTarget.juros_aplicado - baixaTarget.valor_pago
          : 0
        const baixaValorError =
          baixaTarget && !isNaN(valorRecebido) && valorRecebido > restante
            ? `O valor não pode ser maior que ${fmt(restante)}`
            : null
        return (
          <Dialog open={!!baixaTarget} onOpenChange={o => !o && setBaixaTarget(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Registrar Pagamento</DialogTitle>
                <DialogDescription>
                  {baixaTarget?.descricao}{' · '}
                  <strong className="text-foreground">Restante: {fmt(restante)}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Valor recebido (R$)</label>
                  <Input
                    type="number" min={0.01} step={0.01}
                    placeholder={restante.toFixed(2)}
                    value={baixaValor}
                    onChange={e => setBaixaValor(e.target.value)}
                    hasError={!!baixaValorError}
                    helper={baixaValorError ?? undefined}
                  />
                  {!baixaValorError && baixaValor && parseFloat(baixaValor) > 0 && parseFloat(baixaValor) < restante && (
                    <p className="text-xs text-muted-foreground">
                      Baixa parcial — restará {fmt(restante - parseFloat(baixaValor))}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data do pagamento</label>
                  <Input type="date" value={baixaData} onChange={e => setBaixaData(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBaixaTarget(null)} disabled={baixando}>Cancelar</Button>
                <Button
                  onClick={handleBaixa}
                  disabled={baixando || !baixaValor || parseFloat(baixaValor) <= 0 || !!baixaValorError || !baixaData}
                >
                  {baixando ? 'Salvando...' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Dialog: Baixa múltipla */}
      <Dialog open={batchOpen} onOpenChange={o => !o && setBatchOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baixa Múltipla</DialogTitle>
            <DialogDescription>
              Pagamento integral de {selectedTitulos.length} título{selectedTitulos.length !== 1 ? 's' : ''} selecionado{selectedTitulos.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border">
              {selectedTitulos.map(t => {
                const restante = t.valor + t.juros_aplicado - t.valor_pago
                return (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground flex-1 truncate pr-4">{t.descricao}</span>
                    <span className="font-medium whitespace-nowrap">{fmt(restante)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2">
              <span>Total</span>
              <span>{fmt(totalBatch)}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data do pagamento</label>
              <Input type="date" value={batchData} onChange={e => setBatchData(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)} disabled={batchBaixando}>Cancelar</Button>
            <Button onClick={handleBatchBaixa} disabled={batchBaixando || !batchData}>
              {batchBaixando ? 'Processando...' : `Confirmar ${selectedTitulos.length} título${selectedTitulos.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
