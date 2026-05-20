import { mockAeronaves, type Aeronave } from '@/mocks/aeronaves'

let store = [...mockAeronaves]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getAeronaves(): Promise<Aeronave[]> {
  await delay()
  return [...store]
}

export async function createAeronave(data: Omit<Aeronave, 'id'>): Promise<Aeronave> {
  await delay()
  const aeronave: Aeronave = { ...data, id: crypto.randomUUID() }
  store = [...store, aeronave]
  return aeronave
}

export async function updateAeronave(
  id: string,
  data: Partial<Omit<Aeronave, 'id'>>,
): Promise<Aeronave> {
  await delay()
  const idx = store.findIndex(a => a.id === id)
  if (idx === -1) throw new Error('Aeronave não encontrada')
  const updated = { ...store[idx], ...data }
  store = store.map(a => (a.id === id ? updated : a))
  return updated
}

export async function deleteAeronave(id: string): Promise<void> {
  await delay()
  store = store.filter(a => a.id !== id)
}

export type { Aeronave }
