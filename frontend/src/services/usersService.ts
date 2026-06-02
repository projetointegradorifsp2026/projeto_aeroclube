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
  data: { nome: string; email: string; cpf: string; perfis: UserProfile[]; is_active: boolean },
): Promise<User> {
  const payload = {
    nome: data.nome,
    email: data.email,
    cpf_cnpj: data.cpf || null,
    perfil_ativo: data.perfis[0] ?? 'aluno',
  }
  const created = await apiPost<BackendUser>('/api/v1/usuarios/', payload)

  for (const perfil of data.perfis ?? []) {
    try {
      await apiPost(`/api/v1/usuarios/${created.id}/adicionar-perfil/`, { perfil })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (!msg.includes('já possui este perfil')) throw e
    }
  }

  const updated = await apiGet<BackendUser>(`/api/v1/usuarios/${created.id}/`)
  return adaptUser(updated)
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'created_at'>>,
  currentPerfis?: UserProfile[],
): Promise<User> {
  const payload: Record<string, unknown> = {}
  if (data.nome !== undefined) payload.nome = data.nome
  if (data.email !== undefined) payload.email = data.email
  if (data.cpf !== undefined) payload.cpf_cnpj = data.cpf || null
  if (data.is_active !== undefined) payload.is_active = data.is_active

  if (Object.keys(payload).length > 0) {
    await apiPatch<BackendUser>(`/api/v1/usuarios/${id}/`, payload)
  }

  // Sincroniza perfis: adiciona os novos, remove os excluídos
  if (data.perfis !== undefined && currentPerfis !== undefined) {
    const toAdd = data.perfis.filter(p => !currentPerfis.includes(p))
    const toRemove = currentPerfis.filter(p => !data.perfis!.includes(p))

    for (const perfil of toAdd) {
      try {
        await apiPost(`/api/v1/usuarios/${id}/adicionar-perfil/`, { perfil })
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (!msg.includes('já possui este perfil')) throw e
      }
    }
    for (const perfil of toRemove) {
      await apiPost(`/api/v1/usuarios/${id}/remover-perfil/`, { perfil })
    }
  }

  const updated = await apiGet<BackendUser>(`/api/v1/usuarios/${id}/`)
  const saldoMap = await getSaldoMap()
  return adaptUser(updated, saldoMap.get(updated.id) ?? 0)
}

export async function deleteUser(id: string): Promise<void> {
  await apiPatch(`/api/v1/usuarios/${id}/`, { is_active: false })
}

export async function resetPassword(id: string): Promise<void> {
  await apiPost(`/api/v1/usuarios/${id}/resetar-senha/`, {})
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
