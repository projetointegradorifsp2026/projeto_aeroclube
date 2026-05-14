export type MovimentacaoTipo = 'credito' | 'debito'

export const MOVIMENTACAO_TIPO_LABELS: Record<MovimentacaoTipo, string> = {
  credito: 'Crédito',
  debito: 'Débito',
}

export interface MovimentacaoCarteira {
  id: string
  usuario_id: string
  usuario_nome: string
  tipo: MovimentacaoTipo
  valor: number
  descricao: string
  data_transacao: string
  data_vencimento: string | null
  saldo_resultante: number
}

export const mockMovimentacoes: MovimentacaoCarteira[] = [
  {
    id: '1',
    usuario_id: '3',
    usuario_nome: 'Roberto Ferreira',
    tipo: 'credito',
    valor: 1750,
    descricao: 'Compra de 5h de voo – PP-ABC',
    data_transacao: '2026-04-01',
    data_vencimento: '2026-10-01',
    saldo_resultante: 1750,
  },
  {
    id: '2',
    usuario_id: '3',
    usuario_nome: 'Roberto Ferreira',
    tipo: 'debito',
    valor: 280,
    descricao: 'Voo sócio solo – 0,8h – PP-ABC',
    data_transacao: '2026-05-08',
    data_vencimento: null,
    saldo_resultante: 1470,
  },
  {
    id: '3',
    usuario_id: '2',
    usuario_nome: 'Ana Paula Santos',
    tipo: 'credito',
    valor: 1260,
    descricao: 'Compra de 3h de voo – PP-XYZ',
    data_transacao: '2026-04-15',
    data_vencimento: '2026-10-15',
    saldo_resultante: 1260,
  },
  {
    id: '4',
    usuario_id: '2',
    usuario_nome: 'Ana Paula Santos',
    tipo: 'debito',
    valor: 504,
    descricao: 'Voo instrução duplo – 1,2h – PP-XYZ',
    data_transacao: '2026-05-10',
    data_vencimento: null,
    saldo_resultante: 756,
  },
  {
    id: '5',
    usuario_id: '6',
    usuario_nome: 'Fernanda Lima',
    tipo: 'credito',
    valor: 2000,
    descricao: 'Compra de horas antecipadas',
    data_transacao: '2026-03-01',
    data_vencimento: '2026-09-01',
    saldo_resultante: 2000,
  },
  {
    id: '6',
    usuario_id: '6',
    usuario_nome: 'Fernanda Lima',
    tipo: 'debito',
    valor: 390,
    descricao: 'Voo sócio duplo – 1,0h – PT-DEF',
    data_transacao: '2026-05-03',
    data_vencimento: null,
    saldo_resultante: 1610,
  },
]
