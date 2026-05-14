export interface Aeronave {
  id: string
  nome: string
  valor_solo: number
  valor_duplo: number
  foto: string
  is_active: boolean
}

export const mockAeronaves: Aeronave[] = [
  {
    id: '1',
    nome: 'PP-XYZ',
    valor_solo: 300,
    valor_duplo: 420,
    foto: '',
    is_active: true,
  },
  {
    id: '2',
    nome: 'PP-ABC',
    valor_solo: 350,
    valor_duplo: 490,
    foto: '',
    is_active: true,
  },
  {
    id: '3',
    nome: 'PT-DEF',
    valor_solo: 280,
    valor_duplo: 390,
    foto: '',
    is_active: true,
  },
  {
    id: '4',
    nome: 'PP-GHI',
    valor_solo: 400,
    valor_duplo: 560,
    foto: '',
    is_active: false,
  },
]
