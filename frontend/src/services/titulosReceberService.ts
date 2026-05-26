import { api } from '@/lib/api'
import {
  type TituloReceber,
  type TituloReceberTipo,
  type TituloReceberStatus,
  isPagoParcial,
  saldoDevedor,
} from '@/mocks/titulos'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

export interface TituloReceberFilters {
  participante?: number
  status?: TituloReceberStatus
  atrasado?: boolean
}

export async function getTitulosReceber(filters?: TituloReceberFilters): Promise<TituloReceber[]> {
  const params: Record<string, string | number> = {}
  if (filters?.participante) params.participante = filters.participante
  if (filters?.status) params.status = filters.status
  if (filters?.atrasado) params.atrasado = 'true'
  const res = await api.get('/titulos-receber/', { params })
  return unwrap<TituloReceber>(res.data)
}

export async function getTituloReceber(id: number): Promise<TituloReceber> {
  const res = await api.get(`/titulos-receber/${id}/`)
  return res.data
}

export interface CreateTituloReceberPayload {
  participante: number
  tipo: TituloReceberTipo
  descricao: string
  voo?: number | null
  num_parcela?: number
  total_parcelas?: number
  valor_original: number
  data_emissao: string
  data_vencimento: string
}

export async function createTituloReceber(
  data: CreateTituloReceberPayload,
): Promise<TituloReceber> {
  const res = await api.post('/titulos-receber/', data)
  return res.data
}

export async function updateTituloReceber(
  id: number,
  data: Partial<CreateTituloReceberPayload>,
): Promise<TituloReceber> {
  const res = await api.patch(`/titulos-receber/${id}/`, data)
  return res.data
}

export async function deleteTituloReceber(id: number): Promise<void> {
  await api.delete(`/titulos-receber/${id}/`)
}

// RF05/RF06: baixa parcial (acumula valor_pago; quitação automática quando saldo = 0)
export async function baixarTituloReceber(
  id: number,
  valor: number,
  dataPagamento?: string,
  juros = 0,
): Promise<TituloReceber> {
  const res = await api.post(`/titulos-receber/${id}/baixa-parcial/`, {
    valor,
    juros,
    ...(dataPagamento ? { data_pagamento: dataPagamento } : {}),
  })
  return res.data
}

// RF07: quitação de múltiplos títulos com um único valor
export async function quitacaoMultipla(
  titulo_ids: number[],
  valor_total: number,
  data_pagamento?: string,
): Promise<{ titulos_atualizados: TituloReceber[]; valor_restante: string }> {
  const res = await api.post('/titulos-receber/quitacao-multipla/', {
    titulo_ids,
    valor_total,
    ...(data_pagamento ? { data_pagamento } : {}),
  })
  return res.data
}

export { isPagoParcial, saldoDevedor }
export type { TituloReceber, TituloReceberTipo, TituloReceberStatus }
