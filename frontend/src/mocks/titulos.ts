export type TituloPagarTipo = 'fornecedor' | 'folha' | 'conta_fixa' | 'outros'
export type TituloPagarStatus = 'em_aberto' | 'baixado'

export interface TituloPagar {
  id: string
  tipo: TituloPagarTipo
  favorecido: string
  descricao: string
  num_parcela: number
  total_parcelas: number
  valor: number
  multa: number
  data_emissao: string
  data_vencimento: string
  status: TituloPagarStatus
  valor_pago: number | null
  data_pagamento: string | null
  recorrente: boolean
}

export type TituloReceberTipo = 'mensalidade' | 'pontual' | 'servico' | 'voo' | 'carteira'
export type TituloReceberStatus = 'em_aberto' | 'pago_parcial' | 'baixado'

export interface TituloReceber {
  id: string
  usuario_id?: string
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
  folha: 'Folha de Pagamento',
  conta_fixa: 'Conta Fixa',
  outros: 'Outros',
}

export const TITULO_RECEBER_TIPO_LABELS: Record<TituloReceberTipo, string> = {
  mensalidade: 'Mensalidade',
  pontual: 'Pontual',
  servico: 'Serviço',
  voo: 'Voo',
  carteira: 'Carteira',
}

export const ALL_TITULO_PAGAR_TIPOS: TituloPagarTipo[] = ['fornecedor', 'folha', 'conta_fixa', 'outros']
export const ALL_TITULO_RECEBER_TIPOS: TituloReceberTipo[] = ['mensalidade', 'pontual', 'servico', 'voo', 'carteira']

