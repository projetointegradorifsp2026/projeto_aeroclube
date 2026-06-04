import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'
import { type Custo, type CustoTipo, type CustoStatus } from '@/mocks/financeiroOrigem'

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
  is_recorrente: boolean
  periodicidade_dias: number | null
  created_at: string
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

/** Gera o TituloPagar a partir do custo (status → faturado). */
export async function faturarCusto(id: string): Promise<Custo> {
  const res = await apiPost<{ custo: BackendCusto }>(`/api/v1/custos/${id}/faturar/`, {})
  return adapt(res.custo)
}

export type { Custo, CustoTipo, CustoStatus }
