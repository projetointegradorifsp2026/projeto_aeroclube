import { apiList, apiGet, apiPost, apiPatch } from '@/services/api/client'
import { type User, type UserProfile } from '@/mocks/users'

interface BackendPerfil {
  id: number
  perfil: string
}

interface BackendUser {
  id: number
  nome: string
  cpf_cnpj: string | null
  email: string
  perfil_ativo: string
  perfis: BackendPerfil[]
  is_active: boolean
  date_joined: string
}

interface BackendCarteira {
  id: number
  participante: number
  saldo: string
}

function adaptUser(u: BackendUser, saldo = 0): User {
  return {
    id: String(u.id),
    nome: u.nome,
    email: u.email,
    cpf: u.cpf_cnpj ?? '',
    is_active: u.is_active,
    created_at: u.date_joined?.split('T')[0] ?? '',
    perfis: u.perfis.map(p => p.perfil as UserProfile),
    perfil_ativo: u.perfil_ativo as UserProfile,
    saldo_carteira: saldo,
  }
}

async function getSaldoMap(): Promise<Map<number, number>> {
  const carteiras = await apiList<BackendCarteira>('/api/v1/carteiras/')
  return new Map(carteiras.map(c => [c.participante, parseFloat(c.saldo)]))
}

async function getOrCreateCarteira(userId: string): Promise<BackendCarteira> {
  const existing = await apiList<BackendCarteira>(`/api/v1/carteiras/?participante=${userId}`)
  if (existing.length) return existing[0]
  return apiPost<BackendCarteira>('/api/v1/carteiras/', { participante: parseInt(userId) })
}

export async function getUsers(): Promise<User[]> {
  const [users, saldoMap] = await Promise.all([
    apiList<BackendUser>('/api/v1/usuarios/'),
    getSaldoMap(),
  ])
  return users.map(u => adaptUser(u, saldoMap.get(u.id) ?? 0))
}

export async function createUser(
  data: Omit<User, 'id' | 'created_at'> & { password?: string },
): Promise<User> {
  const payload = {
    nome: data.nome,
    email: data.email,
    cpf_cnpj: data.cpf || null,
    perfil_ativo: data.perfil_ativo,
    password: data.password ?? 'Mudar@123',
  }
  const created = await apiPost<BackendUser>('/api/v1/usuarios/', payload)

  // Add all selected profiles (UsuarioCreateSerializer doesn't create UsuarioPerfil entries)
  for (const perfil of data.perfis ?? []) {
    await apiPost(`/api/v1/usuarios/${created.id}/adicionar-perfil/`, { perfil })
  }

  const updated = await apiGet<BackendUser>(`/api/v1/usuarios/${created.id}/`)
  return adaptUser(updated)
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'created_at'>>,
): Promise<User> {
  const payload: Record<string, unknown> = {}
  if (data.nome !== undefined) payload.nome = data.nome
  if (data.email !== undefined) payload.email = data.email
  if (data.cpf !== undefined) payload.cpf_cnpj = data.cpf || null
  if (data.perfil_ativo !== undefined) payload.perfil_ativo = data.perfil_ativo
  if (data.is_active !== undefined) payload.is_active = data.is_active

  const updated = await apiPatch<BackendUser>(`/api/v1/usuarios/${id}/`, payload)

  const saldoMap = await getSaldoMap()
  return adaptUser(updated, saldoMap.get(updated.id) ?? 0)
}

export async function deleteUser(id: string): Promise<void> {
  await apiPatch(`/api/v1/usuarios/${id}/`, { is_active: false })
}

export async function addSaldoCarteira(id: string, valor: number): Promise<User> {
  const carteira = await getOrCreateCarteira(id)
  await apiPost(`/api/v1/carteiras/${carteira.id}/creditar/`, {
    valor: valor.toFixed(2),
    descricao: 'Adição de saldo via sistema',
  })
  const [user, saldoMap] = await Promise.all([
    apiGet<BackendUser>(`/api/v1/usuarios/${id}/`),
    getSaldoMap(),
  ])
  return adaptUser(user, saldoMap.get(user.id) ?? 0)
}

export async function debitarCarteira(id: string, valor: number): Promise<User> {
  const carteira = await getOrCreateCarteira(id)
  await apiPost(`/api/v1/carteiras/${carteira.id}/debitar/`, {
    valor: valor.toFixed(2),
    descricao: 'Débito via carteira',
  })
  const [user, saldoMap] = await Promise.all([
    apiGet<BackendUser>(`/api/v1/usuarios/${id}/`),
    getSaldoMap(),
  ])
  return adaptUser(user, saldoMap.get(user.id) ?? 0)
}

export type { User, UserProfile }
