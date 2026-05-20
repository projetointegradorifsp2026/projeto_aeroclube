import { mockContasFixas, type ContaFixa } from '@/mocks/contaFixa'

let store = [...mockContasFixas]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getContasFixas(): Promise<ContaFixa[]> {
  await delay()
  return [...store]
}

export async function createContaFixa(data: Omit<ContaFixa, 'id'>): Promise<ContaFixa> {
  await delay()
  const contaFixa: ContaFixa = { ...data, id: crypto.randomUUID() }
  store = [...store, contaFixa]
  return contaFixa
}

export async function updateContaFixa(
  id: string,
  data: Partial<Omit<ContaFixa, 'id'>>,
): Promise<ContaFixa> {
  await delay()
  const idx = store.findIndex(c => c.id === id)
  if (idx === -1) throw new Error('Conta fixa não encontrada')
  const updated = { ...store[idx], ...data }
  store = store.map(c => (c.id === id ? updated : c))
  return updated
}

export async function deleteContaFixa(id: string): Promise<void> {
  await delay()
  store = store.filter(c => c.id !== id)
}

export type { ContaFixa }
