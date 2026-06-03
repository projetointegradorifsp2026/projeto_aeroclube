import { apiGet, apiList } from '@/services/api/client'
import { getTitulosPagar } from '@/services/titulosPagarService'
import { getTitulosReceber } from '@/services/titulosReceberService'

// ─── Tipos retornados pelos novos endpoints ───────────────────────────────────

export interface ResumoFinanceiro {
  total_receber: number
  total_pagar: number
  vencidos_receber: number
  vencidos_pagar: number
  recebidos_mes: number
  pagos_mes: number
  saldo_mes: number
}

export interface VencidoMes {
  mes: string      // 'YYYY-MM'
  label: string    // 'Jan/26'
  quantidade: number
  valor: number
}

export interface EntradaGrupo {
  grupo: string
  tipo: string
  valor: number
  percentual: number
}

export interface MesHistorico {
  mes: number
  label: string
  entradas: number
  saidas: number
  saldo: number
}

// ─── Tipos legacy (mantidos para dashboards de aluno/instrutor) ───────────────

export interface PeriodoData {
  periodo: string
  entradas: number
  saidas: number
}

export interface DespesaCategoria {
  categoria: string
  valor: number
}

export interface Movimentacao {
  id: string
  tipo: 'entrada' | 'saida' | 'carteira'
  pessoa: string
  descricao: string
  valor: number
  data: string
  carteira_debito?: boolean
}

export type TituloVencerTipo = 'pagar' | 'receber'

export interface TituloVencer {
  id: string
  descricao: string
  valor: number
  data: string
  tipo: TituloVencerTipo
}

// ─── Novos endpoints do backend ───────────────────────────────────────────────

export async function getDashboardResumo(): Promise<ResumoFinanceiro> {
  return apiGet<ResumoFinanceiro>('/api/v1/dashboard/resumo/')
}

export interface VencidosPorMesParams {
  tipo?: 'receber' | 'pagar'
  metrica?: 'quantidade' | 'valor'
  data_inicio?: string   // YYYY-MM
  data_fim?: string      // YYYY-MM
  categoria?: string
}

export async function getVencidosPorMes(params: VencidosPorMesParams = {}): Promise<VencidoMes[]> {
  const qs = new URLSearchParams()
  if (params.tipo) qs.set('tipo', params.tipo)
  if (params.metrica) qs.set('metrica', params.metrica)
  if (params.data_inicio) qs.set('data_inicio', params.data_inicio)
  if (params.data_fim) qs.set('data_fim', params.data_fim)
  if (params.categoria) qs.set('categoria', params.categoria)
  const query = qs.toString() ? `?${qs}` : ''
  return apiList<VencidoMes>(`/api/v1/dashboard/vencidos-por-mes/${query}`)
}

export interface EntradasPorGrupoParams {
  data_inicio?: string  // YYYY-MM-DD
  data_fim?: string     // YYYY-MM-DD
}

export async function getEntradasPorGrupo(params: EntradasPorGrupoParams = {}): Promise<EntradaGrupo[]> {
  const qs = new URLSearchParams()
  if (params.data_inicio) qs.set('data_inicio', params.data_inicio)
  if (params.data_fim) qs.set('data_fim', params.data_fim)
  const query = qs.toString() ? `?${qs}` : ''
  return apiList<EntradaGrupo>(`/api/v1/dashboard/entradas-por-grupo/${query}`)
}

export interface HistoricoAnualParams {
  ano?: number
  tipo_pagar?: string    // comma-separated
  tipo_receber?: string  // comma-separated
}

export async function getHistoricoAnual(params: HistoricoAnualParams = {}): Promise<MesHistorico[]> {
  const qs = new URLSearchParams()
  if (params.ano) qs.set('ano', String(params.ano))
  if (params.tipo_pagar) qs.set('tipo_pagar', params.tipo_pagar)
  if (params.tipo_receber) qs.set('tipo_receber', params.tipo_receber)
  const query = qs.toString() ? `?${qs}` : ''
  return apiList<MesHistorico>(`/api/v1/dashboard/historico-anual/${query}`)
}

// ─── Funções legacy (usadas pelos dashboards de aluno e instrutor) ────────────

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getMovimentacoes(): Promise<Movimentacao[]> {
  const [pagar, receber] = await Promise.all([getTitulosPagar(), getTitulosReceber()])
  const entradas: Movimentacao[] = receber
    .filter(t => t.status !== 'em_aberto' && t.tipo !== 'carteira' && !(t.valor_carteira && t.valor_carteira >= t.valor))
    .map(t => ({
      id: t.id,
      tipo: 'entrada' as const,
      pessoa: t.usuario_nome,
      descricao: t.descricao,
      valor: t.valor_pago,
      data: t.data_pagamento ?? t.data_vencimento,
    }))
  const carteira: Movimentacao[] = receber
    .filter(t => t.tipo === 'carteira')
    .map(t => ({
      id: `c-${t.id}`,
      tipo: 'carteira' as const,
      pessoa: t.usuario_nome,
      descricao: t.descricao,
      valor: t.valor,
      data: t.data_pagamento ?? t.data_vencimento,
      carteira_debito: t.carteira_debito,
    }))
  const saidas: Movimentacao[] = pagar
    .filter(t => t.status === 'baixado')
    .map(t => ({
      id: t.id,
      tipo: 'saida' as const,
      pessoa: t.favorecido,
      descricao: t.descricao,
      valor: t.valor_pago ?? t.valor,
      data: t.data_pagamento ?? t.data_vencimento,
    }))
  return [...entradas, ...carteira, ...saidas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)
}

export async function getTitulosVencer(): Promise<TituloVencer[]> {
  const [pagar, receber] = await Promise.all([getTitulosPagar(), getTitulosReceber()])
  const pagarItems: TituloVencer[] = pagar
    .filter(t => t.status !== 'baixado')
    .map(t => ({ id: t.id, descricao: t.descricao, valor: t.valor, data: t.data_vencimento, tipo: 'pagar' as const }))
  const receberItems: TituloVencer[] = receber
    .filter(t => t.status !== 'baixado' && t.tipo !== 'carteira')
    .map(t => ({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor - t.valor_pago,
      data: t.data_vencimento,
      tipo: 'receber' as const,
    }))
  return [...pagarItems, ...receberItems].sort((a, b) => a.data.localeCompare(b.data))
}

// Legacy: usado no DashboardAluno para o mini-gráfico de área (se ainda presente)
export async function getPeriodoData(): Promise<PeriodoData[]> {
  const [pagar, receber] = await Promise.all([getTitulosPagar(), getTitulosReceber()])
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { periodo: MONTH_ABBR[d.getMonth()], key: monthKey(d), entradas: 0, saidas: 0 }
  })
  receber.filter(t => t.tipo !== 'carteira').forEach(t => {
    const m = months.find(m => m.key === t.data_emissao.substring(0, 7))
    if (m) m.entradas += t.valor
  })
  pagar.forEach(t => {
    const m = months.find(m => m.key === t.data_emissao.substring(0, 7))
    if (m) m.saidas += t.valor
  })
  return months.map(({ periodo, entradas, saidas }) => ({ periodo, entradas, saidas }))
}

