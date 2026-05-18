import { type TipoAeronave } from './aeronaves'

export type TipoVoo = 'instrucao_solo' | 'instrucao_duplo' | 'socio_solo' | 'socio_duplo' | 'externo'

export const TIPO_VOO_LABELS: Record<TipoVoo, string> = {
  instrucao_solo: 'Instrução Solo',
  instrucao_duplo: 'Instrução Duplo',
  socio_solo: 'Sócio Solo',
  socio_duplo: 'Sócio Duplo',
  externo: 'Externo',
}

export const ALL_TIPOS_VOO: TipoVoo[] = [
  'instrucao_solo',
  'instrucao_duplo',
  'socio_solo',
  'socio_duplo',
  'externo',
]

export const TIPOS_VOO_COM_INSTRUTOR: TipoVoo[] = ['instrucao_duplo', 'socio_duplo', 'externo']

export interface Voo {
  id: string
  aeronave_id: string
  aeronave_nome: string
  tipo_aeronave: TipoAeronave
  participante_id: string
  participante_nome: string
  instrutor_id: string | null
  instrutor_nome: string | null
  tipo_voo: TipoVoo
  inicio: string
  fim: string
  tempo_decimal: number
  origem: string
  destino: string
  valor_hora: number   // para avião; 0 para planador
  valor_voo: number    // valor total pré-calculado
  taxa_instrutor: number | null
  data: string
  data_vencimento: string
  created_at: string
}

