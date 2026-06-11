import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'

export interface Cliente {
  id: string
  nome: string
  cpf_cnpj: string
  email: string
  contato: string
  cep: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface BackendCliente {
  id: number
  nome: string
  cpf_cnpj: string | null
  email: string | null
  contato: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

function adapt(c: BackendCliente): Cliente {
  return {
    id: String(c.id),
    nome: c.nome,
    cpf_cnpj: c.cpf_cnpj ?? '',
    email: c.email ?? '',
    contato: c.contato ?? '',
    cep: c.cep ?? '',
    logradouro: c.logradouro ?? '',
    numero: c.numero ?? '',
    bairro: c.bairro ?? '',
    cidade: c.cidade ?? '',
    uf: c.uf ?? '',
    is_active: c.is_active,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }
}

export async function getClientes(incluirInativos = false): Promise<Cliente[]> {
  const url = incluirInativos ? '/api/v1/clientes/?ativo=all' : '/api/v1/clientes/'
  const items = await apiList<BackendCliente>(url)
  return items.map(adapt)
}

export async function createCliente(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
  const payload = {
    nome: data.nome,
    cpf_cnpj: data.cpf_cnpj || null,
    email: data.email || null,
    contato: data.contato || null,
    cep: data.cep || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    bairro: data.bairro || '',
    cidade: data.cidade || '',
    uf: data.uf || '',
    is_active: data.is_active ?? true,
  }
  const created = await apiPost<BackendCliente>('/api/v1/clientes/', payload)
  return adapt(created)
}

export async function updateCliente(id: string, data: Partial<Omit<Cliente, 'id' | 'created_at' | 'updated_at'>>): Promise<Cliente> {
  const payload: Record<string, unknown> = {}
  if (data.nome !== undefined) payload.nome = data.nome
  if (data.cpf_cnpj !== undefined) payload.cpf_cnpj = data.cpf_cnpj || null
  if (data.email !== undefined) payload.email = data.email || null
  if (data.contato !== undefined) payload.contato = data.contato || null
  if (data.cep !== undefined) payload.cep = data.cep || ''
  if (data.logradouro !== undefined) payload.logradouro = data.logradouro || ''
  if (data.numero !== undefined) payload.numero = data.numero || ''
  if (data.bairro !== undefined) payload.bairro = data.bairro || ''
  if (data.cidade !== undefined) payload.cidade = data.cidade || ''
  if (data.uf !== undefined) payload.uf = data.uf || ''
  if (data.is_active !== undefined) payload.is_active = data.is_active
  const updated = await apiPatch<BackendCliente>(`/api/v1/clientes/${id}/`, payload)
  return adapt(updated)
}

export async function deleteCliente(id: string): Promise<void> {
  await apiDelete(`/api/v1/clientes/${id}/`)
}
