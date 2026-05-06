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

export type { User, UserProfile }
