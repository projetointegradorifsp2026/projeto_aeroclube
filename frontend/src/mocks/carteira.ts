// Alinhado com backend: Carteira + MovimentacaoCarteira
export type MovimentacaoTipo = 'credito' | 'debito' | 'ajuste'

export const MOVIMENTACAO_TIPO_LABELS: Record<MovimentacaoTipo, string> = {
  credito: 'Crédito',
  debito: 'Débito',
  ajuste: 'Ajuste',
}

export interface Carteira {
  id: number
  participante_id: number
  participante_nome: string
  saldo: number
}

export interface MovimentacaoCarteira {
  id: number
  carteira: number
  tipo: MovimentacaoTipo
  valor: number
  descricao: string
  data_transacao: string
  data_vencimento: string | null
  voo: number | null
}

export const mockMovimentacoes: MovimentacaoCarteira[] = [
  { id: 1, carteira: 2, tipo: 'credito', valor: 1750, descricao: 'Compra de 5h de voo – PP-ABC', data_transacao: '2026-04-01', data_vencimento: '2026-10-01', voo: null },
  { id: 2, carteira: 2, tipo: 'debito', valor: 280, descricao: 'Voo sócio solo – 0,8h – PP-ABC', data_transacao: '2026-05-08', data_vencimento: null, voo: 2 },
  { id: 3, carteira: 3, tipo: 'credito', valor: 1260, descricao: 'Compra de 3h de voo – PP-XYZ', data_transacao: '2026-04-15', data_vencimento: '2026-10-15', voo: null },
  { id: 4, carteira: 3, tipo: 'debito', valor: 504, descricao: 'Voo instrução duplo – 1,2h – PP-XYZ', data_transacao: '2026-05-10', data_vencimento: null, voo: 1 },
  { id: 5, carteira: 6, tipo: 'credito', valor: 2000, descricao: 'Compra de horas antecipadas', data_transacao: '2026-03-01', data_vencimento: '2026-09-01', voo: null },
  { id: 6, carteira: 6, tipo: 'debito', valor: 390, descricao: 'Voo sócio duplo – 1,0h – PT-DEF', data_transacao: '2026-05-03', data_vencimento: null, voo: 5 },
]