export const mockTitulosPagar: TituloPagar[] = [
  // Folha de pagamento
  {
    id: '1', tipo: 'folha', favorecido: 'Carlos Eduardo Silva',
    descricao: 'Salário – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 3500, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-05',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: true,
  },
  {
    id: '2', tipo: 'folha', favorecido: 'Marcos Costa',
    descricao: 'Salário – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 2800, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-05',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: true,
  },
  {
    id: '3', tipo: 'folha', favorecido: 'Lucas Araújo',
    descricao: 'Salário – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 3200, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-05',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: true,
  },
  {
    id: '4', tipo: 'folha', favorecido: 'Carlos Eduardo Silva',
    descricao: 'Salário – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 3500, multa: 0, data_emissao: '2026-04-01', data_vencimento: '2026-04-05',
    status: 'baixado', valor_pago: 3500, data_pagamento: '2026-04-04', recorrente: true,
  },
  {
    id: '5', tipo: 'folha', favorecido: 'Marcos Costa',
    descricao: 'Salário – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 2800, multa: 0, data_emissao: '2026-04-01', data_vencimento: '2026-04-05',
    status: 'baixado', valor_pago: 2800, data_pagamento: '2026-04-04', recorrente: true,
  },
  {
    id: '6', tipo: 'folha', favorecido: 'Lucas Araújo',
    descricao: 'Salário – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 3200, multa: 0, data_emissao: '2026-04-01', data_vencimento: '2026-04-05',
    status: 'baixado', valor_pago: 3200, data_pagamento: '2026-04-04', recorrente: true,
  },
  // Comissões de instrutores (tipo outros)
  {
    id: '10', tipo: 'outros', favorecido: 'Ricardo Almeida',
    descricao: 'Comissão instrução – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1050, multa: 0, data_emissao: '2026-04-30', data_vencimento: '2026-05-05',
    status: 'baixado', valor_pago: 1050, data_pagamento: '2026-05-05', recorrente: false,
  },
  {
    id: '11', tipo: 'outros', favorecido: 'Ana Paula Santos',
    descricao: 'Comissão instrução – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 820, multa: 0, data_emissao: '2026-04-30', data_vencimento: '2026-05-05',
    status: 'baixado', valor_pago: 820, data_pagamento: '2026-05-05', recorrente: false,
  },
  // Fornecedores
  {
    id: '12', tipo: 'fornecedor', favorecido: 'ABC Combustíveis Ltda',
    descricao: 'Combustível – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1350, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-31',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: false,
  },
  {
    id: '13', tipo: 'fornecedor', favorecido: 'ABC Combustíveis Ltda',
    descricao: 'Combustível – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1200, multa: 0, data_emissao: '2026-04-01', data_vencimento: '2026-04-30',
    status: 'baixado', valor_pago: 1200, data_pagamento: '2026-04-29', recorrente: false,
  },
  {
    id: '14', tipo: 'fornecedor', favorecido: 'Manutenção Hangar S/A',
    descricao: 'Manutenção preventiva – Parcela 1/3', num_parcela: 1, total_parcelas: 3,
    valor: 5000, multa: 0, data_emissao: '2026-04-20', data_vencimento: '2026-06-10',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: false,
  },
  {
    id: '15', tipo: 'fornecedor', favorecido: 'AeroPartes Brasil',
    descricao: 'Peças de reposição – Parcela 1/2', num_parcela: 1, total_parcelas: 2,
    valor: 8500, multa: 0, data_emissao: '2026-04-15', data_vencimento: '2026-05-20',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: false,
  },
  {
    id: '16', tipo: 'fornecedor', favorecido: 'AeroPartes Brasil',
    descricao: 'Peças de reposição – Parcela 2/2', num_parcela: 2, total_parcelas: 2,
    valor: 8500, multa: 0, data_emissao: '2026-04-15', data_vencimento: '2026-06-20',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: false,
  },
  // Contas fixas
  {
    id: '17', tipo: 'conta_fixa', favorecido: 'Companhia de Energia',
    descricao: 'Energia elétrica – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 450, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-20',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: true,
  },
  {
    id: '18', tipo: 'conta_fixa', favorecido: 'Imobiliária Aeroporto',
    descricao: 'Aluguel do terreno – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1800, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-15',
    status: 'baixado', valor_pago: 1800, data_pagamento: '2026-05-14', recorrente: true,
  },
  {
    id: '19', tipo: 'conta_fixa', favorecido: 'Telecom Brasil',
    descricao: 'Internet e telefone – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 350, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-10',
    status: 'baixado', valor_pago: 350, data_pagamento: '2026-05-10', recorrente: true,
  },
  {
    id: '20', tipo: 'conta_fixa', favorecido: 'Seguradora Aérea S/A',
    descricao: 'Seguro das aeronaves – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1200, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-05',
    status: 'baixado', valor_pago: 1200, data_pagamento: '2026-05-05', recorrente: true,
  },
  {
    id: '21', tipo: 'conta_fixa', favorecido: 'SAAE',
    descricao: 'Água e saneamento – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 180, multa: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-25',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: true,
  },
  {
    id: '22', tipo: 'conta_fixa', favorecido: 'Companhia de Energia',
    descricao: 'Energia elétrica – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 430, multa: 0, data_emissao: '2026-04-01', data_vencimento: '2026-04-20',
    status: 'baixado', valor_pago: 430, data_pagamento: '2026-04-19', recorrente: true,
  },
  {
    id: '23', tipo: 'conta_fixa', favorecido: 'Imobiliária Aeroporto',
    descricao: 'Aluguel do terreno – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1800, multa: 0, data_emissao: '2026-04-01', data_vencimento: '2026-04-15',
    status: 'baixado', valor_pago: 1800, data_pagamento: '2026-04-14', recorrente: true,
  },
  // Baixas de carteira (devoluções/remoções de saldo)
  {
    id: '26', tipo: 'outros', favorecido: 'Beatriz Cardoso',
    descricao: 'Remoção de saldo da carteira', num_parcela: 1, total_parcelas: 1,
    valor: 400, multa: 0, data_emissao: '2026-05-16', data_vencimento: '2026-05-16',
    status: 'baixado', valor_pago: 400, data_pagamento: '2026-05-16', recorrente: false,
  },
  {
    id: '27', tipo: 'outros', favorecido: 'Roberto Ferreira',
    descricao: 'Remoção de saldo da carteira', num_parcela: 1, total_parcelas: 1,
    valor: 200, multa: 0, data_emissao: '2026-05-17', data_vencimento: '2026-05-17',
    status: 'baixado', valor_pago: 200, data_pagamento: '2026-05-17', recorrente: false,
  },
  // Outros
  {
    id: '24', tipo: 'outros', favorecido: 'GLP Gás & Serviços',
    descricao: 'Recarga botijões de gás – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 320, multa: 0, data_emissao: '2026-05-10', data_vencimento: '2026-05-18',
    status: 'em_aberto', valor_pago: null, data_pagamento: null, recorrente: false,
  },
  {
    id: '25', tipo: 'outros', favorecido: 'Papelaria Central',
    descricao: 'Material de escritório – Março 2026', num_parcela: 1, total_parcelas: 1,
    valor: 180, multa: 0, data_emissao: '2026-03-05', data_vencimento: '2026-03-15',
    status: 'baixado', valor_pago: 180, data_pagamento: '2026-03-14', recorrente: false,
  },
]

