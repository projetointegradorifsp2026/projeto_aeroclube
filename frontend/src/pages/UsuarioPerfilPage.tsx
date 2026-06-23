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
  KeyRound,
  History,
  ChevronDown,
  Landmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { TablePagination } from '@/components/ui/pagination'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getUsers,
  updateUser,
  addSaldoCarteira,
  removerSaldoCarteira,
  resetPassword,
  getMovimentacoesCarteira,
  type User,
  type MovimentacaoCarteira,
  type CreditoHorasMetadados,
} from '@/services/usersService'
import { getAeronaves, type Aeronave } from '@/services/aeronavesService'
import { UserFormModal, type UserFormData } from '@/components/users/UserFormModal'
import {
  getDadosBancariosUsuario, salvarDadosBancarios, emptyDadosBancarios, type DadosBancarios,
} from '@/services/cnabService'
import { AlterarSenhaModal } from '@/components/users/AlterarSenhaModal'
import PermissoesUsuarioCard from '@/components/permissoes/PermissoesUsuarioCard'
import { getCurrentUser } from '@/services/api/auth'
import {
  getTitulosReceber,
  baixarTituloReceber,
  quitacaoMultipla,
  type TituloReceber,
} from '@/services/titulosReceberService'
import { useAlert } from '@/components/feedback/alert-provider'
import { getTitulosPagar } from '@/services/titulosPagarService'
import { PROFILE_LABELS, type UserProfile } from '@/mocks/users'
import { TITULO_RECEBER_TIPO_LABELS, type TituloReceberStatus } from '@/mocks/titulos'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
const todayStr = () => new Date().toISOString().split('T')[0]

type MovRow = {
  id: string
  tipo: 'entrada' | 'saida' | 'carteira'
  data: string
  descricao: string
  valor: number
  valor_pago: number
  status: 'em_aberto' | 'pago_parcial' | 'baixado'
  carteira_debito?: boolean
}

