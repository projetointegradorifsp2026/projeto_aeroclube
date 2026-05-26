import { api } from '@/lib/api'
import { type Carteira, type MovimentacaoCarteira, type MovimentacaoTipo } from '@/mocks/carteira'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function getCarteiras(): Promise<Carteira[]> {
  const res = await api.get('/carteiras/')
  return unwrap<Carteira>(res.data)
}

export async function getCarteira(id: number): Promise<Carteira> {
  const res = await api.get(`/carteiras/${id}/`)
  return res.data
}

export async function getCarteiraByParticipante(participanteId: number): Promise<Carteira | null> {
  const res = await api.get('/carteiras/', { params: { participante: participanteId } })
  const carteiras = unwrap<Carteira>(res.data)
  return carteiras.find(c => c.participante_id === participanteId) ?? null
}

export async function getMovimentacoes(filters?: {
  carteira?: number
  participante?: number
}): Promise<MovimentacaoCarteira[]> {
  const res = await api.get('/movimentacoes-carteira/', { params: filters })
  return unwrap<MovimentacaoCarteira>(res.data)
}

// RF13: débito de saldo ao usar horas pré-pagas em um voo
export async function debitarCarteira(
  carteiraId: number,
  valor: number,
  descricao: string,
  vooId?: number,
): Promise<Carteira> {
  const res = await api.post(`/carteiras/${carteiraId}/debitar/`, {
    valor,
    descricao,
    ...(vooId ? { voo: vooId } : {}),
  })
  return res.data
}

// RF12: crédito de horas pré-pagas (cria movimentação + título a receber)
export async function creditarCarteira(
  carteiraId: number,
  valor: number,
  descricao: string,
  data_vencimento?: string,
): Promise<{ carteira: Carteira; titulo_receber_id: number }> {
  const res = await api.post(`/carteiras/${carteiraId}/creditar/`, {
    valor,
    descricao,
    ...(data_vencimento ? { data_vencimento } : {}),
  })
  return res.data
}

export type { Carteira, MovimentacaoCarteira, MovimentacaoTipo }
