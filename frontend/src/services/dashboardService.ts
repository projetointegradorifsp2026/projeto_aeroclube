import { getTitulosPagar } from '@/services/titulosPagarService'
import { getTitulosReceber } from '@/services/titulosReceberService'

export interface ResumoFinanceiro {
  titulosPagar: number
  titulosReceber: number
}

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
  tipo: 'entrada' | 'saida'
  pessoa: string
  descricao: string
  valor: number
  data: string
}

export type TituloVencerTipo = 'pagar' | 'receber'

export interface TituloVencer {
  id: string
  descricao: string
  valor: number
  data: string
  tipo: TituloVencerTipo
}

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getResumoFinanceiro(): Promise<ResumoFinanceiro> {
  const [pagar, receber] = await Promise.all([
    getTitulosPagar({ status: 'aberto' }),
    getTitulosReceber({ status: 'aberto' }),
  ])
  const titulosPagar = pagar.reduce((s, t) => s + t.valor, 0)
  const titulosReceber = receber
    .filter(t => t.tipo !== 'horas_pre_pagas')
    .reduce((s, t) => s + (t.valor_original + t.juros_aplicado - t.valor_pago), 0)
  return { titulosPagar, titulosReceber }
}

export async function getPeriodoData(): Promise<PeriodoData[]> {
  const [pagar, receber] = await Promise.all([getTitulosPagar(), getTitulosReceber()])
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { periodo: MONTH_ABBR[d.getMonth()], key: monthKey(d), entradas: 0, saidas: 0 }
  })
  receber
    .filter(t => t.tipo !== 'horas_pre_pagas')
    .forEach(t => {
      const m = months.find(m => m.key === t.data_emissao.substring(0, 7))
      if (m) m.entradas += t.valor_original
    })
  pagar.forEach(t => {
    const m = months.find(m => m.key === t.data_emissao.substring(0, 7))
    if (m) m.saidas += t.valor
  })
  return months.map(({ periodo, entradas, saidas }) => ({ periodo, entradas, saidas }))
}

export async function getDespesas(): Promise<DespesaCategoria[]> {
  const pagar = await getTitulosPagar()
  const now = new Date()
  const months = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1)
    return { categoria: MONTH_ABBR[d.getMonth()], key: monthKey(d), valor: 0 }
  })
  pagar.forEach(t => {
    const m = months.find(m => m.key === t.data_emissao.substring(0, 7))
    if (m) m.valor += t.valor
  })
  return months.map(({ categoria, valor }) => ({ categoria, valor }))
}

export async function getMovimentacoes(): Promise<Movimentacao[]> {
  const [pagar, receber] = await Promise.all([getTitulosPagar(), getTitulosReceber()])
  const entradas: Movimentacao[] = receber
    .filter(t => t.status === 'baixado' && t.tipo !== 'horas_pre_pagas')
    .map(t => ({
      id: String(t.id),
      tipo: 'entrada' as const,
      pessoa: t.participante_nome,
      descricao: t.descricao,
      valor: t.valor_pago,
      data: t.data_pagamento ?? t.data_vencimento,
    }))
  const saidas: Movimentacao[] = pagar
    .filter(t => t.status === 'baixado')
    .map(t => ({
      id: String(t.id),
      tipo: 'saida' as const,
      pessoa: t.favorecido_nome,
      descricao: t.descricao,
      valor: t.valor_pago ?? t.valor,
      data: t.data_pagamento ?? t.data_vencimento,
    }))
  return [...entradas, ...saidas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)
}

export async function getTitulosVencer(): Promise<TituloVencer[]> {
  const [pagar, receber] = await Promise.all([getTitulosPagar(), getTitulosReceber()])
  const pagarItems: TituloVencer[] = pagar
    .filter(t => t.status !== 'baixado')
    .map(t => ({
      id: String(t.id),
      descricao: t.descricao,
      valor: t.valor,
      data: t.data_vencimento,
      tipo: 'pagar' as const,
    }))
  const receberItems: TituloVencer[] = receber
    .filter(t => t.status !== 'baixado' && t.tipo !== 'horas_pre_pagas')
    .map(t => ({
      id: String(t.id),
      descricao: t.descricao,
      valor: t.valor_original + t.juros_aplicado - t.valor_pago,
      data: t.data_vencimento,
      tipo: 'receber' as const,
    }))
  return [...pagarItems, ...receberItems].sort((a, b) => a.data.localeCompare(b.data))
}
