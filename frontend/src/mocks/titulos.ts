export type TituloPagarTipo = 'fornecedor' | 'folha' | 'conta_fixa' | 'outros' | 'instrutor'
export type TituloPagarStatus = 'em_aberto' | 'baixado'

export interface TituloPagar {
  id: string
  tipo: TituloPagarTipo
  favorecido: string
  descricao: string
  num_parcela: number
  total_parcelas: number
  valor: number
  data_emissao: string
  data_vencimento: string
  status: TituloPagarStatus
  valor_pago: number | null
  data_pagamento: string | null
  recorrente: boolean
}

export type TituloReceberTipo = 'mensalidade' | 'pontual' | 'servico' | 'voo'
export type TituloReceberStatus = 'em_aberto' | 'pago_parcial' | 'baixado'

export interface TituloReceber {
  id: string
  usuario_nome: string
  tipo: TituloReceberTipo
  descricao: string
  num_parcela: number
  total_parcelas: number
  valor: number
  valor_pago: number
  juros_aplicado: number
  data_emissao: string
  data_vencimento: string
  data_pagamento: string | null
  status: TituloReceberStatus
}

export const TITULO_PAGAR_TIPO_LABELS: Record<TituloPagarTipo, string> = {
  fornecedor: 'Fornecedor',
  folha: 'Folha',
  conta_fixa: 'Conta Fixa',
  outros: 'Outros',
  instrutor: 'Instrutor',
}

export const TITULO_RECEBER_TIPO_LABELS: Record<TituloReceberTipo, string> = {
  mensalidade: 'Mensalidade',
  pontual: 'Pontual',
  servico: 'Serviço',
  voo: 'Voo',
}

export const ALL_TITULO_PAGAR_TIPOS: TituloPagarTipo[] = ['fornecedor', 'folha', 'conta_fixa', 'outros', 'instrutor']
export const ALL_TITULO_RECEBER_TIPOS: TituloReceberTipo[] = ['mensalidade', 'pontual', 'servico', 'voo']

export const mockTitulosPagar: TituloPagar[] = [
  {
    id: '1',
    tipo: 'folha',
    favorecido: 'Carlos Eduardo Silva',
    descricao: 'Salário – Maio 2026',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 3500,
    data_emissao: '2026-05-01',
    data_vencimento: '2026-05-05',
    status: 'em_aberto',
    valor_pago: null,
    data_pagamento: null,
    recorrente: true,
  },
  {
    id: '2',
    tipo: 'fornecedor',
    favorecido: 'ABC Combustíveis Ltda',
    descricao: 'Combustível – Abril 2026',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 1200,
    data_emissao: '2026-04-01',
    data_vencimento: '2026-04-30',
    status: 'baixado',
    valor_pago: 1200,
    data_pagamento: '2026-04-29',
    recorrente: false,
  },
  {
    id: '3',
    tipo: 'conta_fixa',
    favorecido: 'Companhia de Energia',
    descricao: 'Energia elétrica – Maio 2026',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 450,
    data_emissao: '2026-05-01',
    data_vencimento: '2026-05-20',
    status: 'em_aberto',
    valor_pago: null,
    data_pagamento: null,
    recorrente: true,
  },
  {
    id: '4',
    tipo: 'folha',
    favorecido: 'Ana Paula Santos',
    descricao: 'Salário Instrutora – Maio 2026',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 2800,
    data_emissao: '2026-05-01',
    data_vencimento: '2026-05-05',
    status: 'em_aberto',
    valor_pago: null,
    data_pagamento: null,
    recorrente: true,
  },
  {
    id: '5',
    tipo: 'fornecedor',
    favorecido: 'Manutenção Hangar S/A',
    descricao: 'Manutenção preventiva – Parcela 1/3',
    num_parcela: 1,
    total_parcelas: 3,
    valor: 5000,
    data_emissao: '2026-04-20',
    data_vencimento: '2026-06-10',
    status: 'em_aberto',
    valor_pago: null,
    data_pagamento: null,
    recorrente: false,
  },
  {
    id: '6',
    tipo: 'conta_fixa',
    favorecido: 'Imobiliária Aeroporto',
    descricao: 'Aluguel do terreno – Maio 2026',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 1800,
    data_emissao: '2026-05-01',
    data_vencimento: '2026-05-15',
    status: 'em_aberto',
    valor_pago: null,
    data_pagamento: null,
    recorrente: true,
  },
  {
    id: '7',
    tipo: 'outros',
    favorecido: 'Papelaria Central',
    descricao: 'Material de escritório – Abril',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 230,
    data_emissao: '2026-04-05',
    data_vencimento: '2026-04-15',
    status: 'baixado',
    valor_pago: 230,
    data_pagamento: '2026-04-14',
    recorrente: false,
  },
  {
    id: '8',
    tipo: 'fornecedor',
    favorecido: 'AeroPartes Brasil',
    descricao: 'Peças de reposição – Parcela 2/4',
    num_parcela: 2,
    total_parcelas: 4,
    valor: 7500,
    data_emissao: '2026-02-01',
    data_vencimento: '2026-03-20',
    status: 'baixado',
    valor_pago: 7500,
    data_pagamento: '2026-03-19',
    recorrente: false,
  },
]

