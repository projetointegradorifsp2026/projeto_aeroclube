export type TipoAeronave = 'aviao' | 'planador'

export interface Aeronave {
  id: number
  nome: string
  tipo: TipoAeronave
  foto: string | null
  is_active: boolean
  // Avião (backend: Aviao) — null para planador
  tarifa_solo: number | null
  tarifa_duplo_comando: number | null
  // Planador (backend: Planador) — null para avião
  minutos_franquia: number | null
  valor_fixo_inicial: number | null
  valor_minuto_adicional: number | null
}

export const mockAeronaves: Aeronave[] = [
  // Aviões
  { id: 1, nome: 'PP-XYZ', tipo: 'aviao', tarifa_solo: 300, tarifa_duplo_comando: 420, minutos_franquia: null, valor_fixo_inicial: null, valor_minuto_adicional: null, foto: null, is_active: true },
  { id: 2, nome: 'PP-ABC', tipo: 'aviao', tarifa_solo: 350, tarifa_duplo_comando: 490, minutos_franquia: null, valor_fixo_inicial: null, valor_minuto_adicional: null, foto: null, is_active: true },
  { id: 3, nome: 'PT-DEF', tipo: 'aviao', tarifa_solo: 280, tarifa_duplo_comando: 390, minutos_franquia: null, valor_fixo_inicial: null, valor_minuto_adicional: null, foto: null, is_active: true },
  { id: 4, nome: 'PT-JKL', tipo: 'aviao', tarifa_solo: 320, tarifa_duplo_comando: 450, minutos_franquia: null, valor_fixo_inicial: null, valor_minuto_adicional: null, foto: null, is_active: true },
  { id: 5, nome: 'PP-GHI', tipo: 'aviao', tarifa_solo: 400, tarifa_duplo_comando: 560, minutos_franquia: null, valor_fixo_inicial: null, valor_minuto_adicional: null, foto: null, is_active: false },
  { id: 6, nome: 'PP-SKY', tipo: 'aviao', tarifa_solo: 380, tarifa_duplo_comando: 530, minutos_franquia: null, valor_fixo_inicial: null, valor_minuto_adicional: null, foto: null, is_active: false },
  // Planadores
  { id: 7, nome: 'PT-PLN', tipo: 'planador', tarifa_solo: null, tarifa_duplo_comando: null, minutos_franquia: 30, valor_fixo_inicial: 150, valor_minuto_adicional: 4, foto: null, is_active: true },
  { id: 8, nome: 'PP-VOA', tipo: 'planador', tarifa_solo: null, tarifa_duplo_comando: null, minutos_franquia: 20, valor_fixo_inicial: 120, valor_minuto_adicional: 5, foto: null, is_active: true },
  { id: 9, nome: 'PR-ASA', tipo: 'planador', tarifa_solo: null, tarifa_duplo_comando: null, minutos_franquia: 40, valor_fixo_inicial: 180, valor_minuto_adicional: 3.5, foto: null, is_active: true },
]
