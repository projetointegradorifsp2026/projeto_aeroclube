import { mockVoos, type Voo, type TipoVoo } from '@/mocks/voos'

let store = [...mockVoos]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getVoos(): Promise<Voo[]> {
  await delay()
  return [...store].sort((a, b) => b.data.localeCompare(a.data))
}

export async function createVoo(data: Omit<Voo, 'id' | 'created_at'>): Promise<Voo> {
  await delay()
  const voo: Voo = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  store = [...store, voo]
  return voo
}

export async function updateVoo(
  id: string,
  data: Partial<Omit<Voo, 'id' | 'created_at'>>,
): Promise<Voo> {
  await delay()
  const idx = store.findIndex(v => v.id === id)
  if (idx === -1) throw new Error('Voo não encontrado')
  const updated = { ...store[idx], ...data }
  store = store.map(v => (v.id === id ? updated : v))
  return updated
}

export async function deleteVoo(id: string): Promise<void> {
  await delay()
  store = store.filter(v => v.id !== id)
}

export type { Voo, TipoVoo }
