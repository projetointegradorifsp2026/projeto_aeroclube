// Alinhado com backend: TituloPagar + TituloReceber

// ─── Títulos a Pagar ────────────────────────────────────────────────────────
export type TituloPagarTipo = 'fornecedor' | 'folha_pagamento' | 'conta_fixa' | 'outros'
export type TituloPagarStatus = 'aberto' | 'baixado'

export interface TituloPagar {
  id: number
  tipo: TituloPagarTipo
  favorecido: number               // FK → Favorecido.id
  favorecido_nome: string          // campo extra para exibição
  descricao: string
  num_parcela: number
  total_parcelas: number
  valor: number
  data_emissao: string
  data_vencimento: string
  status: TituloPagarStatus
  valor_pago: number | null
  data_pagamento: string | null
  is_recorrente: boolean
  periodicidade_dias: number | null
}

export const TITULO_PAGAR_TIPO_LABELS: Record<TituloPagarTipo, string> = {
  fornecedor: 'Fornecedor',
  folha_pagamento: 'Folha de Pagamento',
  conta_fixa: 'Conta Fixa',
  outros: 'Outros',
}

export const ALL_TITULO_PAGAR_TIPOS: TituloPagarTipo[] = ['fornecedor', 'folha_pagamento', 'conta_fixa', 'outros']

// ─── Títulos a Receber ───────────────────────────────────────────────────────
// 'horas_pre_pagas' = compra antecipada de horas (carteira)
// 'pago_parcial' é status derivado no frontend: status='aberto' && valor_pago > 0
export type TituloReceberTipo = 'mensalidade' | 'voo' | 'horas_pre_pagas' | 'servico' | 'outros'
export type TituloReceberStatus = 'aberto' | 'baixado'

export interface TituloReceber {
  id: number
  participante: number             // FK → Usuario.id
  participante_nome: string        // campo extra para exibição
  tipo: TituloReceberTipo
  descricao: string
  voo: number | null               // FK → Voo.id
  num_parcela: number
  total_parcelas: number
  valor_original: number
  juros_aplicado: number
  valor_pago: number
  data_emissao: string
  data_vencimento: string
  data_pagamento: string | null
  status: TituloReceberStatus
}

export const TITULO_RECEBER_TIPO_LABELS: Record<TituloReceberTipo, string> = {
  mensalidade: 'Mensalidade',
  voo: 'Cobrança de Voo',
  horas_pre_pagas: 'Horas Pré-pagas',
  servico: 'Serviço',
  outros: 'Outros',
}

export const ALL_TITULO_RECEBER_TIPOS: TituloReceberTipo[] = ['mensalidade', 'voo', 'horas_pre_pagas', 'servico', 'outros']

// Helper: título com baixa parcial (aberto mas com algum pagamento)
export function isPagoParcial(t: TituloReceber): boolean {
  return t.status === 'aberto' && t.valor_pago > 0
}

// Helper: saldo devedor
export function saldoDevedor(t: TituloReceber): number {
  return t.valor_original + t.juros_aplicado - t.valor_pago
}

