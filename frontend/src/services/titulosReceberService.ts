import { mockTitulosReceber, type TituloReceber, type TituloReceberTipo, type TituloReceberStatus } from '@/mocks/titulos'

let store = [...mockTitulosReceber]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getTitulosReceber(): Promise<TituloReceber[]> {
  await delay()
  return [...store]
}

export async function createTituloReceber(data: Omit<TituloReceber, 'id'>): Promise<TituloReceber> {
  await delay()
  const titulo: TituloReceber = { ...data, id: crypto.randomUUID() }
  store = [...store, titulo]
  return titulo
}

export async function updateTituloReceber(
  id: string,
  data: Partial<Omit<TituloReceber, 'id'>>,
): Promise<TituloReceber> {
  await delay()
  const idx = store.findIndex(t => t.id === id)
  if (idx === -1) throw new Error('Título não encontrado')
  const updated = { ...store[idx], ...data }
  store = store.map(t => (t.id === id ? updated : t))
  return updated
}

export async function deleteTituloReceber(id: string): Promise<void> {
  await delay()
  store = store.filter(t => t.id !== id)
}

export async function baixarTituloReceber(
  id: string,
  valorNovoPagamento: number,
  dataPagamento: string,
): Promise<TituloReceber> {
  await delay()
  const idx = store.findIndex(t => t.id === id)
  if (idx === -1) throw new Error('Título não encontrado')
  const current = store[idx]
  const totalPago = current.valor_pago + valorNovoPagamento
  const isBaixado = totalPago >= current.valor + current.juros_aplicado
  const updated: TituloReceber = {
    ...current,
    valor_pago: totalPago,
    status: isBaixado ? 'baixado' : 'pago_parcial',
    data_pagamento: isBaixado ? dataPagamento : null,
  }
  store = store.map(t => (t.id === id ? updated : t))
  return updated
}

export type { TituloReceber, TituloReceberTipo, TituloReceberStatus }