export const mockTitulosReceber: TituloReceber[] = [
  // Mensalidades – Maio 2026
  {
    id: '1', usuario_id: '2', usuario_nome: 'Ana Paula Santos', tipo: 'mensalidade',
    descricao: 'Mensalidade aluno – Maio 2026', num_parcela: 5, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '2', usuario_id: '3', usuario_nome: 'Roberto Ferreira', tipo: 'mensalidade',
    descricao: 'Mensalidade sócio – Maio 2026', num_parcela: 5, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '3', usuario_id: '6', usuario_nome: 'Fernanda Lima', tipo: 'mensalidade',
    descricao: 'Mensalidade sócia – Maio 2026', num_parcela: 5, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '4', usuario_id: '12', usuario_nome: 'Beatriz Cardoso', tipo: 'mensalidade',
    descricao: 'Mensalidade sócia – Maio 2026', num_parcela: 3, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '5', usuario_id: '14', usuario_nome: 'Camila Torres', tipo: 'mensalidade',
    descricao: 'Mensalidade aluno – Maio 2026', num_parcela: 2, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '6', usuario_id: '11', usuario_nome: 'Thiago Barbosa', tipo: 'mensalidade',
    descricao: 'Mensalidade aluno – Maio 2026', num_parcela: 4, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '7', usuario_id: '10', usuario_nome: 'Patrícia Nunes', tipo: 'mensalidade',
    descricao: 'Mensalidade aluno – Maio 2026', num_parcela: 5, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'em_aberto',
  },
  // Mensalidades – Abril 2026
  {
    id: '8', usuario_id: '2', usuario_nome: 'Ana Paula Santos', tipo: 'mensalidade',
    descricao: 'Mensalidade aluno – Abril 2026', num_parcela: 4, total_parcelas: 12,
    valor: 350, valor_pago: 350, juros_aplicado: 0,
    data_emissao: '2026-04-01', data_vencimento: '2026-04-30', data_pagamento: '2026-04-28', status: 'baixado',
  },
  {
    id: '9', usuario_id: '3', usuario_nome: 'Roberto Ferreira', tipo: 'mensalidade',
    descricao: 'Mensalidade sócio – Abril 2026', num_parcela: 4, total_parcelas: 12,
    valor: 350, valor_pago: 350, juros_aplicado: 0,
    data_emissao: '2026-04-01', data_vencimento: '2026-04-30', data_pagamento: '2026-04-29', status: 'baixado',
  },
  {
    id: '10', usuario_id: '6', usuario_nome: 'Fernanda Lima', tipo: 'mensalidade',
    descricao: 'Mensalidade sócia – Abril 2026', num_parcela: 4, total_parcelas: 12,
    valor: 350, valor_pago: 350, juros_aplicado: 0,
    data_emissao: '2026-04-01', data_vencimento: '2026-04-30', data_pagamento: '2026-04-27', status: 'baixado',
  },
  {
    id: '11', usuario_id: '12', usuario_nome: 'Beatriz Cardoso', tipo: 'mensalidade',
    descricao: 'Mensalidade sócia – Abril 2026', num_parcela: 2, total_parcelas: 12,
    valor: 350, valor_pago: 350, juros_aplicado: 0,
    data_emissao: '2026-04-01', data_vencimento: '2026-04-30', data_pagamento: '2026-04-26', status: 'baixado',
  },
  {
    id: '12', usuario_id: '11', usuario_nome: 'Thiago Barbosa', tipo: 'mensalidade',
    descricao: 'Mensalidade aluno – Abril 2026', num_parcela: 3, total_parcelas: 12,
    valor: 350, valor_pago: 350, juros_aplicado: 0,
    data_emissao: '2026-04-01', data_vencimento: '2026-04-30', data_pagamento: '2026-04-25', status: 'baixado',
  },
  {
    id: '13', usuario_id: '8', usuario_nome: 'Mariana Rocha', tipo: 'mensalidade',
    descricao: 'Mensalidade aluna – Março 2026', num_parcela: 3, total_parcelas: 12,
    valor: 350, valor_pago: 0, juros_aplicado: 17.5,
    data_emissao: '2026-03-01', data_vencimento: '2026-03-30', data_pagamento: null, status: 'em_aberto',
  },
  // Voos – Maio 2026 (em_aberto)
  {
    id: '14', usuario_id: '2', usuario_nome: 'Ana Paula Santos', tipo: 'voo',
    descricao: 'Voo instrução duplo – 1,2h – PP-XYZ', num_parcela: 1, total_parcelas: 1,
    valor: 504, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-15', data_vencimento: '2026-06-15', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '15', usuario_id: '3', usuario_nome: 'Roberto Ferreira', tipo: 'voo',
    descricao: 'Voo sócio solo – 0,8h – PP-ABC', num_parcela: 1, total_parcelas: 1,
    valor: 280, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-14', data_vencimento: '2026-06-14', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '16', usuario_id: '11', usuario_nome: 'Thiago Barbosa', tipo: 'voo',
    descricao: 'Voo instrução duplo – 1,0h – PT-DEF', num_parcela: 1, total_parcelas: 1,
    valor: 390, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-13', data_vencimento: '2026-06-13', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '17', usuario_id: '10', usuario_nome: 'Patrícia Nunes', tipo: 'voo',
    descricao: 'Voo instrução solo – 0,7h – PP-XYZ', num_parcela: 1, total_parcelas: 1,
    valor: 210, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-12', data_vencimento: '2026-06-12', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '18', usuario_id: '6', usuario_nome: 'Fernanda Lima', tipo: 'voo',
    descricao: 'Voo sócio duplo – 1,0h – PP-ABC', num_parcela: 1, total_parcelas: 1,
    valor: 490, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-11', data_vencimento: '2026-06-11', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '19', usuario_id: '7', usuario_nome: 'Paulo Mendes', tipo: 'voo',
    descricao: 'Voo externo – 0,6h – PT-DEF', num_parcela: 1, total_parcelas: 1,
    valor: 234, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-10', data_vencimento: '2026-06-10', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '20', usuario_id: '14', usuario_nome: 'Camila Torres', tipo: 'voo',
    descricao: 'Voo instrução duplo – 1,0h – PT-JKL', num_parcela: 1, total_parcelas: 1,
    valor: 450, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-09', data_vencimento: '2026-06-09', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '21', usuario_id: '12', usuario_nome: 'Beatriz Cardoso', tipo: 'voo',
    descricao: 'Voo sócio solo – 1,0h – PP-ABC', num_parcela: 1, total_parcelas: 1,
    valor: 350, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-08', data_vencimento: '2026-06-08', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '22', usuario_id: '2', usuario_nome: 'Ana Paula Santos', tipo: 'voo',
    descricao: 'Voo instrução solo – 1,0h – PT-DEF', num_parcela: 1, total_parcelas: 1,
    valor: 280, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-07', data_vencimento: '2026-06-07', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '23', usuario_id: '11', usuario_nome: 'Thiago Barbosa', tipo: 'voo',
    descricao: 'Voo instrução duplo – 1,2h – PP-XYZ', num_parcela: 1, total_parcelas: 1,
    valor: 504, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-06', data_vencimento: '2026-06-06', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '24', usuario_id: '3', usuario_nome: 'Roberto Ferreira', tipo: 'voo',
    descricao: 'Voo planador sócio solo – 45min – PT-PLN', num_parcela: 1, total_parcelas: 1,
    valor: 210, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-05', data_vencimento: '2026-06-05', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '25', usuario_id: '14', usuario_nome: 'Camila Torres', tipo: 'voo',
    descricao: 'Voo planador instrução duplo – 35min – PP-VOA', num_parcela: 1, total_parcelas: 1,
    valor: 195, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-04', data_vencimento: '2026-06-04', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '26', usuario_id: '13', usuario_nome: 'Rafael Gomes', tipo: 'voo',
    descricao: 'Voo externo – 1,0h – PT-DEF', num_parcela: 1, total_parcelas: 1,
    valor: 390, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-03', data_vencimento: '2026-06-03', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '27', usuario_id: '6', usuario_nome: 'Fernanda Lima', tipo: 'voo',
    descricao: 'Voo sócio solo – 0,9h – PT-JKL', num_parcela: 1, total_parcelas: 1,
    valor: 288, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-02', data_vencimento: '2026-06-02', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '28', usuario_id: '10', usuario_nome: 'Patrícia Nunes', tipo: 'voo',
    descricao: 'Voo instrução duplo – 1,0h – PP-ABC', num_parcela: 1, total_parcelas: 1,
    valor: 490, valor_pago: 200, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-06-01', data_pagamento: null, status: 'pago_parcial',
  },
  // Voos – Abril 2026 (mistura baixado/em_aberto)
  {
    id: '29', usuario_id: '12', usuario_nome: 'Beatriz Cardoso', tipo: 'voo',
    descricao: 'Voo sócio duplo – 1,5h – PP-XYZ', num_parcela: 1, total_parcelas: 1,
    valor: 630, valor_pago: 630, juros_aplicado: 0,
    data_emissao: '2026-04-28', data_vencimento: '2026-05-28', data_pagamento: '2026-04-29', status: 'baixado',
  },
  {
    id: '30', usuario_id: '14', usuario_nome: 'Camila Torres', tipo: 'voo',
    descricao: 'Voo instrução solo – 1,2h – PT-DEF', num_parcela: 1, total_parcelas: 1,
    valor: 336, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-04-25', data_vencimento: '2026-05-25', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '31', usuario_id: '7', usuario_nome: 'Paulo Mendes', tipo: 'voo',
    descricao: 'Voo externo – 1,0h – PP-ABC', num_parcela: 1, total_parcelas: 1,
    valor: 490, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-04-22', data_vencimento: '2026-05-22', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '32', usuario_id: '2', usuario_nome: 'Ana Paula Santos', tipo: 'voo',
    descricao: 'Voo instrução duplo – 1,2h – PP-XYZ', num_parcela: 1, total_parcelas: 1,
    valor: 504, valor_pago: 504, juros_aplicado: 0,
    data_emissao: '2026-04-18', data_vencimento: '2026-05-18', data_pagamento: '2026-04-20', status: 'baixado',
  },
  {
    id: '33', usuario_id: '3', usuario_nome: 'Roberto Ferreira', tipo: 'voo',
    descricao: 'Voo sócio solo – 0,9h – PT-JKL', num_parcela: 1, total_parcelas: 1,
    valor: 288, valor_pago: 288, juros_aplicado: 0,
    data_emissao: '2026-04-15', data_vencimento: '2026-05-15', data_pagamento: '2026-04-17', status: 'baixado',
  },
  {
    id: '34', usuario_id: '12', usuario_nome: 'Beatriz Cardoso', tipo: 'voo',
    descricao: 'Voo planador sócio solo – 50min – PR-ASA', num_parcela: 1, total_parcelas: 1,
    valor: 215, valor_pago: 215, juros_aplicado: 0,
    data_emissao: '2026-04-10', data_vencimento: '2026-05-10', data_pagamento: '2026-04-11', status: 'baixado',
  },
  {
    id: '35', usuario_id: '11', usuario_nome: 'Thiago Barbosa', tipo: 'voo',
    descricao: 'Voo planador instrução duplo – 30min – PT-PLN', num_parcela: 1, total_parcelas: 1,
    valor: 150, valor_pago: 150, juros_aplicado: 0,
    data_emissao: '2026-04-08', data_vencimento: '2026-05-08', data_pagamento: '2026-04-10', status: 'baixado',
  },
  // Carteira (recargas)
  {
    id: '36', usuario_id: '2', usuario_nome: 'Ana Paula Santos', tipo: 'carteira',
    descricao: 'Recarga de carteira', num_parcela: 1, total_parcelas: 1,
    valor: 1000, valor_pago: 1000, juros_aplicado: 0,
    data_emissao: '2026-05-16', data_vencimento: '2026-05-16', data_pagamento: '2026-05-16', status: 'baixado',
  },
  {
    id: '37', usuario_id: '3', usuario_nome: 'Roberto Ferreira', tipo: 'carteira',
    descricao: 'Recarga de carteira', num_parcela: 1, total_parcelas: 1,
    valor: 1500, valor_pago: 1500, juros_aplicado: 0,
    data_emissao: '2026-05-15', data_vencimento: '2026-05-15', data_pagamento: '2026-05-15', status: 'baixado',
  },
  {
    id: '38', usuario_id: '6', usuario_nome: 'Fernanda Lima', tipo: 'carteira',
    descricao: 'Recarga de carteira', num_parcela: 1, total_parcelas: 1,
    valor: 2000, valor_pago: 2000, juros_aplicado: 0,
    data_emissao: '2026-05-14', data_vencimento: '2026-05-14', data_pagamento: '2026-05-14', status: 'baixado',
  },
  {
    id: '39', usuario_id: '12', usuario_nome: 'Beatriz Cardoso', tipo: 'carteira',
    descricao: 'Recarga de carteira', num_parcela: 1, total_parcelas: 1,
    valor: 2500, valor_pago: 2500, juros_aplicado: 0,
    data_emissao: '2026-05-13', data_vencimento: '2026-05-13', data_pagamento: '2026-05-13', status: 'baixado',
  },
  {
    id: '40', usuario_id: '11', usuario_nome: 'Thiago Barbosa', tipo: 'carteira',
    descricao: 'Recarga de carteira', num_parcela: 1, total_parcelas: 1,
    valor: 500, valor_pago: 500, juros_aplicado: 0,
    data_emissao: '2026-05-12', data_vencimento: '2026-05-12', data_pagamento: '2026-05-12', status: 'baixado',
  },
  {
    id: '41', usuario_id: '14', usuario_nome: 'Camila Torres', tipo: 'carteira',
    descricao: 'Recarga de carteira', num_parcela: 1, total_parcelas: 1,
    valor: 1000, valor_pago: 1000, juros_aplicado: 0,
    data_emissao: '2026-05-11', data_vencimento: '2026-05-11', data_pagamento: '2026-05-11', status: 'baixado',
  },
  // Pontual / Serviço
  {
    id: '42', usuario_id: '4', usuario_nome: 'Júlia Oliveira', tipo: 'pontual',
    descricao: 'Taxa de inscrição no curso', num_parcela: 1, total_parcelas: 1,
    valor: 500, valor_pago: 500, juros_aplicado: 0,
    data_emissao: '2026-03-10', data_vencimento: '2026-03-20', data_pagamento: '2026-03-19', status: 'baixado',
  },
  {
    id: '43', usuario_id: '5', usuario_nome: 'Marcos Costa', tipo: 'servico',
    descricao: 'Renovação CMA – Exame médico', num_parcela: 1, total_parcelas: 1,
    valor: 750, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-01', data_vencimento: '2026-05-20', data_pagamento: null, status: 'em_aberto',
  },
  {
    id: '44', usuario_id: '13', usuario_nome: 'Rafael Gomes', tipo: 'servico',
    descricao: 'Simulador de voo – 5 horas', num_parcela: 1, total_parcelas: 1,
    valor: 320, valor_pago: 0, juros_aplicado: 0,
    data_emissao: '2026-05-10', data_vencimento: '2026-05-25', data_pagamento: null, status: 'em_aberto',
  },
  // Funcionários – Carlos Eduardo Silva (entidade 101)
  {
    id: '45', usuario_id: '101', usuario_nome: 'Carlos Eduardo Silva', tipo: 'servico',
    descricao: 'Horas extras – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 420, valor_pago: 420, juros_aplicado: 0,
    data_emissao: '2026-04-30', data_vencimento: '2026-05-05', data_pagamento: '2026-05-05', status: 'baixado',
  },
  // Funcionários – Marcos Costa (entidade 102)
  {
    id: '47', usuario_id: '102', usuario_nome: 'Marcos Costa', tipo: 'servico',
    descricao: 'Adiantamento salarial – Maio 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1300, valor_pago: 1300, juros_aplicado: 0,
    data_emissao: '2026-05-10', data_vencimento: '2026-05-15', data_pagamento: '2026-05-14', status: 'baixado',
  },
  // Instrutores – Ricardo Almeida (entidade 104)
  {
    id: '48', usuario_id: '104', usuario_nome: 'Ricardo Almeida', tipo: 'servico',
    descricao: 'Comissão instrução – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 1050, valor_pago: 1050, juros_aplicado: 0,
    data_emissao: '2026-04-30', data_vencimento: '2026-05-05', data_pagamento: '2026-05-05', status: 'baixado',
  },
  // Instrutores – Ana Paula Santos (entidade 105)
  {
    id: '50', usuario_id: '105', usuario_nome: 'Ana Paula Santos', tipo: 'servico',
    descricao: 'Comissão instrução – Abril 2026', num_parcela: 1, total_parcelas: 1,
    valor: 820, valor_pago: 820, juros_aplicado: 0,
    data_emissao: '2026-04-30', data_vencimento: '2026-05-05', data_pagamento: '2026-05-05', status: 'baixado',
  },
]
