import { mockUsers, type User, type UserProfile } from '@/mocks/users'

let store = [...mockUsers]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getUsers(): Promise<User[]> {
  await delay()
  return [...store]
}

export async function createUser(data: Omit<User, 'id' | 'created_at'>): Promise<User> {
  await delay()
  const user: User = {
    saldo_carteira: 0,
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString().split('T')[0],
  }
  store = [...store, user]
  return user
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'created_at'>>,
): Promise<User> {
  await delay()
  const idx = store.findIndex(u => u.id === id)
  if (idx === -1) throw new Error('Usuário não encontrado')
  const updated = { ...store[idx], ...data }
  store = store.map(u => (u.id === id ? updated : u))
  return updated
}

export async function deleteUser(id: string): Promise<void> {
  await delay()
  store = store.filter(u => u.id !== id)
}

export async function addSaldoCarteira(id: string, valor: number): Promise<User> {
  await delay()
  const idx = store.findIndex(u => u.id === id)
  if (idx === -1) throw new Error('Usuário não encontrado')
  const updated = { ...store[idx], saldo_carteira: store[idx].saldo_carteira + valor }
  store = store.map(u => (u.id === id ? updated : u))
  return updated
}

export async function debitarCarteira(id: string, valor: number): Promise<User> {
  await delay()
  const idx = store.findIndex(u => u.id === id)
  if (idx === -1) throw new Error('Usuário não encontrado')
  const updated = { ...store[idx], saldo_carteira: Math.max(0, store[idx].saldo_carteira - valor) }
  store = store.map(u => (u.id === id ? updated : u))
  return updated
}

export type { User, UserProfile }
