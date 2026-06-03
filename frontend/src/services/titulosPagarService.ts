import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'
import { type TituloPagar, type TituloPagarTipo, type TituloPagarStatus } from '@/mocks/titulos'

interface BackendTituloPagar {
  id: number
  tipo: string
  favorecido: number
  favorecido_nome: string | null
  descricao: string
  num_parcela: number
  total_parcelas: number
  valor: string
  multa: string
  data_emissao: string
  data_vencimento: string
  status: string
  esta_atrasado: boolean
  valor_pago: string | null
  data_pagamento: string | null
  is_recorrente: boolean
  periodicidade_dias: number | null
}

const TIPO_BACKEND_TO_FRONTEND: Record<string, TituloPagarTipo> = {
  folha_pagamento: 'folha',
  fornecedor: 'fornecedor',
  conta_fixa: 'conta_fixa',
  outros: 'outros',
}

const TIPO_FRONTEND_TO_BACKEND: Record<string, string> = {
  folha: 'folha_pagamento',
  instrutor: 'folha_pagamento',
  fornecedor: 'fornecedor',
  conta_fixa: 'conta_fixa',
  outros: 'outros',
}

function adaptTitulo(t: BackendTituloPagar): TituloPagar {
  const statusFront: TituloPagarStatus = t.status === 'baixado' ? 'baixado' : 'em_aberto'
  return {
    id: String(t.id),
    tipo: (TIPO_BACKEND_TO_FRONTEND[t.tipo] ?? t.tipo) as TituloPagarTipo,
    favorecido: t.favorecido_nome ?? '',
    descricao: t.descricao,
    num_parcela: t.num_parcela,
    total_parcelas: t.total_parcelas,
    valor: parseFloat(t.valor),
    multa: parseFloat(t.multa || '0'),
    data_emissao: t.data_emissao,
    data_vencimento: t.data_vencimento,
    status: statusFront,
    valor_pago: t.valor_pago !== null ? parseFloat(t.valor_pago) : null,
    data_pagamento: t.data_pagamento,
    recorrente: t.is_recorrente,
  }
}

export async function getTitulosPagar(): Promise<TituloPagar[]> {
  const titulos = await apiList<BackendTituloPagar>('/api/v1/titulos-pagar/')
  return titulos.map(adaptTitulo)
}

export async function createTituloPagar(data: Omit<TituloPagar, 'id'>): Promise<TituloPagar> {
  const tipoBackend = TIPO_FRONTEND_TO_BACKEND[data.tipo] ?? 'outros'
  const usesId = data.tipo !== 'outros'
  const payload = {
    tipo: tipoBackend,
    favorecido_id: usesId ? parseInt(data.favorecido, 10) : undefined,
    favorecido_nome: !usesId ? data.favorecido : '',
    favorecido_tipo: data.tipo,
    descricao: data.descricao,
    num_parcela: data.num_parcela,
    total_parcelas: data.total_parcelas,
    valor: data.valor.toFixed(2),
    data_emissao: data.data_emissao,
    data_vencimento: data.data_vencimento,
    is_recorrente: data.recorrente ?? false,
    periodicidade_dias: data.recorrente ? 30 : null,
  }
  const created = await apiPost<BackendTituloPagar>('/api/v1/titulos-pagar/', payload)
  return adaptTitulo(created)
}

export async function updateTituloPagar(
  id: string,
  data: Partial<Omit<TituloPagar, 'id'>>,
): Promise<TituloPagar> {
  const payload: Record<string, unknown> = {}
  if (data.descricao !== undefined) payload.descricao = data.descricao
  if (data.valor !== undefined) payload.valor = data.valor.toFixed(2)
  if (data.data_vencimento !== undefined) payload.data_vencimento = data.data_vencimento
  if (data.recorrente !== undefined) payload.is_recorrente = data.recorrente

  const updated = await apiPatch<BackendTituloPagar>(`/api/v1/titulos-pagar/${id}/`, payload)
  return adaptTitulo(updated)
}

export async function deleteTituloPagar(id: string): Promise<void> {
  await apiDelete(`/api/v1/titulos-pagar/${id}/`)
}

export async function baixarTituloPagar(
  id: string,
  valorPago: number,
  dataPagamento: string,
  multa = 0,
): Promise<TituloPagar> {
  const updated = await apiPost<BackendTituloPagar>(
    `/api/v1/titulos-pagar/${id}/baixar/`,
    {
      valor_pago: valorPago.toFixed(2),
      data_pagamento: dataPagamento,
      multa: multa.toFixed(2),
    },
  )
  return adaptTitulo(updated)
}

export type { TituloPagar, TituloPagarTipo, TituloPagarStatus }
