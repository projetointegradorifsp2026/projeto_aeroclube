export type UserProfile = 'administrador' | 'aluno' | 'socio' | 'cliente_externo' | 'colaborador'

export const PROFILE_LABELS: Record<UserProfile, string> = {
  administrador: 'Administrador',
  aluno: 'Aluno',
  socio: 'Sócio',
  cliente_externo: 'Cliente Externo',
  colaborador: 'Colaborador',
}

export const ALL_PROFILES: UserProfile[] = [
  'administrador',
  'aluno',
  'socio',
  'cliente_externo',
  'colaborador',
]

export interface User {
  id: string
  email: string
  nome: string
  cpf: string
  is_active: boolean
  created_at: string
  perfis: UserProfile[]
  perfil_ativo: UserProfile
}

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'carlos.silva@aeroclube.com',
    nome: 'Carlos Eduardo Silva',
    cpf: '123.456.789-00',
    is_active: true,
    created_at: '2024-01-15',
    perfis: ['administrador'],
    perfil_ativo: 'administrador',
  },
  {
    id: '2',
    email: 'ana.santos@email.com',
    nome: 'Ana Paula Santos',
    cpf: '987.654.321-11',
    is_active: true,
    created_at: '2024-02-20',
    perfis: ['aluno'],
    perfil_ativo: 'aluno',
  },
  {
    id: '3',
    email: 'roberto.ferreira@email.com',
    nome: 'Roberto Ferreira',
    cpf: '456.789.123-22',
    is_active: true,
    created_at: '2024-03-10',
    perfis: ['socio', 'aluno'],
    perfil_ativo: 'socio',
  },
  {
    id: '4',
    email: 'julia.oliveira@email.com',
    nome: 'Júlia Oliveira',
    cpf: '321.654.987-33',
    is_active: false,
    created_at: '2024-01-28',
    perfis: ['aluno'],
    perfil_ativo: 'aluno',
  },
  {
    id: '5',
    email: 'marcos.costa@email.com',
    nome: 'Marcos Costa',
    cpf: '789.123.456-44',
    is_active: true,
    created_at: '2024-04-05',
    perfis: ['colaborador'],
    perfil_ativo: 'colaborador',
  },
  {
    id: '6',
    email: 'fernanda.lima@email.com',
    nome: 'Fernanda Lima',
    cpf: '654.321.789-55',
    is_active: true,
    created_at: '2024-05-12',
    perfis: ['socio'],
    perfil_ativo: 'socio',
  },
  {
    id: '7',
    email: 'paulo.mendes@email.com',
    nome: 'Paulo Mendes',
    cpf: '112.233.445-66',
    is_active: true,
    created_at: '2024-06-18',
    perfis: ['cliente_externo'],
    perfil_ativo: 'cliente_externo',
  },
  {
    id: '8',
    email: 'mariana.rocha@email.com',
    nome: 'Mariana Rocha',
    cpf: '998.877.665-77',
    is_active: false,
    created_at: '2024-02-14',
    perfis: ['aluno', 'socio'],
    perfil_ativo: 'aluno',
  },
  {
    id: '9',
    email: 'lucas.araujo@email.com',
    nome: 'Lucas Araújo',
    cpf: '445.566.778-88',
    is_active: true,
    created_at: '2024-07-22',
    perfis: ['administrador', 'colaborador'],
    perfil_ativo: 'administrador',
  },
  {
    id: '10',
    email: 'patricia.nunes@email.com',
    nome: 'Patrícia Nunes',
    cpf: '334.455.667-99',
    is_active: true,
    created_at: '2024-08-30',
    perfis: ['aluno'],
    perfil_ativo: 'aluno',
  },
]
