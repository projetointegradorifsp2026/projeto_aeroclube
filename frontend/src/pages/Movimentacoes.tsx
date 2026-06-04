import { useEffect, useState, useMemo } from 'react'
import { TablePagination } from '@/components/ui/pagination'
import { Receipt } from 'lucide-react'
import { FilterInput, FilterSelect } from '@/components/ui/filter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { getTitulosPagar } from '@/services/titulosPagarService'
import { getTitulosReceber } from '@/services/titulosReceberService'
import { getMovimentacoes } from '@/services/carteiraService'
import { getCurrentUser } from '@/services/api/auth'
import { cn } from '@/lib/utils'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

type MovTipo = 'entrada' | 'saida' | 'carteira'
type MovStatus = 'em_aberto' | 'pago_parcial' | 'baixado'

interface MovRow {
  id: string
  tipo: MovTipo
  data: string
  descricao: string
  pessoa: string
  valor: number
  valor_pago: number
  status: MovStatus
  carteira_debito?: boolean
}

function StatusBadge({ status }: { status: MovStatus }) {
  if (status === 'baixado') return <Badge variant="success">Baixado</Badge>
  if (status === 'pago_parcial')
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400">
        Pago Parcial
      </Badge>
    )
  return <Badge variant="outline" className="text-muted-foreground">Em Aberto</Badge>
}

export default function Movimentacoes() {
  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.perfil_ativo === 'admin'

  const [rows, setRows] = useState<MovRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<MovTipo | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<MovStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, tipoFilter, statusFilter])

  useEffect(() => {
    const usuarioId = !isAdmin && currentUser ? String(currentUser.id) : undefined
    Promise.all([
      getTitulosPagar(),
      getTitulosReceber(),
      getMovimentacoes(usuarioId),
    ]).then(([pagar, receber, movCarteira]) => {
      const nomeUsuario = currentUser?.nome ?? ''

      const entradas: MovRow[] = receber
        .filter(t =>
          t.status === 'baixado' &&
          t.tipo !== 'carteira' &&
          !(t.valor_carteira && t.valor_carteira >= t.valor) &&
          (isAdmin || t.usuario_nome === nomeUsuario)
        )
        .map(t => ({
          id: `r-${t.id}`,
          tipo: 'entrada' as MovTipo,
          data: t.data_emissao,
          descricao: t.descricao,
          pessoa: t.usuario_nome,
          valor: t.valor,
          valor_pago: t.valor_pago,
          status: t.status as MovStatus,
        }))

      // Títulos tipo 'carteira' (recargas de carteira = créditos)
      const carteiraCreditos: MovRow[] = receber
        .filter(t =>
          t.tipo === 'carteira' &&
          (isAdmin || t.usuario_nome === nomeUsuario)
        )
        .map(t => ({
          id: `c-${t.id}`,
          tipo: 'carteira' as MovTipo,
          data: t.data_emissao,
          descricao: t.descricao,
          pessoa: t.usuario_nome,
          valor: t.valor,
          valor_pago: t.valor_pago,
          status: 'baixado' as MovStatus,
          carteira_debito: false,
        }))

      // MovimentacaoCarteira débitos (uso de carteira em voos e baixas)
      const carteiraDebitos: MovRow[] = movCarteira
        .filter(m => m.tipo === 'debito')
        .map(m => ({
          id: `mv-${m.id}`,
          tipo: 'carteira' as MovTipo,
          data: m.data_transacao,
          descricao: m.descricao,
          pessoa: m.usuario_nome,
          valor: m.valor,
          valor_pago: m.valor,
          status: 'baixado' as MovStatus,
          carteira_debito: true,
        }))

      const saidas: MovRow[] = pagar
        .filter(t =>
          t.status === 'baixado' &&
          (isAdmin || t.favorecido === nomeUsuario)
        )
        .map(t => ({
          id: `p-${t.id}`,
          tipo: 'saida' as MovTipo,
          data: t.data_emissao,
          descricao: t.descricao,
          pessoa: t.favorecido,
          valor: t.valor,
          valor_pago: t.valor_pago ?? 0,
          status: t.status as MovStatus,
        }))

      setRows(
        [...entradas, ...carteiraCreditos, ...carteiraDebitos, ...saidas]
          .sort((a, b) => b.data.localeCompare(a.data))
      )
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => {
      const matchSearch =
        !q || r.pessoa.toLowerCase().includes(q) || r.descricao.toLowerCase().includes(q)
      const matchTipo = tipoFilter === 'all' || r.tipo === tipoFilter
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      return matchSearch && matchTipo && matchStatus
    })
  }, [rows, search, tipoFilter, statusFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Movimentações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registro de todos os títulos a receber e a pagar
        </p>
      </div>

      <div className="flex items-center gap-3">
        <FilterInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por participante ou descrição..."
        />
        <FilterSelect
          value={tipoFilter}
          onChange={v => setTipoFilter(v as MovTipo | 'all')}
        >
          <option value="all">Todos os tipos</option>
          <option value="entrada">Somente entradas</option>
          <option value="saida">Somente saídas</option>
          <option value="carteira">Somente carteira</option>
        </FilterSelect>
        <FilterSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as MovStatus | 'all')}
        >
          <option value="all">Todos os status</option>
          <option value="em_aberto">Em Aberto</option>
          <option value="pago_parcial">Pago Parcial</option>
          <option value="baixado">Baixado</option>
        </FilterSelect>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading
              ? 'Carregando...'
              : `${filtered.length} movimentaç${filtered.length !== 1 ? 'ões' : 'ão'} encontrada${filtered.length !== 1 ? 's' : ''}`}
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
              <Receipt className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma movimentação encontrada</p>
              <p className="text-xs mt-1">As movimentações aparecem conforme títulos são lançados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Data
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Descrição
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                      Participante / Favorecido
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Valor
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                      Pago
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {fmtDate(r.data)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            r.tipo === 'entrada'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : r.tipo === 'carteira'
                              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                          )}
                        >
                          {r.tipo === 'entrada' ? 'Entrada' : r.tipo === 'carteira' ? 'Carteira' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate font-medium">{r.descricao}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {r.pessoa}
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        <span
                          className={
                            r.tipo === 'entrada'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : r.tipo === 'carteira'
                              ? 'text-teal-600 dark:text-teal-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {r.tipo === 'entrada' ? '+' : r.tipo === 'carteira' ? (r.carteira_debito ? '' : '+') : '−'}
                          {fmt(r.valor)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {(r.tipo === 'carteira' && r.carteira_debito) ? '—' : r.valor_pago > 0 ? fmt(r.valor_pago) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
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
    </div>
  )
}
