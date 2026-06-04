import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'
import { type Receita, type ReceitaTipo, type ReceitaStatus } from '@/mocks/financeiroOrigem'

interface BackendReceita {
  id: number
  participante: number | null
  cliente_externo: number | null
  participante_nome: string
  tipo: string
  tipo_display: string
  descricao: string
  voo: number | null
  num_parcela: number
  total_parcelas: number
  valor: string
  data_emissao: string
  data_vencimento: string
  status: string
  status_display: string
  esta_faturada: boolean
  created_at: string
}

function adapt(r: BackendReceita): Receita {
  return {
    id: String(r.id),
    participante_id: r.participante ? String(r.participante) : undefined,
    cliente_externo_id: r.cliente_externo ? String(r.cliente_externo) : undefined,
    devedor_nome: r.participante_nome,
    is_cliente_externo: r.cliente_externo !== null && r.participante === null,
    tipo: r.tipo as ReceitaTipo,
    descricao: r.descricao,
    valor: parseFloat(r.valor),
    data_emissao: r.data_emissao,
    data_vencimento: r.data_vencimento,
    status: r.status as ReceitaStatus,
    esta_faturada: r.esta_faturada,
    created_at: r.created_at,
  }
}

export interface ReceitaInput {
  participante_id?: string
  cliente_externo_id?: string
  tipo: ReceitaTipo
  descricao: string
  valor: number
  data_emissao: string
  data_vencimento: string
  gerar_titulo?: boolean
}

export async function getReceitas(): Promise<Receita[]> {
  const data = await apiList<BackendReceita>('/api/v1/receitas/')
  return data.map(adapt)
}

export async function createReceita(input: ReceitaInput): Promise<Receita> {
  const isExterno = !!input.cliente_externo_id
  const payload = {
    participante: isExterno ? null : (input.participante_id ? parseInt(input.participante_id, 10) : null),
    cliente_externo: isExterno ? parseInt(input.cliente_externo_id!, 10) : null,
    tipo: input.tipo,
    descricao: input.descricao,
    valor: input.valor.toFixed(2),
    data_emissao: input.data_emissao,
    data_vencimento: input.data_vencimento,
    gerar_titulo: input.gerar_titulo ?? false,
  }
  const created = await apiPost<BackendReceita>('/api/v1/receitas/', payload)
  return adapt(created)
}

export async function updateReceita(id: string, input: Partial<ReceitaInput>): Promise<Receita> {
  const payload: Record<string, unknown> = {}
  if (input.tipo !== undefined) payload.tipo = input.tipo
  if (input.descricao !== undefined) payload.descricao = input.descricao
  if (input.valor !== undefined) payload.valor = input.valor.toFixed(2)
  if (input.data_emissao !== undefined) payload.data_emissao = input.data_emissao
  if (input.data_vencimento !== undefined) payload.data_vencimento = input.data_vencimento
  const updated = await apiPatch<BackendReceita>(`/api/v1/receitas/${id}/`, payload)
  return adapt(updated)
}

export async function deleteReceita(id: string): Promise<void> {
  await apiDelete(`/api/v1/receitas/${id}/`)
}

/** Gera o TituloReceber a partir da receita (status → faturada). */
export async function faturarReceita(id: string): Promise<Receita> {
  const res = await apiPost<{ receita: BackendReceita }>(`/api/v1/receitas/${id}/faturar/`, {})
  return adapt(res.receita)
}

export type { Receita, ReceitaTipo, ReceitaStatus }