export const mockTitulosPagar: TituloPagar[] = [
  // Folha de pagamento
  { id: 1, tipo: 'folha_pagamento', favorecido: 1, favorecido_nome: 'Carlos Eduardo Silva', descricao: 'Salário – Maio 2026', num_parcela: 1, total_parcelas: 1, valor: 3500, data_emissao: '2026-05-01', data_vencimento: '2026-05-05', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: true, periodicidade_dias: 30 },
  { id: 2, tipo: 'folha_pagamento', favorecido: 2, favorecido_nome: 'Marcos Costa', descricao: 'Salário – Maio 2026', num_parcela: 1, total_parcelas: 1, valor: 2800, data_emissao: '2026-05-01', data_vencimento: '2026-05-05', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: true, periodicidade_dias: 30 },
  { id: 3, tipo: 'folha_pagamento', favorecido: 3, favorecido_nome: 'Lucas Araújo', descricao: 'Salário – Maio 2026', num_parcela: 1, total_parcelas: 1, valor: 3200, data_emissao: '2026-05-01', data_vencimento: '2026-05-05', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: true, periodicidade_dias: 30 },
  { id: 4, tipo: 'folha_pagamento', favorecido: 1, favorecido_nome: 'Carlos Eduardo Silva', descricao: 'Salário – Abril 2026', num_parcela: 1, total_parcelas: 1, valor: 3500, data_emissao: '2026-04-01', data_vencimento: '2026-04-05', status: 'baixado', valor_pago: 3500, data_pagamento: '2026-04-04', is_recorrente: true, periodicidade_dias: 30 },
  { id: 5, tipo: 'folha_pagamento', favorecido: 2, favorecido_nome: 'Marcos Costa', descricao: 'Salário – Abril 2026', num_parcela: 1, total_parcelas: 1, valor: 2800, data_emissao: '2026-04-01', data_vencimento: '2026-04-05', status: 'baixado', valor_pago: 2800, data_pagamento: '2026-04-04', is_recorrente: true, periodicidade_dias: 30 },
  // Comissões
  { id: 10, tipo: 'outros', favorecido: 4, favorecido_nome: 'Ricardo Almeida', descricao: 'Comissão instrução – Abril 2026', num_parcela: 1, total_parcelas: 1, valor: 1050, data_emissao: '2026-04-30', data_vencimento: '2026-05-05', status: 'baixado', valor_pago: 1050, data_pagamento: '2026-05-05', is_recorrente: false, periodicidade_dias: null },
  { id: 11, tipo: 'outros', favorecido: 5, favorecido_nome: 'Ana Paula Santos', descricao: 'Comissão instrução – Abril 2026', num_parcela: 1, total_parcelas: 1, valor: 820, data_emissao: '2026-04-30', data_vencimento: '2026-05-05', status: 'baixado', valor_pago: 820, data_pagamento: '2026-05-05', is_recorrente: false, periodicidade_dias: null },
  // Fornecedores
  { id: 12, tipo: 'fornecedor', favorecido: 6, favorecido_nome: 'ABC Combustíveis Ltda', descricao: 'Combustível – Maio 2026', num_parcela: 1, total_parcelas: 1, valor: 1350, data_emissao: '2026-05-01', data_vencimento: '2026-05-31', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: false, periodicidade_dias: null },
  { id: 14, tipo: 'fornecedor', favorecido: 7, favorecido_nome: 'Manutenção Hangar S/A', descricao: 'Manutenção preventiva – Parcela 1/3', num_parcela: 1, total_parcelas: 3, valor: 5000, data_emissao: '2026-04-20', data_vencimento: '2026-06-10', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: false, periodicidade_dias: null },
  { id: 15, tipo: 'fornecedor', favorecido: 8, favorecido_nome: 'AeroPartes Brasil', descricao: 'Peças de reposição – Parcela 1/2', num_parcela: 1, total_parcelas: 2, valor: 8500, data_emissao: '2026-04-15', data_vencimento: '2026-05-20', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: false, periodicidade_dias: null },
  // Contas fixas
  { id: 17, tipo: 'conta_fixa', favorecido: 9, favorecido_nome: 'Companhia de Energia', descricao: 'Energia elétrica – Maio 2026', num_parcela: 1, total_parcelas: 1, valor: 450, data_emissao: '2026-05-01', data_vencimento: '2026-05-20', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: true, periodicidade_dias: 30 },
  { id: 18, tipo: 'conta_fixa', favorecido: 10, favorecido_nome: 'Imobiliária Aeroporto', descricao: 'Aluguel do terreno – Maio 2026', num_parcela: 1, total_parcelas: 1, valor: 1800, data_emissao: '2026-05-01', data_vencimento: '2026-05-15', status: 'baixado', valor_pago: 1800, data_pagamento: '2026-05-14', is_recorrente: true, periodicidade_dias: 30 },
  { id: 21, tipo: 'conta_fixa', favorecido: 11, favorecido_nome: 'SAAE', descricao: 'Água e saneamento – Maio 2026', num_parcela: 1, total_parcelas: 1, valor: 180, data_emissao: '2026-05-01', data_vencimento: '2026-05-25', status: 'aberto', valor_pago: null, data_pagamento: null, is_recorrente: true, periodicidade_dias: 30 },
]