const PROFILE_COLORS: Record<UserProfile, string> = {
  admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  aluno: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  socio: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  externo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  instrutor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  funcionario: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
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
  const alert = useAlert()

  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.perfil_ativo === 'admin'

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const [alterarSenhaOpen, setAlterarSenhaOpen] = useState(false)
  const [dadosBancarios, setDadosBancarios] = useState<DadosBancarios>(emptyDadosBancarios())
  // Snapshot dos dados bancários como carregados, para detectar alterações.
  const [dadosBancariosInicial, setDadosBancariosInicial] = useState<DadosBancarios>(emptyDadosBancarios())
  const [dadosBancariosLoading, setDadosBancariosLoading] = useState(false)
  const [dadosBancariosSaving, setDadosBancariosSaving] = useState(false)
  const dadosBancariosDirty = JSON.stringify(dadosBancarios) !== JSON.stringify(dadosBancariosInicial)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  // Carteira
  const [saldoVisible, setSaldoVisible] = useState(false)
  const [addSaldoOpen, setAddSaldoOpen] = useState(false)
  const [addSaldoTab, setAddSaldoTab] = useState<'valor' | 'horas'>('valor')
  const [addSaldoValor, setAddSaldoValor] = useState('')
  const [addSaldoData, setAddSaldoData] = useState(todayStr())
  const [addSaldoSaving, setAddSaldoSaving] = useState(false)
  // Aba "Por Horas"
  const [aeronaves, setAeronaves] = useState<Aeronave[]>([])
  const [horasAeronaveId, setHorasAeronaveId] = useState('')
  const [horasTipoVoo, setHorasTipoVoo] = useState<'solo' | 'duplo'>('solo')
  const [horasQtd, setHorasQtd] = useState('')
  const [horasValorInput, setHorasValorInput] = useState('')
  // Histórico da carteira
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [historicoData, setHistoricoData] = useState<MovimentacaoCarteira[]>([])
  const [historicoLoading, setHistoricoLoading] = useState(false)
  const [historicoAeronaves, setHistoricoAeronaves] = useState<Aeronave[]>([])
  const [expandedEquiv, setExpandedEquiv] = useState<Set<string>>(new Set())
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
    const [allReceber, allPagar, movCarteira] = await Promise.all([
      getTitulosReceber(),
      getTitulosPagar(),
      getMovimentacoesCarteira(id!),
    ])
    const userReceber = allReceber.filter(t => t.usuario_id === id && t.valor_pago > 0)
    const userPagar = allPagar.filter(t => t.favorecido === nomeUsuario && t.status === 'baixado')
    const entradas: MovRow[] = userReceber.map(t => ({
      id: `r-${t.id}`,
      tipo: 'entrada' as const,
      data: t.data_emissao,
      descricao: t.descricao,
      valor: t.valor,
      valor_pago: t.valor_pago,
      status: t.status,
    }))
    const carteiraRows: MovRow[] = movCarteira.filter(m => m.tipo === 'debito').map(m => ({
      id: `mv-${m.id}`,
      tipo: 'carteira' as const,
      data: m.data_transacao,
      descricao: m.descricao,
      valor: m.valor,
      valor_pago: 0,
      status: 'baixado' as const,
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
    setMovimentacoes([...entradas, ...carteiraRows, ...saidas].sort((a, b) => b.data.localeCompare(a.data)))
    setMovPage(1)
  }

  useEffect(() => {
    if (!id) return
    if (isAdmin) {
      Promise.all([getUsers(), getTitulosReceber(), getTitulosPagar(), getMovimentacoesCarteira(id)]).then(
        ([users, allReceber, allPagar, movCarteira]) => {
          const found = users.find(u => u.id === id)
          if (!found) { navigate('/usuarios'); return }

          const userReceber = allReceber.filter(t => t.usuario_id === id && t.valor_pago > 0)
          const userPagar = allPagar.filter(t => t.favorecido === found.nome && t.status === 'baixado')

          const entradas: MovRow[] = userReceber.map(t => ({
            id: `r-${t.id}`,
            tipo: 'entrada' as const,
            data: t.data_emissao,
            descricao: t.descricao,
            valor: t.valor,
            valor_pago: t.valor_pago,
            status: t.status,
          }))
          const carteiraRows: MovRow[] = movCarteira.filter(m => m.tipo === 'debito').map(m => ({
            id: `mv-${m.id}`,
            tipo: 'carteira' as const,
            data: m.data_transacao,
            descricao: m.descricao,
            valor: m.valor,
            valor_pago: 0,
            status: 'baixado' as const,
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
            [...entradas, ...carteiraRows, ...saidas].sort((a, b) => b.data.localeCompare(a.data)),
          )
          setTitulos(
            allReceber
              .filter(t => t.usuario_id === id && t.status !== 'baixado')
              .sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento)),
          )
          setLoadingUser(false)
        },
      ).catch(e => {
        alert.error(e, 'Erro ao carregar dados do usuário.')
        setLoadingUser(false)
      })
      // Carrega dados bancários em paralelo
      setDadosBancariosLoading(true)
      getDadosBancariosUsuario(id)
        .then(d => {
          const dados = d ?? emptyDadosBancarios()
          setDadosBancarios(dados)
          setDadosBancariosInicial(dados)
        })
        .catch(e => alert.error(e, 'Erro ao carregar dados bancários.'))
        .finally(() => setDadosBancariosLoading(false))
    } else {
      getUsers().then(users => {
        const found = users.find(u => u.id === id)
        if (!found) { navigate('/dashboard'); return }
        setUser(found)
        setLoadingUser(false)
      }).catch(e => {
        alert.error(e, 'Erro ao carregar dados do usuário.')
        setLoadingUser(false)
      })
      // Carrega dados bancários para o próprio usuário
      setDadosBancariosLoading(true)
      getDadosBancariosUsuario(id)
        .then(d => {
          const dados = d ?? emptyDadosBancarios()
          setDadosBancarios(dados)
          setDadosBancariosInicial(dados)
        })
        .catch(e => alert.error(e, 'Erro ao carregar dados bancários.'))
        .finally(() => setDadosBancariosLoading(false))
    }
  }, [id, navigate, isAdmin])

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
    (sum, t) => sum + (t.valor - t.valor_pago),
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

  async function handleSaveDadosBancarios() {
    if (!user) return
    setDadosBancariosSaving(true)
    try {
      await salvarDadosBancarios({ ...dadosBancarios, usuario: parseInt(user.id, 10), entidade: null })
      // Atualiza o snapshot para o botão sumir até a próxima alteração.
      setDadosBancariosInicial(dadosBancarios)
    } finally {
      setDadosBancariosSaving(false)
    }
  }

  async function handleSaveUser(data: UserFormData) {
    if (!user) return
    const updated = await updateUser(user.id, data, user.perfis)
    setUser(updated)
  }

  async function handleResetPassword() {
    if (!user) return
    setResetting(true)
    try {
      await resetPassword(user.id)
      setResetSuccess(true)
    } finally {
      setResetting(false)
    }
  }

  function closeResetDialog() {
    setResetDialogOpen(false)
    setResetSuccess(false)
  }

  function getHorasTarifa(): number {
    if (!horasAeronaveId) return 0
    const aeronave = aeronaves.find(a => a.id === horasAeronaveId)
    if (!aeronave) return 0
    if (aeronave.tipo === 'aviao') return horasTipoVoo === 'duplo' ? aeronave.valor_duplo : aeronave.valor_solo
    return aeronave.valor_fixo_inicial
  }

  function handleHorasQtdChange(val: string) {
    setHorasQtd(val)
    const tarifa = getHorasTarifa()
    if (tarifa > 0 && val) {
      setHorasValorInput((parseFloat(val) * tarifa).toFixed(2))
    } else {
      setHorasValorInput('')
    }
  }

  function handleHorasValorChange(val: string) {
    setHorasValorInput(val)
    const tarifa = getHorasTarifa()
    if (tarifa > 0 && val) {
      setHorasQtd((parseFloat(val) / tarifa).toFixed(2))
    } else {
      setHorasQtd('')
    }
  }

  function openAddSaldo() {
    setAddSaldoValor('')
    setAddSaldoData(todayStr())
    setAddSaldoTab('valor')
    setHorasAeronaveId('')
    setHorasTipoVoo('solo')
    setHorasQtd('')
    setHorasValorInput('')
    if (aeronaves.length === 0) {
      getAeronaves().then(av => setAeronaves(av.filter(a => a.is_active)))
    }
    setAddSaldoOpen(true)
  }

  async function handleAddSaldo() {
    if (!user) return
    const tarifa = getHorasTarifa()
    const valor = addSaldoTab === 'horas'
      ? parseFloat(horasValorInput)
      : parseFloat(addSaldoValor)
    if (!valor || valor <= 0 || !addSaldoData) return

    let descricao = 'Recarga de carteira'
    let horasMetadados: CreditoHorasMetadados | undefined

    if (addSaldoTab === 'horas' && horasAeronaveId) {
      const aeronave = aeronaves.find(a => a.id === horasAeronaveId)
      if (aeronave) {
        const labelTipo = aeronave.tipo === 'aviao'
          ? (horasTipoVoo === 'duplo' ? 'Duplo Comando' : 'Solo')
          : 'Sessão'
        descricao = `Compra de horas — ${aeronave.nome} (${parseFloat(horasQtd).toFixed(2)}h ${labelTipo})`
        horasMetadados = {
          aeronave_id: parseInt(aeronave.id),
          aeronave_nome: aeronave.nome,
          aeronave_tipo: aeronave.tipo as 'aviao' | 'planador',
          tipo_voo: aeronave.tipo === 'aviao' ? horasTipoVoo : null,
          tarifa,
          horas: parseFloat(horasQtd),
        }
      }
    }

    setAddSaldoSaving(true)
    try {
      const updatedUser = await addSaldoCarteira(user.id, valor, descricao, addSaldoData, horasMetadados)
      setUser(updatedUser)
      await reloadMovimentacoes(updatedUser.nome)
      setAddSaldoOpen(false)
    } finally {
      setAddSaldoSaving(false)
    }
  }

  async function handleOpenHistorico() {
    if (!user) return
    setHistoricoOpen(true)
    setHistoricoLoading(true)
    try {
      const [mov, aeronaves] = await Promise.all([
        getMovimentacoesCarteira(user.id),
        getAeronaves(),
      ])
      setHistoricoData(mov.filter(m => m.tipo === 'credito'))
      setHistoricoAeronaves(aeronaves.filter(a => a.is_active))
    } finally {
      setHistoricoLoading(false)
    }
  }

  async function handleRemoveSaldo() {
    if (!user) return
    const valor = parseFloat(removeSaldoValor)
    if (!valor || valor <= 0 || !removeSaldoData) return
    if (valor > user.saldo_carteira) return
    setRemoveSaldoSaving(true)
    try {
      await removerSaldoCarteira(user.id, valor)
      setRemoveSaldoOpen(false)
      setRemoveSaldoValor('')
    } catch (e) {
      alert.error(e, 'Erro ao remover saldo da carteira.')
    } finally {
      setRemoveSaldoSaving(false)
    }
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
    if (totalBatch <= 0) return
    setBatchBaixando(true)
    try {
      // Distribui o valor pelos títulos por ordem de vencimento (baixa parcial no último).
      const ids = [...selectedTitulos]
        .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
        .map(t => t.id)
      const { titulos: updates, valorRestante } = await quitacaoMultipla(ids, totalBatch, batchData)
      setTitulos(prev =>
        prev
          .map(t => updates.find(u => u.id === t.id) ?? t)
          .filter(t => t.status !== 'baixado')
          .sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento)),
      )
      const baixados = updates.filter(u => u.status === 'baixado').length
      alert.success(
        valorRestante > 0
          ? `${baixados} título(s) quitado(s). Sobraram ${fmt(valorRestante)} não utilizados.`
          : `${baixados} título(s) quitado(s) com a distribuição.`,
      )
      setSelectedIds(new Set())
      setBatchOpen(false)
    } catch (err) {
      alert.error(err)
    } finally {
      setBatchBaixando(false)
    }
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
    if (user && removeSaldoNum > user.saldo_carteira) return `Saldo insuficiente (disponível: ${fmt(user.saldo_carteira)})`
    return null
  })()

  return (
    <div className="pt-2 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(isAdmin ? '/usuarios' : '/dashboard')}>
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
              <div className="flex gap-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setResetDialogOpen(true)}>
                    <KeyRound className="h-3.5 w-3.5" />
                    Resetar Senha
                  </Button>
                )}
                {String(currentUser?.id ?? '') === String(user.id) && (
                  <Button variant="outline" size="sm" onClick={() => setAlterarSenhaOpen(true)}>
                    <KeyRound className="h-3.5 w-3.5" />
                    Alterar Senha
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Carteira</CardTitle>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleOpenHistorico} title="Histórico de créditos">
                <History className="h-4 w-4 text-muted-foreground" />
              </Button>
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
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openAddSaldo}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setRemoveSaldoValor(''); setRemoveSaldoData(todayStr()); setRemoveSaldoOpen(true) }}
                  >
                    <Minus className="h-4 w-4" />
                    Remover
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dados Bancários */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Dados Bancários</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 pb-5">
          {dadosBancariosLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (() => {
            const selectCls = 'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'
            const setField = <K extends keyof DadosBancarios>(k: K, v: DadosBancarios[K]) =>
              setDadosBancarios(p => ({ ...p, [k]: v }))
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Banco</label>
                    <Input value={dadosBancarios.banco} onChange={e => setField('banco', e.target.value)} placeholder="Ex: Sicoob" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Código do Banco</label>
                    <Input value={dadosBancarios.codigo_banco} onChange={e => setField('codigo_banco', e.target.value)} placeholder="Ex: 756" />
                  </div>
                </div>
                <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Agência</label>
                    <Input value={dadosBancarios.agencia} onChange={e => setField('agencia', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">DV</label>
                    <Input value={dadosBancarios.agencia_dv} onChange={e => setField('agencia_dv', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Conta</label>
                    <Input value={dadosBancarios.conta} onChange={e => setField('conta', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">DV</label>
                    <Input value={dadosBancarios.conta_dv} onChange={e => setField('conta_dv', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tipo de Conta</label>
                    <select className={selectCls} value={dadosBancarios.tipo_conta} onChange={e => setField('tipo_conta', e.target.value as DadosBancarios['tipo_conta'])}>
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Conta Poupança</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Chave Pix</label>
                    <Input value={dadosBancarios.chave_pix} onChange={e => setField('chave_pix', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Titular</label>
                    <Input value={dadosBancarios.titular} onChange={e => setField('titular', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">CPF/CNPJ do Titular</label>
                    <Input value={dadosBancarios.cpf_cnpj_titular} onChange={e => setField('cpf_cnpj_titular', e.target.value)} />
                  </div>
                </div>
                {dadosBancariosDirty && (
                  <div className="flex justify-end">
                    <Button onClick={handleSaveDadosBancarios} disabled={dadosBancariosSaving}>
                      {dadosBancariosSaving ? 'Salvando...' : 'Salvar Dados Bancários'}
                    </Button>
                  </div>
                )}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Telas liberadas — só quando o usuário visualizado é administrador */}
      {isAdmin && user && user.perfis.includes('admin') && (
        <PermissoesUsuarioCard usuarioId={parseInt(user.id, 10)} />
      )}

      {/* Movimentações — visível apenas para admin */}
      {isAdmin && <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Movimentações</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {movimentacoes.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia><Receipt className="h-8 w-8 text-muted-foreground opacity-30" /></EmptyMedia>
                <EmptyTitle>Nenhuma movimentação encontrada</EmptyTitle>
                <EmptyDescription>As movimentações aparecem conforme títulos são lançados</EmptyDescription>
              </EmptyHeader>
            </Empty>
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
                            : m.tipo === 'carteira'
                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                        )}>
                          {m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'carteira' ? 'Carteira' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate font-medium">{m.descricao}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        {m.tipo === 'carteira' ? (
                          <span className="text-teal-600 dark:text-teal-400">{fmt(m.valor)}</span>
                        ) : (
                          <span className={m.tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {m.tipo === 'entrada' ? '+' : '−'}{fmt(m.valor)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {m.tipo === 'carteira' ? '—' : m.valor_pago > 0 ? fmt(m.valor_pago) : '—'}
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
      </Card>}

      {/* Títulos a Receber — visível apenas para admin */}
      {isAdmin && <Card>
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
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia><Receipt className="h-8 w-8 text-muted-foreground opacity-30" /></EmptyMedia>
                <EmptyTitle>Nenhum título em aberto</EmptyTitle>
                <EmptyDescription>Os títulos em aberto aparecem conforme são lançados</EmptyDescription>
              </EmptyHeader>
            </Empty>
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
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{fmt(t.valor)}</td>
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
      </Card>}

      {/* Modal de edição */}
      <UserFormModal user={user} open={editOpen} onClose={() => setEditOpen(false)} onSave={handleSaveUser} restrictedFields={!isAdmin} />

      <AlterarSenhaModal open={alterarSenhaOpen} onClose={() => setAlterarSenhaOpen(false)} />

      {/* Dialog: Adicionar Saldo (Por Valor ou Por Horas) */}
      <Dialog open={addSaldoOpen} onOpenChange={o => !o && setAddSaldoOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Saldo</DialogTitle>
            <DialogDescription>
              Uma Receita pendente será criada. O saldo é creditado somente após faturar e baixar o título.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={addSaldoTab} onValueChange={v => setAddSaldoTab(v as 'valor' | 'horas')}>
            <TabsList className="w-full">
              <TabsTrigger value="valor" className="flex-1">Por Valor</TabsTrigger>
              <TabsTrigger value="horas" className="flex-1">Por Horas</TabsTrigger>
            </TabsList>

            {/* ABA: Por Valor */}
            <TabsContent value="valor" className="space-y-3 pt-2">
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
                <label className="text-sm font-medium">Data de vencimento</label>
                <Input
                  type="date"
                  value={addSaldoData}
                  onChange={e => setAddSaldoData(e.target.value)}
                />
              </div>
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-muted-foreground">
                Saldo atual: <span className="font-medium text-foreground">{fmt(user.saldo_carteira)}</span>
                {' '}— o crédito ocorre ao baixar o título gerado.
              </div>
            </TabsContent>

            {/* ABA: Por Horas */}
            <TabsContent value="horas" className="space-y-3 pt-2">
              {(() => {
                const selectCls = 'h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow'
                const selectedAeronave = aeronaves.find(a => a.id === horasAeronaveId)
                const tarifa = getHorasTarifa()
                const horasLabel = selectedAeronave?.tipo === 'planador' ? 'Sessões' : 'Horas de voo'

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Aeronave</label>
                        <select
                          className={selectCls}
                          value={horasAeronaveId}
                          onChange={e => {
                            setHorasAeronaveId(e.target.value)
                            setHorasQtd('')
                            setHorasValorInput('')
                          }}
                        >
                          <option value="">Selecione</option>
                          {aeronaves.map(a => (
                            <option key={a.id} value={a.id}>{a.nome}</option>
                          ))}
                        </select>
                      </div>

                      {selectedAeronave?.tipo === 'aviao' && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Tipo de voo</label>
                          <select
                            className={selectCls}
                            value={horasTipoVoo}
                            onChange={e => {
                              setHorasTipoVoo(e.target.value as 'solo' | 'duplo')
                              setHorasQtd('')
                              setHorasValorInput('')
                            }}
                          >
                            <option value="solo">Solo</option>
                            <option value="duplo">Duplo Comando</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {selectedAeronave && tarifa > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Tarifa vigente: {fmt(tarifa)}/{selectedAeronave.tipo === 'planador' ? 'sessão' : 'hora'}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{horasLabel}</label>
                        <Input
                          type="number"
                          min={0.1}
                          step={0.1}
                          placeholder="0,0"
                          value={horasQtd}
                          onChange={e => handleHorasQtdChange(e.target.value)}
                          disabled={!horasAeronaveId}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Valor R$</label>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          placeholder="0,00"
                          value={horasValorInput}
                          onChange={e => handleHorasValorChange(e.target.value)}
                          disabled={!horasAeronaveId}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Data de vencimento</label>
                      <Input
                        type="date"
                        value={addSaldoData}
                        onChange={e => setAddSaldoData(e.target.value)}
                      />
                    </div>

                    {horasValorInput && parseFloat(horasValorInput) > 0 && (
                      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-muted-foreground">
                        O crédito de <span className="font-medium text-foreground">{fmt(parseFloat(horasValorInput))}</span> ocorre ao baixar o título gerado.
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSaldoOpen(false)} disabled={addSaldoSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddSaldo}
              disabled={
                addSaldoSaving ||
                !addSaldoData ||
                (addSaldoTab === 'valor' && (!addSaldoValor || !!addSaldoError || parseFloat(addSaldoValor) <= 0)) ||
                (addSaldoTab === 'horas' && (!horasAeronaveId || !horasValorInput || parseFloat(horasValorInput) <= 0))
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
              Um Custo pendente será criado. O saldo é debitado somente após faturar e baixar o título.
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
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-muted-foreground">
              Saldo atual: <span className="font-medium text-foreground">{fmt(user.saldo_carteira)}</span>
              {' '}— o débito ocorre ao baixar o título gerado.
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
          ? baixaTarget.valor - baixaTarget.valor_pago
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

      {/* Dialog: Quitação múltipla */}
      {(() => {
        const ordenados = [...selectedTitulos].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
        let restante = totalBatch
        const distrib = ordenados.map(t => {
          const saldo = t.valor - t.valor_pago
          const aplicar = Math.max(0, Math.min(restante, saldo))
          restante -= aplicar
          return { t, saldo, aplicar, quita: aplicar >= saldo - 0.005 && aplicar > 0 }
        })
        return (
      <Dialog open={batchOpen} onOpenChange={o => !o && setBatchOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quitação Múltipla</DialogTitle>
            <DialogDescription>
              Quitação de {selectedTitulos.length} título{selectedTitulos.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 overflow-x-hidden">
            <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border">
              {distrib.map(({ t, saldo, aplicar, quita }) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2 min-w-0">
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">{t.descricao}</span>
                  <span className="shrink-0 whitespace-nowrap text-right">
                    <span className={cn('font-medium', aplicar > 0 ? 'text-foreground' : 'text-muted-foreground')}>{fmt(aplicar)}</span>
                    <span className="text-muted-foreground"> / {fmt(saldo)}</span>
                    {aplicar > 0 && (
                      <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-xs', quita ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                        {quita ? 'quita' : 'parcial'}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2">
              <span>Total a quitar</span>
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
              {batchBaixando ? 'Processando...' : 'Confirmar quitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        )
      })()}

      {/* Dialog: Histórico da Carteira */}
      <Dialog open={historicoOpen} onOpenChange={o => { if (!o) { setHistoricoOpen(false); setExpandedEquiv(new Set()) } }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico de Créditos — {user.nome}</DialogTitle>
            <DialogDescription>
              Créditos adicionados à carteira com equivalência em horas por aeronave.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            {historicoLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : historicoData.length === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia><Wallet className="h-8 w-8 text-muted-foreground opacity-30" /></EmptyMedia>
                  <EmptyTitle>Nenhum crédito registrado</EmptyTitle>
                  <EmptyDescription>O histórico de créditos aparecerá aqui quando disponível</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (() => {
              const totalVencido = historicoData
                .filter(m => m.status_lote === 'expirado' && (m.saldo_restante ?? 0) > 0)
                .reduce((acc, m) => acc + (m.saldo_restante ?? 0), 0)
              return (
                <>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">Data</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">Valor R$</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">Saldo restante</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">Vencimento</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Equivalência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {historicoData.map(m => {
                        const expirado = m.status_lote === 'expirado'
                        const expanded = expandedEquiv.has(m.id)
                        const saldoRef = m.saldo_restante ?? m.valor
                        return (
                          <tr key={m.id} className={cn('hover:bg-muted/20', expirado && 'opacity-60')}>
                            <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                              {fmtDate(m.data_transacao.split('T')[0])}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                +{fmt(m.valor)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              {m.saldo_restante != null ? (
                                <span className={cn('font-semibold', m.saldo_restante > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                                  {fmt(m.saldo_restante)}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {m.data_vencimento ? (
                                <span className={cn('text-sm', expirado ? 'text-rose-500' : '')}>
                                  {fmtDate(m.data_vencimento)}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {expirado ? (
                                <span className="inline-flex rounded-full bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                                  Expirado
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                  Válido
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() => setExpandedEquiv(prev => {
                                  const next = new Set(prev)
                                  next.has(m.id) ? next.delete(m.id) : next.add(m.id)
                                  return next
                                })}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Ver equivalência
                                <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                              </button>
                              {expanded && (
                                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-1.5">
                                  {expirado && (
                                    <span className="text-rose-500 italic mb-0.5">Tarifa travada expirada — usando tarifa atual</span>
                                  )}
                                  {expirado || !m.tarifas_historicas || Object.keys(m.tarifas_historicas).length === 0
                                    ? historicoAeronaves.filter(a => a.is_active).map(a => {
                                        if (a.tipo === 'aviao') {
                                          const solo = a.valor_solo > 0 ? `${(saldoRef / a.valor_solo).toFixed(1)}h solo` : null
                                          const duplo = a.valor_duplo > 0 ? `${(saldoRef / a.valor_duplo).toFixed(1)}h duplo` : null
                                          const eq = [solo, duplo].filter(Boolean).join(' / ')
                                          return <span key={a.id}><span className="font-medium text-foreground">{a.nome}:</span> {eq}</span>
                                        } else {
                                          const sessoes = a.valor_fixo_inicial > 0
                                            ? `${(saldoRef / a.valor_fixo_inicial).toFixed(1)} sessões`
                                            : '—'
                                          return <span key={a.id}><span className="font-medium text-foreground">{a.nome}:</span> {sessoes}</span>
                                        }
                                      })
                                    : Object.entries(m.tarifas_historicas).map(([id, t]) => {
                                        if (t.tipo === 'aviao') {
                                          const solo = t.tarifa_solo ? parseFloat(t.tarifa_solo) : 0
                                          const duplo = t.tarifa_duplo_comando ? parseFloat(t.tarifa_duplo_comando) : 0
                                          const eqSolo = solo > 0 ? `${(saldoRef / solo).toFixed(1)}h solo` : null
                                          const eqDuplo = duplo > 0 ? `${(saldoRef / duplo).toFixed(1)}h duplo` : null
                                          const eq = [eqSolo, eqDuplo].filter(Boolean).join(' / ')
                                          return <span key={id}><span className="font-medium text-foreground">{t.nome}:</span> {eq}</span>
                                        } else {
                                          const fixo = t.valor_fixo_inicial ? parseFloat(t.valor_fixo_inicial) : 0
                                          const sessoes = fixo > 0 ? `${(saldoRef / fixo).toFixed(1)} sessões` : '—'
                                          return <span key={id}><span className="font-medium text-foreground">{t.nome}:</span> {sessoes}</span>
                                        }
                                      })
                                  }
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                  {totalVencido > 0 && (
                    <div className="mx-4 my-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm dark:border-rose-900 dark:bg-rose-950/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-rose-700 dark:text-rose-400 font-semibold">Saldo expirado disponível</span>
                        <span className="text-rose-700 dark:text-rose-400 font-bold">{fmt(totalVencido)}</span>
                      </div>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">
                        Este saldo pode ser usado, porém sem tarifa travada — será cobrado pela tarifa atual da aeronave no momento do voo.
                      </p>
                      <div className="flex flex-col gap-0.5 text-xs text-rose-600 dark:text-rose-400">
                        {historicoAeronaves.filter(a => a.is_active).map(a => {
                          if (a.tipo === 'aviao') {
                            const solo = a.valor_solo > 0 ? `${(totalVencido / a.valor_solo).toFixed(1)}h solo` : null
                            const duplo = a.valor_duplo > 0 ? `${(totalVencido / a.valor_duplo).toFixed(1)}h duplo` : null
                            const eq = [solo, duplo].filter(Boolean).join(' / ')
                            return <span key={a.id}><span className="font-medium">{a.nome}:</span> {eq}</span>
                          } else {
                            const sessoes = a.valor_fixo_inicial > 0
                              ? `${(totalVencido / a.valor_fixo_inicial).toFixed(1)} sessões`
                              : '—'
                            return <span key={a.id}><span className="font-medium">{a.nome}:</span> {sessoes}</span>
                          }
                        })}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => { setHistoricoOpen(false); setExpandedEquiv(new Set()) }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Resetar Senha (admin only) */}
      <Dialog open={resetDialogOpen} onOpenChange={o => !o && closeResetDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              {resetSuccess
                ? `Senha de ${user.nome} resetada com sucesso. A nova senha é: aero + 5 primeiros dígitos do CPF.`
                : `A senha de ${user.nome} será resetada para: aero + 5 primeiros dígitos do CPF. O usuário deverá trocar a senha no próximo acesso.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {resetSuccess ? (
              <Button onClick={closeResetDialog}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeResetDialog} disabled={resetting}>
                  Cancelar
                </Button>
                <Button onClick={handleResetPassword} disabled={resetting}>
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
