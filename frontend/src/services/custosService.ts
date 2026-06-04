import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'
import { type Custo, type CustoTipo, type CustoStatus } from '@/mocks/financeiroOrigem'

interface BackendTituloResumo {
  id: number
  num_parcela: number
  total_parcelas: number
  valor: string
  valor_pago: string | null
  multa: string
  data_vencimento: string
  data_pagamento: string | null
  status: string
  status_display: string
  esta_atrasado: boolean
}

interface BackendCusto {
  id: number
  tipo: string
  tipo_display: string
  favorecido: number
  favorecido_nome: string | null
  descricao: string
  num_parcela: number
  total_parcelas: number
  valor: string
  data_emissao: string
  data_vencimento: string
  status: string
  status_display: string
  esta_faturado: boolean
  titulos_info: { total: number; baixados: number; todos_pagos: boolean; parcialmente_pago: boolean } | null
  titulos_resumo: BackendTituloResumo[]
  is_recorrente: boolean
  periodicidade_dias: number | null
  created_at: string
}

function adaptTituloResumo(t: BackendTituloResumo) {
  return {
    id: t.id,
    num_parcela: t.num_parcela,
    total_parcelas: t.total_parcelas,
    valor: parseFloat(t.valor),
    valor_pago: t.valor_pago !== null ? parseFloat(t.valor_pago) : null,
    multa: parseFloat(t.multa),
    data_vencimento: t.data_vencimento,
    data_pagamento: t.data_pagamento,
    status: t.status,
    status_display: t.status_display,
    esta_atrasado: t.esta_atrasado,
  }
}

function adapt(c: BackendCusto): Custo {
  return {
    id: String(c.id),
    favorecido_id: c.favorecido ? String(c.favorecido) : undefined,
    favorecido_nome: c.favorecido_nome ?? '',
    tipo: c.tipo as CustoTipo,
    descricao: c.descricao,
    valor: parseFloat(c.valor),
    data_emissao: c.data_emissao,
    data_vencimento: c.data_vencimento,
    status: c.status as CustoStatus,
    esta_faturado: c.esta_faturado,
    is_recorrente: c.is_recorrente,
    titulos_info: c.titulos_info ?? null,
    titulos_resumo: (c.titulos_resumo ?? []).map(adaptTituloResumo),
    created_at: c.created_at,
  }
}

export interface CustoInput {
  tipo: CustoTipo
  // favorecido_id para fornecedor/folha/conta_fixa; favorecido_nome (texto) para outros
  favorecido: string
  descricao: string
  valor: number
  data_emissao: string
  data_vencimento: string
  is_recorrente?: boolean
  gerar_titulo?: boolean
}

export async function getCustos(): Promise<Custo[]> {
  const data = await apiList<BackendCusto>('/api/v1/custos/')
  return data.map(adapt)
}

export async function createCusto(input: CustoInput): Promise<Custo> {
  const usaId = input.tipo !== 'outros'
  const payload = {
    tipo: input.tipo,
    favorecido_id: usaId ? parseInt(input.favorecido, 10) : undefined,
    favorecido_nome: !usaId ? input.favorecido : '',
    favorecido_tipo: input.tipo,
    descricao: input.descricao,
    valor: input.valor.toFixed(2),
    data_emissao: input.data_emissao,
    data_vencimento: input.data_vencimento,
    is_recorrente: input.is_recorrente ?? false,
    periodicidade_dias: input.is_recorrente ? 30 : null,
    gerar_titulo: input.gerar_titulo ?? false,
  }
  const created = await apiPost<BackendCusto>('/api/v1/custos/', payload)
  return adapt(created)
}

export async function updateCusto(id: string, input: Partial<CustoInput>): Promise<Custo> {
  const payload: Record<string, unknown> = {}
  if (input.descricao !== undefined) payload.descricao = input.descricao
  if (input.valor !== undefined) payload.valor = input.valor.toFixed(2)
  if (input.data_emissao !== undefined) payload.data_emissao = input.data_emissao
  if (input.data_vencimento !== undefined) payload.data_vencimento = input.data_vencimento
  if (input.is_recorrente !== undefined) payload.is_recorrente = input.is_recorrente
  const updated = await apiPatch<BackendCusto>(`/api/v1/custos/${id}/`, payload)
  return adapt(updated)
}

export async function deleteCusto(id: string): Promise<void> {
  await apiDelete(`/api/v1/custos/${id}/`)
}

export interface Parcela {
  valor: number
  data_vencimento: string
}

/** Fatura o custo, opcionalmente com parcelamento. */
export async function faturarCusto(id: string, parcelas?: Parcela[]): Promise<Custo> {
  const body = parcelas
    ? { parcelas: parcelas.map(p => ({ valor: p.valor.toFixed(2), data_vencimento: p.data_vencimento })) }
    : {}
  const res = await apiPost<{ custo: BackendCusto }>(`/api/v1/custos/${id}/faturar/`, body)
  return adapt(res.custo)
}

/** Agrupa N custos do mesmo favorecido em 1 TituloPagar. */
export async function faturarCustosAgrupados(
  custo_ids: string[],
  data_vencimento?: string,
): Promise<{ custos_faturados: number }> {
  return apiPost('/api/v1/custos/faturar-agrupado/', {
    custo_ids: custo_ids.map(id => parseInt(id, 10)),
    data_vencimento,
  })
}

export type { Custo, CustoTipo, CustoStatus }
