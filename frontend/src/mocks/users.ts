// Perfis alinhados com backend: Usuario.PERFIL_CHOICES
export type UserProfile = 'admin' | 'aluno' | 'socio' | 'instrutor' | 'externo'

export const PROFILE_LABELS: Record<UserProfile, string> = {
  admin: 'Administrador',
  aluno: 'Aluno',
  socio: 'Sócio',
  instrutor: 'Instrutor',
  externo: 'Cliente Externo',
}

export const ALL_PROFILES: UserProfile[] = ['admin', 'aluno', 'socio', 'instrutor', 'externo']

export interface UsuarioPerfil {
  id: number
  perfil: UserProfile
  perfil_display: string
}

export interface User {
  id: number
  email: string
  nome: string
  cpf_cnpj: string | null
  is_active: boolean
  date_joined: string
  perfis: UsuarioPerfil[]
  perfil_ativo: UserProfile
  saldo_carteira: number
}

export const mockUsers: User[] = [
  {
    id: 1, email: 'carlos.silva@aeroclube.com', nome: 'Carlos Eduardo Silva',
    cpf_cnpj: '123.456.789-00', is_active: true, date_joined: '2024-01-15',
    perfis: [{ id: 1, perfil: 'admin', perfil_display: 'Administrador' }],
    perfil_ativo: 'admin', saldo_carteira: 0,
  },
  {
    id: 2, email: 'ana.santos@email.com', nome: 'Ana Paula Santos',
    cpf_cnpj: '987.654.321-11', is_active: true, date_joined: '2024-02-20',
    perfis: [{ id: 2, perfil: 'aluno', perfil_display: 'Aluno' }],
    perfil_ativo: 'aluno', saldo_carteira: 756,
  },
  {
    id: 3, email: 'roberto.ferreira@email.com', nome: 'Roberto Ferreira',
    cpf_cnpj: '456.789.123-22', is_active: true, date_joined: '2024-03-10',
    perfis: [{ id: 3, perfil: 'socio', perfil_display: 'Sócio' }, { id: 4, perfil: 'aluno', perfil_display: 'Aluno' }],
    perfil_ativo: 'socio', saldo_carteira: 1470,
  },
  {
    id: 4, email: 'julia.oliveira@email.com', nome: 'Júlia Oliveira',
    cpf_cnpj: '321.654.987-33', is_active: false, date_joined: '2024-01-28',
    perfis: [{ id: 5, perfil: 'aluno', perfil_display: 'Aluno' }],
    perfil_ativo: 'aluno', saldo_carteira: 0,
  },
  {
    id: 5, email: 'marcos.costa@aeroclube.com', nome: 'Marcos Costa',
    cpf_cnpj: '789.123.456-44', is_active: true, date_joined: '2024-04-05',
    perfis: [{ id: 6, perfil: 'instrutor', perfil_display: 'Instrutor' }],
    perfil_ativo: 'instrutor', saldo_carteira: 0,
  },
  {
    id: 6, email: 'fernanda.lima@email.com', nome: 'Fernanda Lima',
    cpf_cnpj: '654.321.789-55', is_active: true, date_joined: '2024-05-12',
    perfis: [{ id: 7, perfil: 'socio', perfil_display: 'Sócio' }],
    perfil_ativo: 'socio', saldo_carteira: 1610,
  },
  {
    id: 7, email: 'paulo.mendes@email.com', nome: 'Paulo Mendes',
    cpf_cnpj: '112.233.445-66', is_active: true, date_joined: '2024-06-18',
    perfis: [{ id: 8, perfil: 'externo', perfil_display: 'Cliente Externo' }],
    perfil_ativo: 'externo', saldo_carteira: 0,
  },
  {
    id: 8, email: 'mariana.rocha@email.com', nome: 'Mariana Rocha',
    cpf_cnpj: '998.877.665-77', is_active: false, date_joined: '2024-02-14',
    perfis: [{ id: 9, perfil: 'aluno', perfil_display: 'Aluno' }, { id: 10, perfil: 'socio', perfil_display: 'Sócio' }],
    perfil_ativo: 'aluno', saldo_carteira: 0,
  },
  {
    id: 9, email: 'lucas.araujo@aeroclube.com', nome: 'Lucas Araújo',
    cpf_cnpj: '445.566.778-88', is_active: true, date_joined: '2024-07-22',
    perfis: [{ id: 11, perfil: 'admin', perfil_display: 'Administrador' }],
    perfil_ativo: 'admin', saldo_carteira: 0,
  },
  {
    id: 10, email: 'patricia.nunes@email.com', nome: 'Patrícia Nunes',
    cpf_cnpj: '334.455.667-99', is_active: true, date_joined: '2024-08-30',
    perfis: [{ id: 12, perfil: 'aluno', perfil_display: 'Aluno' }],
    perfil_ativo: 'aluno', saldo_carteira: 0,
  },
  {
    id: 11, email: 'thiago.barbosa@email.com', nome: 'Thiago Barbosa',
    cpf_cnpj: '221.330.441-10', is_active: true, date_joined: '2024-09-14',
    perfis: [{ id: 13, perfil: 'aluno', perfil_display: 'Aluno' }],
    perfil_ativo: 'aluno', saldo_carteira: 320,
  },
  {
    id: 12, email: 'beatriz.cardoso@email.com', nome: 'Beatriz Cardoso',
    cpf_cnpj: '556.667.778-21', is_active: true, date_joined: '2024-10-03',
    perfis: [{ id: 14, perfil: 'socio', perfil_display: 'Sócio' }],
    perfil_ativo: 'socio', saldo_carteira: 2100,
  },
  {
    id: 13, email: 'rafael.gomes@email.com', nome: 'Rafael Gomes',
    cpf_cnpj: '883.994.005-32', is_active: true, date_joined: '2024-11-20',
    perfis: [{ id: 15, perfil: 'externo', perfil_display: 'Cliente Externo' }],
    perfil_ativo: 'externo', saldo_carteira: 0,
  },
  {
    id: 14, email: 'camila.torres@email.com', nome: 'Camila Torres',
    cpf_cnpj: '119.220.331-43', is_active: true, date_joined: '2024-12-08',
    perfis: [{ id: 16, perfil: 'aluno', perfil_display: 'Aluno' }, { id: 17, perfil: 'socio', perfil_display: 'Sócio' }],
    perfil_ativo: 'aluno', saldo_carteira: 850,
  },
]
