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
  valor_hora: number
  data: string
  created_at: string
}

export const mockVoos: Voo[] = [
  {
    id: '1',
    aeronave_id: '1',
    aeronave_nome: 'PP-XYZ',
    participante_id: '2',
    participante_nome: 'Ana Paula Santos',
    instrutor_id: '7',
    instrutor_nome: 'Ricardo Almeida',
    tipo_voo: 'instrucao_duplo',
    inicio: '08:00',
    fim: '09:12',
    tempo_decimal: 1.2,
    origem: 'SDAG',
    destino: 'SDAG',
    valor_hora: 420,
    data: '2026-05-10',
    created_at: '2026-05-10T10:00:00',
  },
  {
    id: '2',
    aeronave_id: '2',
    aeronave_nome: 'PP-ABC',
    participante_id: '3',
    participante_nome: 'Roberto Ferreira',
    instrutor_id: null,
    instrutor_nome: null,
    tipo_voo: 'socio_solo',
    inicio: '10:00',
    fim: '10:48',
    tempo_decimal: 0.8,
    origem: 'SDAG',
    destino: 'SBSP',
    valor_hora: 350,
    data: '2026-05-08',
    created_at: '2026-05-08T12:00:00',
  },
  {
    id: '3',
    aeronave_id: '1',
    aeronave_nome: 'PP-XYZ',
    participante_id: '10',
    participante_nome: 'Patrícia Nunes',
    instrutor_id: null,
    instrutor_nome: null,
    tipo_voo: 'instrucao_solo',
    inicio: '14:00',
    fim: '15:00',
    tempo_decimal: 1.0,
    origem: 'SDAG',
    destino: 'SDAG',
    valor_hora: 300,
    data: '2026-05-07',
    created_at: '2026-05-07T16:00:00',
  },
  {
    id: '4',
    aeronave_id: '2',
    aeronave_nome: 'PP-ABC',
    participante_id: '7',
    participante_nome: 'Paulo Mendes',
    instrutor_id: '8',
    instrutor_nome: 'Ricardo Almeida',
    tipo_voo: 'externo',
    inicio: '09:00',
    fim: '09:36',
    tempo_decimal: 0.6,
    origem: 'SDAG',
    destino: 'SDAG',
    valor_hora: 490,
    data: '2026-05-05',
    created_at: '2026-05-05T11:00:00',
  },
  {
    id: '5',
    aeronave_id: '3',
    aeronave_nome: 'PT-DEF',
    participante_id: '6',
    participante_nome: 'Fernanda Lima',
    instrutor_id: '7',
    instrutor_nome: 'Ana Paula Santos',
    tipo_voo: 'socio_duplo',
    inicio: '11:00',
    fim: '12:00',
    tempo_decimal: 1.0,
    origem: 'SDAG',
    destino: 'SDAS',
    valor_hora: 390,
    data: '2026-05-03',
    created_at: '2026-05-03T14:00:00',
  },
]
