import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'

export interface ContaFixa {
  id: string
  nome: string
  descricao: string
  favorecido: string
  valor: number
  dia_vencimento: number
  is_active: boolean
}

interface BackendContaFixa {
  id: number
  nome: string
  descricao: string
  favorecido: string
  valor: string
  dia_vencimento: number
  is_active: boolean
}

function adapt(c: BackendContaFixa): ContaFixa {
  return {
    id: String(c.id),
    nome: c.nome,
    descricao: c.descricao,
    favorecido: c.favorecido,
    valor: parseFloat(c.valor),
    dia_vencimento: c.dia_vencimento,
    is_active: c.is_active,
  }
}

export async function getContasFixas(): Promise<ContaFixa[]> {
  const data = await apiList<BackendContaFixa>('/api/v1/contas-fixas/')
  return data.map(adapt)
}

export async function createContaFixa(data: Omit<ContaFixa, 'id'>): Promise<ContaFixa> {
  const created = await apiPost<BackendContaFixa>('/api/v1/contas-fixas/', {
    nome: data.nome,
    descricao: data.descricao,
    favorecido: data.favorecido,
    valor: data.valor.toFixed(2),
    dia_vencimento: data.dia_vencimento,
    is_active: data.is_active,
  })
  return adapt(created)
}

export async function updateContaFixa(
  id: string,
  data: Partial<Omit<ContaFixa, 'id'>>,
): Promise<ContaFixa> {
  const payload: Record<string, unknown> = {}
  if (data.nome !== undefined) payload.nome = data.nome
  if (data.descricao !== undefined) payload.descricao = data.descricao
  if (data.favorecido !== undefined) payload.favorecido = data.favorecido
  if (data.valor !== undefined) payload.valor = data.valor.toFixed(2)
  if (data.dia_vencimento !== undefined) payload.dia_vencimento = data.dia_vencimento
  if (data.is_active !== undefined) payload.is_active = data.is_active

  const updated = await apiPatch<BackendContaFixa>(`/api/v1/contas-fixas/${id}/`, payload)
  return adapt(updated)
}

export async function deleteContaFixa(id: string): Promise<void> {
  await apiDelete(`/api/v1/contas-fixas/${id}/`)
}
