// Alinhado com backend: Voo
import { type TipoAeronave } from './aeronaves'

export type TipoVoo = 'instrucao_solo' | 'instrucao_duplo' | 'socio_solo' | 'socio_duplo' | 'externo'

export const TIPO_VOO_LABELS: Record<TipoVoo, string> = {
  instrucao_solo: 'Instrução Solo',
  instrucao_duplo: 'Instrução Duplo Comando',
  socio_solo: 'Sócio Solo',
  socio_duplo: 'Sócio Duplo Comando',
  externo: 'Externo',
}

export const ALL_TIPOS_VOO: TipoVoo[] = [
  'instrucao_solo', 'instrucao_duplo', 'socio_solo', 'socio_duplo', 'externo',
]

export const TIPOS_VOO_COM_INSTRUTOR: TipoVoo[] = ['instrucao_duplo', 'socio_duplo', 'externo']

export interface Voo {
  id: number
  // Relações (backend retorna IDs + campos _nome para exibição)
  aeronave: number
  aeronave_nome: string
  tipo_aeronave: TipoAeronave
  participante: number
  participante_nome: string
  instrutor: number | null
  instrutor_nome: string | null
  tipo_voo: TipoVoo
  // Horários separados (TimeField + DateField no backend)
  hora_inicio: string        // HH:MM
  hora_fim: string           // HH:MM
  data_voo: string           // YYYY-MM-DD
  // Calculados pelo backend no save()
  duracao_minutos: number
  tempo_decimal: number
  // Origem/destino (informativo, não impacta cobrança)
  origem: string | null
  destino: string | null
  // Snapshot financeiro do momento do registro (RF11)
  valor_tarifa_snapshot: number
  valor_total: number
  detalhe_cobranca: Record<string, unknown> | null
  created_at: string
}