export const mockTitulosReceber: TituloReceber[] = [
  // Mensalidades – Maio 2026
  { id: 1, participante: 2, participante_nome: 'Ana Paula Santos', tipo: 'mensalidade', descricao: 'Mensalidade aluno – Maio 2026', voo: null, num_parcela: 5, total_parcelas: 12, valor_original: 350, juros_aplicado: 0, valor_pago: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'aberto' },
  { id: 2, participante: 3, participante_nome: 'Roberto Ferreira', tipo: 'mensalidade', descricao: 'Mensalidade sócio – Maio 2026', voo: null, num_parcela: 5, total_parcelas: 12, valor_original: 350, juros_aplicado: 0, valor_pago: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'aberto' },
  { id: 3, participante: 6, participante_nome: 'Fernanda Lima', tipo: 'mensalidade', descricao: 'Mensalidade sócia – Maio 2026', voo: null, num_parcela: 5, total_parcelas: 12, valor_original: 350, juros_aplicado: 0, valor_pago: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-30', data_pagamento: null, status: 'aberto' },
  // Mensalidade atrasada com juros
  { id: 13, participante: 8, participante_nome: 'Mariana Rocha', tipo: 'mensalidade', descricao: 'Mensalidade aluna – Março 2026', voo: null, num_parcela: 3, total_parcelas: 12, valor_original: 350, juros_aplicado: 17.5, valor_pago: 0, data_emissao: '2026-03-01', data_vencimento: '2026-03-30', data_pagamento: null, status: 'aberto' },
  // Voos – em aberto
  { id: 14, participante: 2, participante_nome: 'Ana Paula Santos', tipo: 'voo', descricao: 'Voo instrução duplo – 1,2h – PP-XYZ', voo: 1, num_parcela: 1, total_parcelas: 1, valor_original: 504, juros_aplicado: 0, valor_pago: 0, data_emissao: '2026-05-15', data_vencimento: '2026-06-15', data_pagamento: null, status: 'aberto' },
  { id: 15, participante: 3, participante_nome: 'Roberto Ferreira', tipo: 'voo', descricao: 'Voo sócio solo – 0,8h – PP-ABC', voo: 2, num_parcela: 1, total_parcelas: 1, valor_original: 280, juros_aplicado: 0, valor_pago: 0, data_emissao: '2026-05-14', data_vencimento: '2026-06-14', data_pagamento: null, status: 'aberto' },
  { id: 16, participante: 11, participante_nome: 'Thiago Barbosa', tipo: 'voo', descricao: 'Voo instrução duplo – 1,0h – PT-DEF', voo: 3, num_parcela: 1, total_parcelas: 1, valor_original: 390, juros_aplicado: 0, valor_pago: 0, data_emissao: '2026-05-13', data_vencimento: '2026-06-13', data_pagamento: null, status: 'aberto' },
  // Voo com baixa parcial (aberto + valor_pago > 0)
  { id: 28, participante: 10, participante_nome: 'Patrícia Nunes', tipo: 'voo', descricao: 'Voo instrução duplo – 1,0h – PP-ABC', voo: 15, num_parcela: 1, total_parcelas: 1, valor_original: 490, juros_aplicado: 0, valor_pago: 200, data_emissao: '2026-05-01', data_vencimento: '2026-06-01', data_pagamento: null, status: 'aberto' },
  // Voos – baixados
  { id: 29, participante: 12, participante_nome: 'Beatriz Cardoso', tipo: 'voo', descricao: 'Voo sócio duplo – 1,5h – PP-XYZ', voo: 16, num_parcela: 1, total_parcelas: 1, valor_original: 630, juros_aplicado: 0, valor_pago: 630, data_emissao: '2026-04-28', data_vencimento: '2026-05-28', data_pagamento: '2026-04-29', status: 'baixado' },
  // Horas pré-pagas (carteira)
  { id: 36, participante: 2, participante_nome: 'Ana Paula Santos', tipo: 'horas_pre_pagas', descricao: 'Recarga de carteira', voo: null, num_parcela: 1, total_parcelas: 1, valor_original: 1000, juros_aplicado: 0, valor_pago: 1000, data_emissao: '2026-05-16', data_vencimento: '2026-05-16', data_pagamento: '2026-05-16', status: 'baixado' },
  { id: 37, participante: 3, participante_nome: 'Roberto Ferreira', tipo: 'horas_pre_pagas', descricao: 'Recarga de carteira', voo: null, num_parcela: 1, total_parcelas: 1, valor_original: 1500, juros_aplicado: 0, valor_pago: 1500, data_emissao: '2026-05-15', data_vencimento: '2026-05-15', data_pagamento: '2026-05-15', status: 'baixado' },
  // Serviços
  { id: 43, participante: 5, participante_nome: 'Marcos Costa', tipo: 'servico', descricao: 'Renovação CMA – Exame médico', voo: null, num_parcela: 1, total_parcelas: 1, valor_original: 750, juros_aplicado: 0, valor_pago: 0, data_emissao: '2026-05-01', data_vencimento: '2026-05-20', data_pagamento: null, status: 'aberto' },
]
