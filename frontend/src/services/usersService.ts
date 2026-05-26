import { api } from '@/lib/api'
import { type User, type UserProfile } from '@/mocks/users'

type Paginated<T> = { count: number; results: T[] }
function unwrap<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function getUsers(): Promise<User[]> {
  const res = await api.get('/usuarios/')
  return unwrap<User>(res.data)
}

export async function getUser(id: number): Promise<User> {
  const res = await api.get(`/usuarios/${id}/`)
  return res.data
}

export interface CreateUserPayload {
  email: string
  nome: string
  cpf_cnpj?: string | null
  password: string
  perfil: UserProfile
}

export async function createUser(data: CreateUserPayload): Promise<User> {
  const res = await api.post('/usuarios/', data)
  return res.data
}

export async function updateUser(
  id: number,
  data: Partial<Pick<User, 'nome' | 'cpf_cnpj' | 'is_active' | 'perfil_ativo'>>,
): Promise<User> {
  const res = await api.patch(`/usuarios/${id}/`, data)
  return res.data
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/usuarios/${id}/`)
}

export async function adicionarPerfil(id: number, perfil: UserProfile): Promise<void> {
  await api.post(`/usuarios/${id}/adicionar-perfil/`, { perfil })
}

export async function alterarPerfilAtivo(id: number, perfil_ativo: UserProfile): Promise<User> {
  const res = await api.patch(`/usuarios/${id}/perfil-ativo/`, { perfil_ativo })
  return res.data
}

// Credita saldo na carteira do usuário via endpoint de carteiras
export async function addSaldoCarteira(
  participanteId: number,
  valor: number,
  descricao: string,
  data_vencimento?: string,
): Promise<{ carteira: unknown; titulo_receber_id: number }> {
  // Busca carteira do participante
  const carteiraRes = await api.get('/carteiras/', { params: { participante: participanteId } })
  const carteiras = unwrap<{ id: number; participante: number }>(carteiraRes.data)
  const carteira = carteiras.find(c => c.participante === participanteId)
  if (!carteira) throw new Error('Carteira não encontrada para este participante')
  const res = await api.post(`/carteiras/${carteira.id}/creditar/`, {
    valor,
    descricao,
    ...(data_vencimento ? { data_vencimento } : {}),
  })
  return res.data
}

export type { User, UserProfile }