export const mockVoos: Voo[] = [
  // --- Maio 2026 ---
  {
    id: '1', aeronave_id: '1', aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao',
    participante_id: '2', participante_nome: 'Ana Paula Santos',
    instrutor_id: '104', instrutor_nome: 'Ricardo Almeida',
    tipo_voo: 'instrucao_duplo', inicio: '08:00', fim: '09:12',
    tempo_decimal: 1.2, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 420, valor_voo: 504, taxa_instrutor: 10,
    data: '2026-05-15', data_vencimento: '2026-06-15', created_at: '2026-05-15T09:30:00',
  },
  {
    id: '2', aeronave_id: '2', aeronave_nome: 'PP-ABC', tipo_aeronave: 'aviao',
    participante_id: '3', participante_nome: 'Roberto Ferreira',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'socio_solo', inicio: '10:00', fim: '10:48',
    tempo_decimal: 0.8, origem: 'SDAG', destino: 'SBSP',
    valor_hora: 350, valor_voo: 280, taxa_instrutor: null,
    data: '2026-05-14', data_vencimento: '2026-06-14', created_at: '2026-05-14T11:30:00',
  },
  {
    id: '3', aeronave_id: '3', aeronave_nome: 'PT-DEF', tipo_aeronave: 'aviao',
    participante_id: '11', participante_nome: 'Thiago Barbosa',
    instrutor_id: '106', instrutor_nome: 'Fernando Rocha',
    tipo_voo: 'instrucao_duplo', inicio: '14:00', fim: '15:00',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 390, valor_voo: 390, taxa_instrutor: 10,
    data: '2026-05-13', data_vencimento: '2026-06-13', created_at: '2026-05-13T15:30:00',
  },
  {
    id: '4', aeronave_id: '1', aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao',
    participante_id: '10', participante_nome: 'Patrícia Nunes',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'instrucao_solo', inicio: '09:00', fim: '09:42',
    tempo_decimal: 0.7, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 300, valor_voo: 210, taxa_instrutor: null,
    data: '2026-05-12', data_vencimento: '2026-06-12', created_at: '2026-05-12T10:00:00',
  },
  {
    id: '5', aeronave_id: '2', aeronave_nome: 'PP-ABC', tipo_aeronave: 'aviao',
    participante_id: '6', participante_nome: 'Fernanda Lima',
    instrutor_id: '105', instrutor_nome: 'Ana Paula Santos',
    tipo_voo: 'socio_duplo', inicio: '11:00', fim: '12:00',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAS',
    valor_hora: 490, valor_voo: 490, taxa_instrutor: 10,
    data: '2026-05-11', data_vencimento: '2026-06-11', created_at: '2026-05-11T13:00:00',
  },
  {
    id: '6', aeronave_id: '3', aeronave_nome: 'PT-DEF', tipo_aeronave: 'aviao',
    participante_id: '7', participante_nome: 'Paulo Mendes',
    instrutor_id: '104', instrutor_nome: 'Ricardo Almeida',
    tipo_voo: 'externo', inicio: '09:00', fim: '09:36',
    tempo_decimal: 0.6, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 390, valor_voo: 234, taxa_instrutor: 10,
    data: '2026-05-10', data_vencimento: '2026-06-10', created_at: '2026-05-10T10:30:00',
  },
  {
    id: '7', aeronave_id: '4', aeronave_nome: 'PT-JKL', tipo_aeronave: 'aviao',
    participante_id: '14', participante_nome: 'Camila Torres',
    instrutor_id: '106', instrutor_nome: 'Fernando Rocha',
    tipo_voo: 'instrucao_duplo', inicio: '07:30', fim: '08:30',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 450, valor_voo: 450, taxa_instrutor: 10,
    data: '2026-05-09', data_vencimento: '2026-06-09', created_at: '2026-05-09T09:00:00',
  },
  {
    id: '8', aeronave_id: '2', aeronave_nome: 'PP-ABC', tipo_aeronave: 'aviao',
    participante_id: '12', participante_nome: 'Beatriz Cardoso',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'socio_solo', inicio: '15:00', fim: '16:00',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 350, valor_voo: 350, taxa_instrutor: null,
    data: '2026-05-08', data_vencimento: '2026-06-08', created_at: '2026-05-08T16:30:00',
  },
  {
    id: '9', aeronave_id: '3', aeronave_nome: 'PT-DEF', tipo_aeronave: 'aviao',
    participante_id: '2', participante_nome: 'Ana Paula Santos',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'instrucao_solo', inicio: '08:30', fim: '09:30',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 280, valor_voo: 280, taxa_instrutor: null,
    data: '2026-05-07', data_vencimento: '2026-06-07', created_at: '2026-05-07T10:00:00',
  },
  {
    id: '10', aeronave_id: '1', aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao',
    participante_id: '11', participante_nome: 'Thiago Barbosa',
    instrutor_id: '104', instrutor_nome: 'Ricardo Almeida',
    tipo_voo: 'instrucao_duplo', inicio: '10:00', fim: '11:12',
    tempo_decimal: 1.2, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 420, valor_voo: 504, taxa_instrutor: 10,
    data: '2026-05-06', data_vencimento: '2026-06-06', created_at: '2026-05-06T11:30:00',
  },
  {
    id: '11', aeronave_id: '7', aeronave_nome: 'PT-PLN', tipo_aeronave: 'planador',
    participante_id: '3', participante_nome: 'Roberto Ferreira',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'socio_solo', inicio: '09:00', fim: '09:45',
    tempo_decimal: 0.75, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 0, valor_voo: 210, taxa_instrutor: null,
    data: '2026-05-05', data_vencimento: '2026-06-05', created_at: '2026-05-05T10:00:00',
  },
  {
    id: '12', aeronave_id: '8', aeronave_nome: 'PP-VOA', tipo_aeronave: 'planador',
    participante_id: '14', participante_nome: 'Camila Torres',
    instrutor_id: '105', instrutor_nome: 'Ana Paula Santos',
    tipo_voo: 'instrucao_duplo', inicio: '14:00', fim: '14:35',
    tempo_decimal: 0.58, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 0, valor_voo: 195, taxa_instrutor: 10,
    data: '2026-05-04', data_vencimento: '2026-06-04', created_at: '2026-05-04T15:00:00',
  },
  {
    id: '13', aeronave_id: '3', aeronave_nome: 'PT-DEF', tipo_aeronave: 'aviao',
    participante_id: '13', participante_nome: 'Rafael Gomes',
    instrutor_id: '105', instrutor_nome: 'Ana Paula Santos',
    tipo_voo: 'externo', inicio: '11:00', fim: '12:00',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 390, valor_voo: 390, taxa_instrutor: 10,
    data: '2026-05-03', data_vencimento: '2026-06-03', created_at: '2026-05-03T12:30:00',
  },
  {
    id: '14', aeronave_id: '4', aeronave_nome: 'PT-JKL', tipo_aeronave: 'aviao',
    participante_id: '6', participante_nome: 'Fernanda Lima',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'socio_solo', inicio: '08:00', fim: '08:54',
    tempo_decimal: 0.9, origem: 'SDAG', destino: 'SBSP',
    valor_hora: 320, valor_voo: 288, taxa_instrutor: null,
    data: '2026-05-02', data_vencimento: '2026-06-02', created_at: '2026-05-02T09:30:00',
  },
  {
    id: '15', aeronave_id: '2', aeronave_nome: 'PP-ABC', tipo_aeronave: 'aviao',
    participante_id: '10', participante_nome: 'Patrícia Nunes',
    instrutor_id: '104', instrutor_nome: 'Ricardo Almeida',
    tipo_voo: 'instrucao_duplo', inicio: '13:00', fim: '14:00',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 490, valor_voo: 490, taxa_instrutor: 10,
    data: '2026-05-01', data_vencimento: '2026-06-01', created_at: '2026-05-01T14:30:00',
  },
  // --- Abril 2026 ---
  {
    id: '16', aeronave_id: '1', aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao',
    participante_id: '12', participante_nome: 'Beatriz Cardoso',
    instrutor_id: '106', instrutor_nome: 'Fernando Rocha',
    tipo_voo: 'socio_duplo', inicio: '10:00', fim: '11:30',
    tempo_decimal: 1.5, origem: 'SDAG', destino: 'SDAS',
    valor_hora: 420, valor_voo: 630, taxa_instrutor: 10,
    data: '2026-04-28', data_vencimento: '2026-05-28', created_at: '2026-04-28T12:00:00',
  },
  {
    id: '17', aeronave_id: '3', aeronave_nome: 'PT-DEF', tipo_aeronave: 'aviao',
    participante_id: '14', participante_nome: 'Camila Torres',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'instrucao_solo', inicio: '07:00', fim: '08:12',
    tempo_decimal: 1.2, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 280, valor_voo: 336, taxa_instrutor: null,
    data: '2026-04-25', data_vencimento: '2026-05-25', created_at: '2026-04-25T08:30:00',
  },
  {
    id: '18', aeronave_id: '2', aeronave_nome: 'PP-ABC', tipo_aeronave: 'aviao',
    participante_id: '7', participante_nome: 'Paulo Mendes',
    instrutor_id: '105', instrutor_nome: 'Ana Paula Santos',
    tipo_voo: 'externo', inicio: '15:00', fim: '16:00',
    tempo_decimal: 1.0, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 490, valor_voo: 490, taxa_instrutor: 10,
    data: '2026-04-22', data_vencimento: '2026-05-22', created_at: '2026-04-22T16:30:00',
  },
  {
    id: '19', aeronave_id: '1', aeronave_nome: 'PP-XYZ', tipo_aeronave: 'aviao',
    participante_id: '2', participante_nome: 'Ana Paula Santos',
    instrutor_id: '104', instrutor_nome: 'Ricardo Almeida',
    tipo_voo: 'instrucao_duplo', inicio: '09:00', fim: '10:12',
    tempo_decimal: 1.2, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 420, valor_voo: 504, taxa_instrutor: 10,
    data: '2026-04-18', data_vencimento: '2026-05-18', created_at: '2026-04-18T10:30:00',
  },
  {
    id: '20', aeronave_id: '4', aeronave_nome: 'PT-JKL', tipo_aeronave: 'aviao',
    participante_id: '3', participante_nome: 'Roberto Ferreira',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'socio_solo', inicio: '11:00', fim: '11:54',
    tempo_decimal: 0.9, origem: 'SDAG', destino: 'SBSP',
    valor_hora: 320, valor_voo: 288, taxa_instrutor: null,
    data: '2026-04-15', data_vencimento: '2026-05-15', created_at: '2026-04-15T12:30:00',
  },
  {
    id: '21', aeronave_id: '9', aeronave_nome: 'PR-ASA', tipo_aeronave: 'planador',
    participante_id: '12', participante_nome: 'Beatriz Cardoso',
    instrutor_id: null, instrutor_nome: null,
    tipo_voo: 'socio_solo', inicio: '10:00', fim: '10:50',
    tempo_decimal: 0.83, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 0, valor_voo: 215, taxa_instrutor: null,
    data: '2026-04-10', data_vencimento: '2026-05-10', created_at: '2026-04-10T11:00:00',
  },
  {
    id: '22', aeronave_id: '7', aeronave_nome: 'PT-PLN', tipo_aeronave: 'planador',
    participante_id: '11', participante_nome: 'Thiago Barbosa',
    instrutor_id: '106', instrutor_nome: 'Fernando Rocha',
    tipo_voo: 'instrucao_duplo', inicio: '09:00', fim: '09:30',
    tempo_decimal: 0.5, origem: 'SDAG', destino: 'SDAG',
    valor_hora: 0, valor_voo: 150, taxa_instrutor: 10,
    data: '2026-04-08', data_vencimento: '2026-05-08', created_at: '2026-04-08T10:00:00',
  },
]
