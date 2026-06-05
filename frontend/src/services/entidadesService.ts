import { apiList, apiPost, apiPatch, apiDelete } from '@/services/api/client'
import { type Entidade, type EntidadeTipo } from '@/mocks/entidades'

interface BackendFornecedor {
  id: number
  nome: string
  cpf_cnpj: string | null
  email: string | null
  contato: string | null
  is_active: boolean
}

interface BackendFuncionario {
  id: number
  nome: string
  cpf_cnpj: string | null
  email: string | null
  contato: string | null
  funcao: string | null
  is_instrutor: boolean
  is_active: boolean
}

interface BackendEntidade {
  id: number
  nome: string
  cpf_cnpj: string | null
  email: string | null
  contato: string | null
  tipo: string
  is_active: boolean
}

function adaptFornecedor(f: BackendFornecedor): Entidade {
  return {
    id: String(f.id),
    nome: f.nome,
    cpf_cnpj: f.cpf_cnpj ?? '',
    email: f.email ?? '',
    contato: f.contato ?? '',
    tipo: 'fornecedor',
    is_active: f.is_active,
  }
}

function adaptFuncionario(f: BackendFuncionario): Entidade {
  return {
    id: String(f.id),
    nome: f.nome,
    cpf_cnpj: f.cpf_cnpj ?? '',
    email: f.email ?? '',
    contato: f.contato ?? '',
    tipo: f.is_instrutor ? 'instrutor' : 'funcionario',
    is_active: f.is_active,
  }
}

function adaptEntidade(e: BackendEntidade): Entidade {
  return {
    id: String(e.id),
    nome: e.nome,
    cpf_cnpj: e.cpf_cnpj ?? '',
    email: e.email ?? '',
    contato: e.contato ?? '',
    tipo: e.tipo as EntidadeTipo,
    is_active: e.is_active,
  }
}

export async function getEntidades(tipo?: EntidadeTipo): Promise<Entidade[]> {
  if (tipo === 'fornecedor') {
    const items = await apiList<BackendFornecedor>('/api/v1/fornecedores/')
    return items.map(adaptFornecedor)
  }
  if (tipo === 'funcionario') {
    const items = await apiList<BackendFuncionario>('/api/v1/funcionarios/?instrutor=false')
    return items.map(adaptFuncionario)
  }
  if (tipo === 'instrutor') {
    const items = await apiList<BackendFuncionario>('/api/v1/funcionarios/?instrutor=true')
    return items.map(adaptFuncionario)
  }
  if (tipo === 'cliente') {
    const items = await apiList<BackendEntidade>('/api/v1/entidades/?tipo=cliente')
    return items.map(adaptEntidade)
  }

  // Sem filtro: busca todos em paralelo
  const [fornecedores, funcionarios, instrutores, clientes] = await Promise.all([
    apiList<BackendFornecedor>('/api/v1/fornecedores/'),
    apiList<BackendFuncionario>('/api/v1/funcionarios/?instrutor=false'),
    apiList<BackendFuncionario>('/api/v1/funcionarios/?instrutor=true'),
    apiList<BackendEntidade>('/api/v1/entidades/?tipo=cliente'),
  ])
  return [
    ...fornecedores.map(adaptFornecedor),
    ...funcionarios.map(adaptFuncionario),
    ...instrutores.map(adaptFuncionario),
    ...clientes.map(adaptEntidade),
  ].sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function createEntidade(data: Omit<Entidade, 'id'>): Promise<Entidade> {
  if (data.tipo === 'fornecedor') {
    const payload = {
      nome: data.nome,
      cpf_cnpj: data.cpf_cnpj || null,
      email: data.email || null,
      contato: data.contato || null,
    }
    const created = await apiPost<BackendFornecedor>('/api/v1/fornecedores/', payload)
    return adaptFornecedor(created)
  }
  if (data.tipo === 'funcionario' || data.tipo === 'instrutor') {
    const payload = {
      nome: data.nome,
      cpf_cnpj: data.cpf_cnpj || null,
      email: data.email || null,
      contato: data.contato || null,
      is_instrutor: data.tipo === 'instrutor',
    }
    const created = await apiPost<BackendFuncionario>('/api/v1/funcionarios/', payload)
    return adaptFuncionario(created)
  }
  if (data.tipo === 'cliente') {
    const payload = {
      nome: data.nome,
      cpf_cnpj: data.cpf_cnpj || null,
      email: data.email || null,
      contato: data.contato || null,
      tipo: 'cliente',
    }
    const created = await apiPost<BackendEntidade>('/api/v1/entidades/', payload)
    return adaptEntidade(created)
  }
  throw new Error(`Tipo de entidade '${data.tipo}' não suportado para criação`)
}

export async function updateEntidade(
  id: string,
  data: Partial<Omit<Entidade, 'id'>>,
): Promise<Entidade> {
  const payload: Record<string, unknown> = {}
  if (data.nome !== undefined) payload.nome = data.nome
  if (data.cpf_cnpj !== undefined) payload.cpf_cnpj = data.cpf_cnpj || null
  if (data.email !== undefined) payload.email = data.email || null
  if (data.contato !== undefined) payload.contato = data.contato || null
  if (data.is_active !== undefined) payload.is_active = data.is_active

  const existingTipo = data.tipo
  if (existingTipo === 'fornecedor') {
    const updated = await apiPatch<BackendFornecedor>(`/api/v1/fornecedores/${id}/`, payload)
    return adaptFornecedor(updated)
  }
  if (existingTipo === 'cliente') {
    const updated = await apiPatch<BackendEntidade>(`/api/v1/entidades/${id}/`, payload)
    return adaptEntidade(updated)
  }
  const updated = await apiPatch<BackendFuncionario>(`/api/v1/funcionarios/${id}/`, payload)
  return adaptFuncionario(updated)
}

export async function deleteEntidade(id: string, tipo?: EntidadeTipo): Promise<void> {
  if (tipo === 'cliente') {
    await apiDelete(`/api/v1/entidades/${id}/`)
    return
  }
  if (tipo === 'fornecedor') {
    await apiDelete(`/api/v1/fornecedores/${id}/`)
    return
  }
  if (tipo === 'funcionario' || tipo === 'instrutor') {
    await apiDelete(`/api/v1/funcionarios/${id}/`)
    return
  }
  // fallback sem tipo: tenta fornecedor, depois funcionario
  try {
    await apiDelete(`/api/v1/fornecedores/${id}/`)
  } catch {
    await apiDelete(`/api/v1/funcionarios/${id}/`)
  }
}

export type { Entidade, EntidadeTipo }
