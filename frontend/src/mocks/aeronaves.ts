export type TipoAeronave = 'aviao' | 'planador'

export interface Aeronave {
  id: string
  nome: string
  tipo: TipoAeronave
  foto: string
  is_active: boolean
  // Avião: tarifas horárias
  valor_solo: number
  valor_duplo: number
  // Planador: modelo híbrido
  valor_fixo_inicial: number
  tempo_limite: number      // minutos incluídos no valor fixo
  valor_por_minuto: number  // R$ por minuto adicional
}

export const mockAeronaves: Aeronave[] = [
  { id: '1', nome: 'PP-XYZ', tipo: 'aviao', valor_solo: 300, valor_duplo: 420, valor_fixo_inicial: 0, tempo_limite: 0, valor_por_minuto: 0, foto: '', is_active: true },
  { id: '2', nome: 'PP-ABC', tipo: 'aviao', valor_solo: 350, valor_duplo: 490, valor_fixo_inicial: 0, tempo_limite: 0, valor_por_minuto: 0, foto: '', is_active: true },
  { id: '3', nome: 'PT-DEF', tipo: 'aviao', valor_solo: 280, valor_duplo: 390, valor_fixo_inicial: 0, tempo_limite: 0, valor_por_minuto: 0, foto: '', is_active: true },
  { id: '4', nome: 'PP-GHI', tipo: 'aviao', valor_solo: 400, valor_duplo: 560, valor_fixo_inicial: 0, tempo_limite: 0, valor_por_minuto: 0, foto: '', is_active: false },
  { id: '5', nome: 'PT-PLN', tipo: 'planador', valor_solo: 0, valor_duplo: 0, valor_fixo_inicial: 150, tempo_limite: 30, valor_por_minuto: 4, foto: '', is_active: true },
  { id: '6', nome: 'PP-VOA', tipo: 'planador', valor_solo: 0, valor_duplo: 0, valor_fixo_inicial: 120, tempo_limite: 20, valor_por_minuto: 5, foto: '', is_active: true },
]
