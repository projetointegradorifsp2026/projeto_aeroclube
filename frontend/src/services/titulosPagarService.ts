import { api } from '@/lib/api'
import { type TituloPagar, type TituloPagarTipo, type TituloPagarStatus } from '@/mocks/titulos'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

export interface TituloPagarFilters {
  status?: TituloPagarStatus
  tipo?: TituloPagarTipo
  atrasado?: boolean
}

export async function getTitulosPagar(filters?: TituloPagarFilters): Promise<TituloPagar[]> {
  const params: Record<string, string> = {}
  if (filters?.status) params.status = filters.status
  if (filters?.tipo) params.tipo = filters.tipo
  if (filters?.atrasado) params.atrasado = 'true'
  const res = await api.get('/titulos-pagar/', { params })
  return unwrap<TituloPagar>(res.data)
}

export async function getTituloPagar(id: number): Promise<TituloPagar> {
  const res = await api.get(`/titulos-pagar/${id}/`)
  return res.data
}

export interface CreateTituloPagarPayload {
  tipo: TituloPagarTipo
  favorecido: number
  descricao: string
  num_parcela?: number
  total_parcelas?: number
  valor: number
  data_emissao: string
  data_vencimento: string
  is_recorrente?: boolean
  periodicidade_dias?: number | null
}

export async function createTituloPagar(data: CreateTituloPagarPayload): Promise<TituloPagar> {
  const res = await api.post('/titulos-pagar/', data)
  return res.data
}

export async function updateTituloPagar(
  id: number,
  data: Partial<CreateTituloPagarPayload>,
): Promise<TituloPagar> {
  const res = await api.patch(`/titulos-pagar/${id}/`, data)
  return res.data
}

export async function deleteTituloPagar(id: number): Promise<void> {
  await api.delete(`/titulos-pagar/${id}/`)
}

// RF01/RF03: baixa total do título a pagar
export async function baixarTituloPagar(
  id: number,
  valorPago: number,
  dataPagamento: string,
): Promise<TituloPagar> {
  const res = await api.post(`/titulos-pagar/${id}/baixar/`, {
    valor_pago: valorPago,
    data_pagamento: dataPagamento,
  })
  return res.data
}

export type { TituloPagar, TituloPagarTipo, TituloPagarStatus }