export const mockTitulosReceber: TituloReceber[] = [
  {
    id: '1',
    usuario_nome: 'Ana Paula Santos',
    tipo: 'mensalidade',
    descricao: 'Mensalidade aluno – Abril 2026',
    num_parcela: 4,
    total_parcelas: 12,
    valor: 350,
    valor_pago: 0,
    juros_aplicado: 0,
    data_emissao: '2026-04-01',
    data_vencimento: '2026-04-30',
    data_pagamento: null,
    status: 'em_aberto',
  },
  {
    id: '2',
    usuario_nome: 'Roberto Ferreira',
    tipo: 'mensalidade',
    descricao: 'Mensalidade sócio – Maio 2026',
    num_parcela: 5,
    total_parcelas: 12,
    valor: 350,
    valor_pago: 0,
    juros_aplicado: 0,
    data_emissao: '2026-05-01',
    data_vencimento: '2026-05-30',
    data_pagamento: null,
    status: 'em_aberto',
  },
  {
    id: '3',
    usuario_nome: 'Paulo Mendes',
    tipo: 'voo',
    descricao: 'Voo instrução duplo – 1,2h – PP-XYZ',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 180,
    valor_pago: 100,
    juros_aplicado: 0,
    data_emissao: '2026-05-05',
    data_vencimento: '2026-05-20',
    data_pagamento: null,
    status: 'pago_parcial',
  },
  {
    id: '4',
    usuario_nome: 'Júlia Oliveira',
    tipo: 'pontual',
    descricao: 'Taxa de inscrição no curso',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 500,
    valor_pago: 500,
    juros_aplicado: 0,
    data_emissao: '2026-03-10',
    data_vencimento: '2026-03-20',
    data_pagamento: '2026-03-19',
    status: 'baixado',
  },
  {
    id: '5',
    usuario_nome: 'Marcos Costa',
    tipo: 'servico',
    descricao: 'Renovação CMA – Exame médico',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 750,
    valor_pago: 0,
    juros_aplicado: 0,
    data_emissao: '2026-05-01',
    data_vencimento: '2026-05-20',
    data_pagamento: null,
    status: 'em_aberto',
  },
  {
    id: '6',
    usuario_nome: 'Fernanda Lima',
    tipo: 'mensalidade',
    descricao: 'Mensalidade sócia – Abril 2026',
    num_parcela: 4,
    total_parcelas: 12,
    valor: 350,
    valor_pago: 350,
    juros_aplicado: 0,
    data_emissao: '2026-04-01',
    data_vencimento: '2026-04-30',
    data_pagamento: '2026-04-28',
    status: 'baixado',
  },
  {
    id: '7',
    usuario_nome: 'Lucas Araújo',
    tipo: 'voo',
    descricao: 'Voo sócio solo – 0,8h – PP-ABC',
    num_parcela: 1,
    total_parcelas: 1,
    valor: 240,
    valor_pago: 0,
    juros_aplicado: 0,
    data_emissao: '2026-05-08',
    data_vencimento: '2026-05-23',
    data_pagamento: null,
    status: 'em_aberto',
  },
  {
    id: '8',
    usuario_nome: 'Mariana Rocha',
    tipo: 'mensalidade',
    descricao: 'Mensalidade aluna – Março 2026',
    num_parcela: 3,
    total_parcelas: 12,
    valor: 350,
    valor_pago: 0,
    juros_aplicado: 17.5,
    data_emissao: '2026-03-01',
    data_vencimento: '2026-03-30',
    data_pagamento: null,
    status: 'em_aberto',
  },
]
