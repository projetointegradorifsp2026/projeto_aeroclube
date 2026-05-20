import { mockEntidades, type Entidade, type EntidadeTipo } from '@/mocks/entidades'

let store = [...mockEntidades]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getEntidades(tipo?: EntidadeTipo): Promise<Entidade[]> {
  await delay()
  if (tipo) return store.filter(e => e.tipo === tipo)
  return [...store]
}

export async function createEntidade(data: Omit<Entidade, 'id'>): Promise<Entidade> {
  await delay()
  const entidade: Entidade = { ...data, id: crypto.randomUUID() }
  store = [...store, entidade]
  return entidade
}

export async function updateEntidade(
  id: string,
  data: Partial<Omit<Entidade, 'id'>>,
): Promise<Entidade> {
  await delay()
  const idx = store.findIndex(e => e.id === id)
  if (idx === -1) throw new Error('Entidade não encontrada')
  const updated = { ...store[idx], ...data }
  store = store.map(e => (e.id === id ? updated : e))
  return updated
}

export async function deleteEntidade(id: string): Promise<void> {
  await delay()
  store = store.filter(e => e.id !== id)
}

export type { Entidade, EntidadeTipo }
