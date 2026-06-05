import { apiList } from '@/services/api/client'
import { type MovimentacaoCarteira, type MovimentacaoTipo } from '@/mocks/carteira'

interface BackendMovimentacao {
  id: number
  tipo: string
  valor: string
  descricao: string
  data_transacao: string
  data_vencimento: string | null
  voo: number | null
  participante_id: number
  participante_nome: string
}

function adaptMovimentacao(
  m: BackendMovimentacao,
  saldoResultante: number,
): MovimentacaoCarteira {
  return {
    id: String(m.id),
    usuario_id: String(m.participante_id),
    usuario_nome: m.participante_nome,
    tipo: m.tipo as MovimentacaoTipo,
    valor: parseFloat(m.valor),
    descricao: m.descricao,
    data_transacao: m.data_transacao.split('T')[0],
    data_vencimento: m.data_vencimento,
    saldo_resultante: saldoResultante,
  }
}

function computeSaldos(movs: BackendMovimentacao[]): MovimentacaoCarteira[] {
  // Sort ascending by date to compute running balance
  const sorted = [...movs].sort((a, b) => a.data_transacao.localeCompare(b.data_transacao))
  let saldo = 0
  const result: MovimentacaoCarteira[] = sorted.map(m => {
    const valor = parseFloat(m.valor)
    saldo = m.tipo === 'credito' ? saldo + valor : saldo - valor
    return adaptMovimentacao(m, saldo)
  })
  // Return in descending order (most recent first)
  return result.reverse()
}

export async function getMovimentacoes(usuario_id?: string): Promise<MovimentacaoCarteira[]> {
  const path = usuario_id
    ? `/api/v1/movimentacoes-carteira/?participante=${usuario_id}`
    : '/api/v1/movimentacoes-carteira/'
  const movs = await apiList<BackendMovimentacao>(path)
  return computeSaldos(movs)
}

export async function getSaldoUsuario(usuario_id: string): Promise<number> {
  const movs = await getMovimentacoes(usuario_id)
  if (!movs.length) return 0
  return movs[0].saldo_resultante
}

export async function creditarCarteira(
  data: Omit<MovimentacaoCarteira, 'id' | 'saldo_resultante'>,
): Promise<MovimentacaoCarteira> {
  // This is handled server-side via POST /carteiras/{id}/creditar/
  // Here we just refresh and return the latest entry
  const movs = await getMovimentacoes(data.usuario_id)
  return movs[0] ?? adaptMovimentacao(
    {
      id: Date.now(),
      tipo: data.tipo,
      valor: String(data.valor),
      descricao: data.descricao,
      data_transacao: data.data_transacao,
      data_vencimento: data.data_vencimento,
      voo: null,
      participante_id: parseInt(data.usuario_id),
      participante_nome: data.usuario_nome,
    },
    data.valor,
  )
}

export type { MovimentacaoCarteira, MovimentacaoTipo }
