import {
  mockResumo,
  mockPeriodoData,
  mockDespesas,
  mockMovimentacoes,
  mockTitulosVencer,
  type ResumoFinanceiro,
  type PeriodoData,
  type DespesaCategoria,
  type Movimentacao,
  type TituloVencer,
} from '@/mocks/dashboard'

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getResumoFinanceiro(): Promise<ResumoFinanceiro> {
  await delay()
  return { ...mockResumo }
}

export async function getPeriodoData(): Promise<PeriodoData[]> {
  await delay(300)
  return [...mockPeriodoData]
}

export async function getDespesas(): Promise<DespesaCategoria[]> {
  await delay(300)
  return [...mockDespesas]
}

export async function getMovimentacoes(): Promise<Movimentacao[]> {
  await delay(350)
  return [...mockMovimentacoes]
}

export async function getTitulosVencer(): Promise<TituloVencer[]> {
  await delay(300)
  return [...mockTitulosVencer]
}

export type { ResumoFinanceiro, PeriodoData, DespesaCategoria, Movimentacao, TituloVencer }
