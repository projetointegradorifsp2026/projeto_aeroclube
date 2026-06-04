import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Plus, Eye, CircleDollarSign, CircleAlert, Wallet } from 'lucide-react'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  TituloReceberFormModal,
  type TituloReceberFormData,
} from '@/components/titulos/TituloReceberFormModal'
import { TituloReceberDetailModal } from '@/components/titulos/TituloReceberDetailModal'
import {
  getTitulosReceber,
  createTituloReceber,
  updateTituloReceber,
  deleteTituloReceber,
  baixarTituloReceber,
  type TituloReceber,
} from '@/services/titulosReceberService'
import { getUsers, debitarCarteira } from '@/services/usersService'
import { TITULO_RECEBER_TIPO_LABELS, type TituloReceberTipo } from '@/mocks/titulos'
import { getCurrentUser } from '@/services/api/auth'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
const todayStr = () => new Date().toISOString().split('T')[0]
const isAtrasado = (t: TituloReceber) =>
  t.status !== 'baixado' && new Date(t.data_vencimento + 'T00:00:00') < new Date()

type TipoFilter = 'all' | TituloReceberTipo

const TIPO_COLORS: Record<TituloReceberTipo, string> = {
  mensalidade: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  pontual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  servico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  voo: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  carteira: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

function TipoBadge({ tipo }: { tipo: TituloReceberTipo }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', TIPO_COLORS[tipo])}>
      {TITULO_RECEBER_TIPO_LABELS[tipo]}
    </span>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface TableProps {
  items: TituloReceber[]
  showBaixa: boolean
  showMulta: boolean
  onBaixa: (t: TituloReceber) => void
  onView: (t: TituloReceber) => void
  emptyMessage: string
  hideDevedor?: boolean
  labelPago?: string
}

function TitulosTable({ items, showBaixa, showMulta, onBaixa, onView, emptyMessage, hideDevedor, labelPago }: TableProps) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [items])
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
        <CircleDollarSign className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {!hideDevedor && (
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Devedor
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                Tipo
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                Descrição
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                Parcela
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Vencimento
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Valor
              </th>
              {showMulta && (
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                  Multa
                </th>
              )}
              <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map(t => (
            <tr key={t.id} className="hover:bg-muted/20 transition-colors">
              {!hideDevedor && (
                <td className="px-4 py-3">
                  <p className="font-medium">{t.usuario_nome}</p>
                </td>
              )}
              <td className="px-4 py-3 hidden sm:table-cell">
                <TipoBadge tipo={t.tipo} />
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px]">
                <p className="truncate">{t.descricao}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                {t.num_parcela}/{t.total_parcelas}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {t.status === 'baixado' && t.data_pagamento ? (
                  <div>
                    <p className="text-muted-foreground">{fmtDate(t.data_vencimento)}</p>
                    <p className="text-xs text-emerald-600">{labelPago ?? 'Recebido em'} {fmtDate(t.data_pagamento)}</p>
                  </div>
                ) : (
                  <p className={cn('text-muted-foreground', isAtrasado(t) && 'text-rose-500 font-medium')}>
                    {fmtDate(t.data_vencimento)}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="font-medium">{fmt(t.valor)}</p>
                {t.status === 'pago_parcial' && (
                  <p className="text-xs text-muted-foreground">
                    Pago: {fmt(t.valor_pago)}
                  </p>
                )}
                {t.valor_carteira && t.valor_carteira > 0 && (
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 mt-0.5">
                    {fmt(t.valor_carteira)} via carteira
                  </span>
                )}
              </td>
              {showMulta && (
                <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                  {(t.multa ?? 0) > 0
                    ? <span className="text-rose-500 font-medium">{fmt(t.multa!)}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onView(t)}
                    title="Ver detalhes"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {showBaixa && (
                    <Button size="sm" onClick={() => onBaixa(t)}>
                      Dar baixa
                      <CircleDollarSign className="h-3.5 w-3.5" />
                    </Button>
                  )}
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

export default function TitulosReceber() {
  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.perfil_ativo === 'admin'

  const [titulos, setTitulos] = useState<TituloReceber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all')

  const [editTitulo, setEditTitulo] = useState<TituloReceber | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TituloReceber | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [baixaTarget, setBaixaTarget] = useState<TituloReceber | null>(null)
  const [baixaValor, setBaixaValor] = useState('')
  const [baixaMulta, setBaixaMulta] = useState('0')
  const [baixaData, setBaixaData] = useState('')
  const [baixando, setBaixando] = useState(false)
  const [baixaUsarCarteira, setBaixaUsarCarteira] = useState(false)
  const [baixaCarteiraValor, setBaixaCarteiraValor] = useState('')
  const [baixaUserSaldo, setBaixaUserSaldo] = useState<number | null>(null)

  const [viewTitulo, setViewTitulo] = useState<TituloReceber | null>(null)

  useEffect(() => {
    getTitulosReceber().then(data => {
      const filtered = isAdmin
        ? data
        : data.filter(t => t.usuario_id === String(currentUser?.id))
      setTitulos(filtered)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return titulos
      .filter(t => {
        const matchSearch =
          !q ||
          t.usuario_nome.toLowerCase().includes(q) ||
          t.descricao.toLowerCase().includes(q)
        const matchTipo = tipoFilter === 'all' || t.tipo === tipoFilter
        return matchSearch && matchTipo
      })
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  }, [titulos, search, tipoFilter])

  const emAbertoList = filtered.filter(
    t => (t.status === 'em_aberto' || t.status === 'pago_parcial') && !isAtrasado(t),
  )
  const emAtrasoList = filtered.filter(t => isAtrasado(t))
  const baixadoList = filtered.filter(t => t.status === 'baixado')

  async function handleSave(data: TituloReceberFormData): Promise<void> {
    if (editTitulo) {
      const updated = await updateTituloReceber(editTitulo.id, {
        usuario_nome: data.usuario_nome,
        tipo: data.tipo,
        descricao: data.descricao,
        num_parcela: editTitulo.num_parcela,
        total_parcelas: editTitulo.total_parcelas,
        valor: data.valor,
        multa: data.multa,
        data_emissao: data.data_emissao,
        data_vencimento: data.parcela_vencimentos[0],
      })
      setTitulos(prev => prev.map(t => (t.id === editTitulo.id ? updated : t)))
    } else {
      const created = await Promise.all(
        data.parcela_vencimentos.map((venc, i) =>
          createTituloReceber({
            usuario_id: data.usuario_id,
            usuario_nome: data.usuario_nome,
            cliente_externo_id: data.cliente_externo_id,
            tipo: data.tipo,
            descricao: data.descricao,
            num_parcela: i + 1,
            total_parcelas: data.total_parcelas,
            valor: data.parcela_valores[i] ?? data.valor,
            valor_pago: 0,
            juros_aplicado: 0,
            multa: 0,
            data_emissao: data.data_emissao,
            data_vencimento: venc,
            data_pagamento: null,
            status: 'em_aberto',
          }),
        ),
      )
      setTitulos(prev => [...prev, ...created])
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteTituloReceber(deleteTarget.id)
    setTitulos(prev => prev.filter(t => t.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  function openCreate() {
    setEditTitulo(null)
    setModalOpen(true)
  }

  function openEdit(t: TituloReceber) {
    setEditTitulo(t)
    setModalOpen(true)
  }

  function handleDeleteRequest() {
    setModalOpen(false)
    setDeleteTarget(editTitulo)
  }

  function openBaixa(t: TituloReceber) {
    const multaVal = t.multa ?? 0
    const restante = t.valor + multaVal - t.valor_pago
    setBaixaTarget(t)
    setBaixaMulta(multaVal.toFixed(2))
    setBaixaValor(restante.toFixed(2))
    setBaixaData(todayStr())
    setBaixaUsarCarteira(false)
    setBaixaCarteiraValor('')
    setBaixaUserSaldo(null)
    // Bug 3: só busca saldo de carteira para participantes (não para clientes externos)
    if (t.usuario_id && !t.is_cliente_externo) {
      getUsers().then(users => {
        const user = users.find(u => u.id === t.usuario_id)
        setBaixaUserSaldo(user?.saldo_carteira ?? 0)
      })
    }
  }

  function openView(t: TituloReceber) {
    setViewTitulo(t)
  }

  function handleViewEdit(t: TituloReceber) {
    setViewTitulo(null)
    openEdit(t)
  }

  function handleViewBaixa(t: TituloReceber) {
    setViewTitulo(null)
    openBaixa(t)
  }

  function handleViewDeleteRequest(t: TituloReceber) {
    setViewTitulo(null)
    setDeleteTarget(t)
  }

  async function handleBaixa() {
    if (!baixaTarget) return
    setBaixando(true)
    const multa = parseFloat(baixaMulta) || 0
    const carteiraAmount = baixaUsarCarteira ? (parseFloat(baixaCarteiraValor) || 0) : 0

    // Bug 5: debita a carteira diretamente (a MovimentacaoCarteira já registra o evento)
    // Não cria mais TituloReceber fantasma de tipo 'carteira'
    if (carteiraAmount > 0 && baixaTarget.usuario_id) {
      await debitarCarteira(baixaTarget.usuario_id, carteiraAmount)
    }

    const totalPayment = (parseFloat(baixaValor) || 0) + multa + carteiraAmount
    const updated = await baixarTituloReceber(
      baixaTarget.id,
      totalPayment,
      baixaData,
      multa,
      carteiraAmount,
    )
    setTitulos(prev => prev.map(t => (t.id === baixaTarget.id ? updated : t)))
    setBaixaTarget(null)
    setBaixando(false)
  }

  const restanteBaixa = baixaTarget
    ? baixaTarget.valor + (parseFloat(baixaMulta) || 0) - baixaTarget.valor_pago
    : 0

  return (
    <div className="pt-2 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isAdmin ? 'Títulos a Receber' : 'Minhas Faturas'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAdmin ? 'Gerencie os títulos a receber do aeroclube' : 'Acompanhe seus pagamentos ao aeroclube'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          placeholder={isAdmin ? 'Buscar por devedor ou descrição...' : 'Buscar por descrição...'}
        />
        <FilterSelect
          value={tipoFilter}
          onChange={v => setTipoFilter(v as TipoFilter)}
        >
          <option value="all">Todos os tipos</option>
          <option value="mensalidade">Mensalidade</option>
          <option value="pontual">Pontual</option>
          <option value="servico">Serviço</option>
          <option value="voo">Voo</option>
          <option value="carteira">Carteira</option>
        </FilterSelect>
        {isAdmin && (
          <Button onClick={openCreate} className="ml-auto shrink-0">
            <Plus className="h-4 w-4" />
            Novo Título
          </Button>
        )}
      </div>

      {/* Tabs + Tables */}
      {loading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="em_aberto">
          <TabsList>
            <TabsTrigger value="em_aberto">
              Em aberto
              {emAbertoList.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-xs font-medium">
                  {emAbertoList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="em_atraso">
              <CircleAlert className="h-3.5 w-3.5" />
              Em atraso
              {emAtrasoList.length > 0 && (
                <span className="ml-1 rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.5 text-xs font-medium">
                  {emAtrasoList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="baixado">
              {isAdmin ? 'Baixados' : 'Quitados'}
              {baixadoList.length > 0 && (
                <span className="ml-1.5 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-xs font-medium">
                  {baixadoList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="em_aberto">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {emAbertoList.length} título{emAbertoList.length !== 1 ? 's' : ''} em aberto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TitulosTable
                  items={emAbertoList}
                  showBaixa={isAdmin}
                  showMulta={false}
                  onBaixa={openBaixa}
                  onView={openView}
                  emptyMessage="Nenhum título em aberto"
                  hideDevedor={!isAdmin}
                  labelPago={isAdmin ? 'Recebido em' : 'Pago em'}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="em_atraso">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {emAtrasoList.length} título{emAtrasoList.length !== 1 ? 's' : ''} em atraso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TitulosTable
                  items={emAtrasoList}
                  showBaixa={isAdmin}
                  showMulta
                  onBaixa={openBaixa}
                  onView={openView}
                  emptyMessage="Nenhum título em atraso"
                  hideDevedor={!isAdmin}
                  labelPago={isAdmin ? 'Recebido em' : 'Pago em'}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="baixado">
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {baixadoList.length} título{baixadoList.length !== 1 ? 's' : ''} baixado{baixadoList.length !== 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TitulosTable
                  items={baixadoList}
                  showBaixa={false}
                  showMulta
                  onBaixa={openBaixa}
                  onView={openView}
                  emptyMessage="Nenhum título baixado"
                  hideDevedor={!isAdmin}
                  labelPago={isAdmin ? 'Recebido em' : 'Pago em'}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Create / Edit Modal */}
      <TituloReceberFormModal
        titulo={editTitulo}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDeleteRequest={editTitulo ? handleDeleteRequest : undefined}
      />

      {/* Detail Modal */}
      <TituloReceberDetailModal
        titulo={viewTitulo}
        allTitulos={titulos}
        open={!!viewTitulo}
        onClose={() => setViewTitulo(null)}
        onEdit={handleViewEdit}
        onBaixa={handleViewBaixa}
        onDeleteRequest={handleViewDeleteRequest}
        canEdit={isAdmin}
      />

      {/* Baixa Dialog */}
      {(() => {
        const cashAmount = parseFloat(baixaValor) || 0
        const multaVal = parseFloat(baixaMulta) || 0
        const carteiraUsadaNum = baixaUsarCarteira ? (parseFloat(baixaCarteiraValor) || 0) : 0
        const totalBaixa = cashAmount + carteiraUsadaNum
        const carteiraMaxUsavel = Math.min(baixaUserSaldo ?? 0, restanteBaixa)
        const atrasado = !!baixaTarget && isAtrasado(baixaTarget)

        const carteiraError =
          carteiraUsadaNum > (baixaUserSaldo ?? 0)
            ? `Saldo insuficiente (máximo: ${fmt(baixaUserSaldo ?? 0)})`
            : carteiraUsadaNum > restanteBaixa
            ? `Maior que o saldo restante (${fmt(restanteBaixa)})`
            : null

        const baixaValorError =
          totalBaixa > restanteBaixa
            ? `A soma (${fmt(totalBaixa)}) excede o saldo restante (${fmt(restanteBaixa)})`
            : null

        const canConfirm =
          !baixando &&
          !!baixaData &&
          !baixaValorError &&
          !carteiraError &&
          totalBaixa > 0

        return (
          <Dialog open={!!baixaTarget} onOpenChange={o => { if (!o) { setBaixaTarget(null); setBaixaUsarCarteira(false); setBaixaCarteiraValor('') } }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Registrar recebimento</DialogTitle>
                <DialogDescription>
                  <strong className="text-foreground">{baixaTarget?.usuario_nome}</strong>
                  {' — '}
                  {baixaTarget?.descricao}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor original</span>
                    <span className="font-medium">{baixaTarget && fmt(baixaTarget.valor)}</span>
                  </div>
                  {atrasado && multaVal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Multa</span>
                      <span className="text-rose-500">+{fmt(multaVal)}</span>
                    </div>
                  )}
                  {baixaTarget && baixaTarget.valor_pago > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Já recebido</span>
                      <span className="text-emerald-600">−{fmt(baixaTarget.valor_pago)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1">
                    <span className="text-muted-foreground font-medium">Saldo restante</span>
                    <span className="font-semibold">{fmt(restanteBaixa)}</span>
                  </div>
                </div>

                {/* Carteira option */}
                {baixaUserSaldo !== null && baixaUserSaldo > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5" />
                        Saldo da carteira
                      </span>
                      <span className="font-medium">{fmt(baixaUserSaldo)}</span>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                        checked={baixaUsarCarteira}
                        onChange={e => {
                          const checked = e.target.checked
                          setBaixaUsarCarteira(checked)
                          if (!checked) {
                            setBaixaCarteiraValor('')
                            setBaixaValor(restanteBaixa.toFixed(2))
                          } else {
                            const c = carteiraMaxUsavel
                            setBaixaCarteiraValor(c.toFixed(2))
                            setBaixaValor(Math.max(0, restanteBaixa - c).toFixed(2))
                          }
                        }}
                      />
                      Usar saldo da carteira
                    </label>
                    {baixaUsarCarteira && (
                      <div className="pl-6 space-y-1.5">
                        <label className="text-sm font-medium">Valor da carteira (R$)</label>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          max={carteiraMaxUsavel}
                          className={cn(
                            'h-10 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus:ring-2 transition-shadow',
                            carteiraError
                              ? 'border-destructive focus:ring-destructive/50'
                              : 'border-input focus:ring-ring/50',
                          )}
                          value={baixaCarteiraValor}
                          onChange={e => {
                            const c = parseFloat(e.target.value) || 0
                            setBaixaCarteiraValor(e.target.value)
                            setBaixaValor(Math.max(0, restanteBaixa - c).toFixed(2))
                          }}
                        />
                        {carteiraError && (
                          <p className="text-xs text-destructive">{carteiraError}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {atrasado && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Multa (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                      value={baixaMulta}
                      onChange={e => {
                        const novaMulta = parseFloat(e.target.value) || 0
                        setBaixaMulta(e.target.value)
                        // Bug 2: recalcula o valor em dinheiro para cobrir original + nova multa
                        if (baixaTarget) {
                          const novoRestante = baixaTarget.valor + novaMulta - baixaTarget.valor_pago
                          const carteiraAtual = baixaUsarCarteira ? (parseFloat(baixaCarteiraValor) || 0) : 0
                          setBaixaValor(Math.max(0, novoRestante - carteiraAtual).toFixed(2))
                        }
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {baixaUsarCarteira ? 'Valor em dinheiro (R$)' : 'Valor a receber (R$)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={cn(
                      'h-10 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus:ring-2 transition-shadow',
                      baixaValorError
                        ? 'border-destructive focus:ring-destructive/50'
                        : 'border-input focus:ring-ring/50',
                    )}
                    value={baixaValor}
                    onChange={e => setBaixaValor(e.target.value)}
                  />
                  {baixaValorError ? (
                    <p className="text-xs text-destructive">{baixaValorError}</p>
                  ) : baixaUsarCarteira ? (
                    totalBaixa > 0 && totalBaixa < restanteBaixa ? (
                      <p className="text-xs text-muted-foreground">
                        Total: {fmt(totalBaixa)} — baixa parcial, restará {fmt(restanteBaixa - totalBaixa)}
                      </p>
                    ) : totalBaixa >= restanteBaixa && !baixaValorError ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Total: {fmt(totalBaixa)} — quita o saldo restante
                      </p>
                    ) : null
                  ) : (
                    cashAmount > 0 && cashAmount < restanteBaixa && (
                      <p className="text-xs text-muted-foreground">
                        Baixa parcial — restará {fmt(restanteBaixa - cashAmount)}
                      </p>
                    )
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data de recebimento</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                    value={baixaData}
                    onChange={e => setBaixaData(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBaixaTarget(null)} disabled={baixando}>
                  Cancelar
                </Button>
                <Button onClick={handleBaixa} disabled={!canConfirm}>
                  {baixando ? 'Registrando...' : 'Confirmar Recebimento'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o título de{' '}
              <strong className="text-foreground">{deleteTarget?.usuario_nome}</strong>? Esta ação
              não pode ser desfeita.
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