export const mockVoos: Voo[] = [
  // --- Maio 2026 ---
  { id: 1, aeronave: 1, aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao', participante: 2, participante_nome: 'Ana Paula Santos', instrutor: 104, instrutor_nome: 'Ricardo Almeida', tipo_voo: 'instrucao_duplo', hora_inicio: '08:00', hora_fim: '09:12', data_voo: '2026-05-15', duracao_minutos: 72, tempo_decimal: 1.2, origem: 'SDAG', destino: 'SDAG', valor_tarifa_snapshot: 420, valor_total: 504, detalhe_cobranca: { tipo_aeronave: 'aviao', tempo_decimal: '1.2', tarifa_hora: '420', valor_total: '504' }, created_at: '2026-05-15T09:30:00' },
  { id: 2, aeronave: 2, aeronave_nome: 'PP-ABC', tipo_aeronave: 'aviao', participante: 3, participante_nome: 'Roberto Ferreira', instrutor: null, instrutor_nome: null, tipo_voo: 'socio_solo', hora_inicio: '10:00', hora_fim: '10:48', data_voo: '2026-05-14', duracao_minutos: 48, tempo_decimal: 0.8, origem: 'SDAG', destino: 'SBSP', valor_tarifa_snapshot: 350, valor_total: 280, detalhe_cobranca: { tipo_aeronave: 'aviao', tempo_decimal: '0.8', tarifa_hora: '350', valor_total: '280' }, created_at: '2026-05-14T11:30:00' },
  { id: 3, aeronave: 3, aeronave_nome: 'PT-DEF', tipo_aeronave: 'aviao', participante: 11, participante_nome: 'Thiago Barbosa', instrutor: 106, instrutor_nome: 'Fernando Rocha', tipo_voo: 'instrucao_duplo', hora_inicio: '14:00', hora_fim: '15:00', data_voo: '2026-05-13', duracao_minutos: 60, tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG', valor_tarifa_snapshot: 390, valor_total: 390, detalhe_cobranca: { tipo_aeronave: 'aviao', tempo_decimal: '1.0', tarifa_hora: '390', valor_total: '390' }, created_at: '2026-05-13T15:30:00' },
  { id: 4, aeronave: 1, aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao', participante: 10, participante_nome: 'Patrícia Nunes', instrutor: null, instrutor_nome: null, tipo_voo: 'instrucao_solo', hora_inicio: '09:00', hora_fim: '09:42', data_voo: '2026-05-12', duracao_minutos: 42, tempo_decimal: 0.7, origem: 'SDAG', destino: 'SDAG', valor_tarifa_snapshot: 300, valor_total: 210, detalhe_cobranca: { tipo_aeronave: 'aviao', tempo_decimal: '0.7', tarifa_hora: '300', valor_total: '210' }, created_at: '2026-05-12T10:00:00' },
  { id: 5, aeronave: 2, aeronave_nome: 'PP-ABC', tipo_aeronave: 'aviao', participante: 6, participante_nome: 'Fernanda Lima', instrutor: 105, instrutor_nome: 'Ana Paula Santos', tipo_voo: 'socio_duplo', hora_inicio: '11:00', hora_fim: '12:00', data_voo: '2026-05-11', duracao_minutos: 60, tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAS', valor_tarifa_snapshot: 490, valor_total: 490, detalhe_cobranca: { tipo_aeronave: 'aviao', tempo_decimal: '1.0', tarifa_hora: '490', valor_total: '490' }, created_at: '2026-05-11T13:00:00' },
  { id: 6, aeronave: 3, aeronave_nome: 'PT-DEF', tipo_aeronave: 'aviao', participante: 7, participante_nome: 'Paulo Mendes', instrutor: 104, instrutor_nome: 'Ricardo Almeida', tipo_voo: 'externo', hora_inicio: '09:00', hora_fim: '09:36', data_voo: '2026-05-10', duracao_minutos: 36, tempo_decimal: 0.6, origem: 'SDAG', destino: 'SDAG', valor_tarifa_snapshot: 390, valor_total: 234, detalhe_cobranca: { tipo_aeronave: 'aviao', tempo_decimal: '0.6', tarifa_hora: '390', valor_total: '234' }, created_at: '2026-05-10T10:30:00' },
  { id: 11, aeronave: 7, aeronave_nome: 'PT-PLN', tipo_aeronave: 'planador', participante: 3, participante_nome: 'Roberto Ferreira', instrutor: null, instrutor_nome: null, tipo_voo: 'socio_solo', hora_inicio: '09:00', hora_fim: '09:45', data_voo: '2026-05-05', duracao_minutos: 45, tempo_decimal: 0.8, origem: 'SDAG', destino: 'SDAG', valor_tarifa_snapshot: 150, valor_total: 150, detalhe_cobranca: { tipo_aeronave: 'planador', duracao_minutos: 45, franquia_minutos: 30, excedente_minutos: 15, valor_fixo_inicial: '150', valor_minuto_adicional: '4', valor_total: '210' }, created_at: '2026-05-05T10:00:00' },
  // --- Abril 2026 ---
  { id: 16, aeronave: 1, aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao', participante: 12, participante_nome: 'Beatriz Cardoso', instrutor: 106, instrutor_nome: 'Fernando Rocha', tipo_voo: 'socio_duplo', hora_inicio: '10:00', hora_fim: '11:30', data_voo: '2026-04-28', duracao_minutos: 90, tempo_decimal: 1.5, origem: 'SDAG', destino: 'SDAS', valor_tarifa_snapshot: 420, valor_total: 630, detalhe_cobranca: { tipo_aeronave: 'aviao', tempo_decimal: '1.5', tarifa_hora: '420', valor_total: '630' }, created_at: '2026-04-28T12:00:00' },
  { id: 22, aeronave: 7, aeronave_nome: 'PT-PLN', tipo_aeronave: 'planador', participante: 11, participante_nome: 'Thiago Barbosa', instrutor: 106, instrutor_nome: 'Fernando Rocha', tipo_voo: 'instrucao_duplo', hora_inicio: '09:00', hora_fim: '09:30', data_voo: '2026-04-08', duracao_minutos: 30, tempo_decimal: 0.5, origem: 'SDAG', destino: 'SDAG', valor_tarifa_snapshot: 150, valor_total: 150, detalhe_cobranca: { tipo_aeronave: 'planador', duracao_minutos: 30, franquia_minutos: 30, excedente_minutos: 0, valor_fixo_inicial: '150', valor_minuto_adicional: '4', valor_total: '150' }, created_at: '2026-04-08T10:00:00' },
]
