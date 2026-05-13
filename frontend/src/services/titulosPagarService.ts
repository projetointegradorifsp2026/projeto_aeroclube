import { mockTitulosPagar, type TituloPagar, type TituloPagarTipo, type TituloPagarStatus } from '@/mocks/titulos'

let store = [...mockTitulosPagar]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getTitulosPagar(): Promise<TituloPagar[]> {
  await delay()
  return [...store]
}

export async function createTituloPagar(data: Omit<TituloPagar, 'id'>): Promise<TituloPagar> {
  await delay()
  const titulo: TituloPagar = { ...data, id: crypto.randomUUID() }
  store = [...store, titulo]
  return titulo
}

export async function updateTituloPagar(
  id: string,
  data: Partial<Omit<TituloPagar, 'id'>>,
): Promise<TituloPagar> {
  await delay()
  const idx = store.findIndex(t => t.id === id)
  if (idx === -1) throw new Error('Título não encontrado')
  const updated = { ...store[idx], ...data }
  store = store.map(t => (t.id === id ? updated : t))
  return updated
}

export async function deleteTituloPagar(id: string): Promise<void> {
  await delay()
  store = store.filter(t => t.id !== id)
}

export async function baixarTituloPagar(
  id: string,
  valorPago: number,
  dataPagamento: string,
): Promise<TituloPagar> {
  await delay()
  const idx = store.findIndex(t => t.id === id)
  if (idx === -1) throw new Error('Título não encontrado')
  const updated: TituloPagar = {
    ...store[idx],
    status: 'baixado',
    valor_pago: valorPago,
    data_pagamento: dataPagamento,
  }
  store = store.map(t => (t.id === id ? updated : t))
  return updated
}

export type { TituloPagar, TituloPagarTipo, TituloPagarStatus }
