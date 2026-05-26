import { api } from '@/lib/api'
import { type Entidade, type EntidadeTipo } from '@/mocks/entidades'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

function normalizeFornecedor(f: Record<string, unknown>): Entidade {
  return { ...(f as Entidade), tipo: 'fornecedor' }
}

function normalizeFuncionario(f: Record<string, unknown>): Entidade {
  return { ...(f as Entidade), tipo: f.is_instrutor ? 'instrutor' : 'funcionario' }
}

// Cache id → endpoint para operações sem tipo explícito
const endpointCache = new Map<number, 'fornecedores' | 'funcionarios'>()

export async function getEntidades(tipo?: EntidadeTipo): Promise<Entidade[]> {
  if (tipo === 'fornecedor') {
    const res = await api.get('/fornecedores/')
    const items = unwrap<Record<string, unknown>>(res.data).map(normalizeFornecedor)
    items.forEach(e => endpointCache.set(e.id, 'fornecedores'))
    return items
  }

  if (tipo === 'funcionario') {
    const res = await api.get('/funcionarios/', { params: { instrutor: 'false' } })
    const items = unwrap<Record<string, unknown>>(res.data).map(normalizeFuncionario)
    items.forEach(e => endpointCache.set(e.id, 'funcionarios'))
    return items
  }

  if (tipo === 'instrutor') {
    const res = await api.get('/funcionarios/', { params: { instrutor: 'true' } })
    const items = unwrap<Record<string, unknown>>(res.data).map(normalizeFuncionario)
    items.forEach(e => endpointCache.set(e.id, 'funcionarios'))
    return items
  }

  // Sem filtro: busca ambos e mescla
  const [fornRes, funcRes] = await Promise.all([
    api.get('/fornecedores/'),
    api.get('/funcionarios/'),
  ])
  const fornecedores = unwrap<Record<string, unknown>>(fornRes.data).map(normalizeFornecedor)
  const funcionarios = unwrap<Record<string, unknown>>(funcRes.data).map(normalizeFuncionario)
  fornecedores.forEach(e => endpointCache.set(e.id, 'fornecedores'))
  funcionarios.forEach(e => endpointCache.set(e.id, 'funcionarios'))
  return [...fornecedores, ...funcionarios].sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function createEntidade(data: Omit<Entidade, 'id'>): Promise<Entidade> {
  if (data.tipo === 'fornecedor') {
    const res = await api.post('/fornecedores/', {
      nome: data.nome,
      cpf_cnpj: data.cpf_cnpj,
      email: data.email,
      contato: data.contato,
      produto_servico: data.produto_servico,
    })
    return normalizeFornecedor(res.data)
  }
  const res = await api.post('/funcionarios/', {
    nome: data.nome,
    cpf_cnpj: data.cpf_cnpj,
    email: data.email,
    contato: data.contato,
    funcao: data.funcao,
    is_instrutor: data.tipo === 'instrutor',
    salario_base: data.salario_base,
  })
  return normalizeFuncionario(res.data)
}

export async function updateEntidade(
  id: number,
  data: Partial<Omit<Entidade, 'id'>>,
): Promise<Entidade> {
  const tipo = data.tipo ?? (endpointCache.get(id) === 'fornecedores' ? 'fornecedor' : 'funcionario')
  if (tipo === 'fornecedor') {
    const res = await api.patch(`/fornecedores/${id}/`, data)
    return normalizeFornecedor(res.data)
  }
  const res = await api.patch(`/funcionarios/${id}/`, {
    ...data,
    is_instrutor: data.tipo === 'instrutor',
  })
  return normalizeFuncionario(res.data)
}

// Usa endpoint base para soft-delete independente do subtipo
export async function deleteEntidade(id: number): Promise<void> {
  await api.delete(`/entidades/${id}/`)
}

export type { Entidade, EntidadeTipo }
