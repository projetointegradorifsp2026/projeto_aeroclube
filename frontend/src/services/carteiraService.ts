import { mockMovimentacoes, type MovimentacaoCarteira, type MovimentacaoTipo } from '@/mocks/carteira'

let store = [...mockMovimentacoes]

const delay = (ms = 400) => new Promise<void>(r => setTimeout(r, ms))

export async function getMovimentacoes(usuario_id?: string): Promise<MovimentacaoCarteira[]> {
  await delay()
  const result = usuario_id ? store.filter(m => m.usuario_id === usuario_id) : [...store]
  return result.sort((a, b) => b.data_transacao.localeCompare(a.data_transacao))
}

export async function getSaldoUsuario(usuario_id: string): Promise<number> {
  await delay()
  const movs = store.filter(m => m.usuario_id === usuario_id)
  if (movs.length === 0) return 0
  return [...movs].sort((a, b) => b.data_transacao.localeCompare(a.data_transacao))[0].saldo_resultante
}

export async function creditarCarteira(
  data: Omit<MovimentacaoCarteira, 'id' | 'saldo_resultante'>,
): Promise<MovimentacaoCarteira> {
  await delay()
  const movs = store.filter(m => m.usuario_id === data.usuario_id)
  const saldoAtual =
    movs.length > 0
      ? [...movs].sort((a, b) => b.data_transacao.localeCompare(a.data_transacao))[0]
          .saldo_resultante
      : 0
  const saldoResultante =
    data.tipo === 'credito' ? saldoAtual + data.valor : saldoAtual - data.valor
  const mov: MovimentacaoCarteira = { ...data, id: crypto.randomUUID(), saldo_resultante: saldoResultante }
  store = [...store, mov]
  return mov
}

export type { MovimentacaoCarteira, MovimentacaoTipo }
