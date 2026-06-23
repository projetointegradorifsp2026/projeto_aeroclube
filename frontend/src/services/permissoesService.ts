import { apiGet, apiPatch } from './api/client'

export interface Funcionalidade {
  id: number
  chave: string
  nome: string
  rota: string
  ordem: number
}

export interface PerfilInfo {
  chave: string
  nome: string
}

export interface PermissaoMatrizItem {
  perfil: string
  funcionalidade: string
  permitido: boolean
}

export interface MatrizPermissoes {
  perfis: PerfilInfo[]
  perfil_admin: string
  funcionalidades: Funcionalidade[]
  matriz: PermissaoMatrizItem[]
}

export interface PermissaoUsuarioItem {
  funcionalidade: string
  nome: string
  rota: string
  ordem: number
  herdado_perfil: boolean
  override: boolean | null
  efetivo: boolean
}

export interface PermissoesUsuario {
  usuario: number
  perfil_ativo: string
  itens: PermissaoUsuarioItem[]
}

/** Override por usuário: "herdar" remove o override, true libera, false bloqueia. */
export type OverrideValor = 'herdar' | boolean

// --- Matriz por perfil (admin) ---

export async function getMatriz(): Promise<MatrizPermissoes> {
  return apiGet<MatrizPermissoes>('/api/v1/permissoes/')
}

export async function salvarMatriz(itens: PermissaoMatrizItem[]): Promise<MatrizPermissoes> {
  return apiPatch<MatrizPermissoes>('/api/v1/permissoes/', itens)
}

// --- Exceções por usuário (admin) ---

export async function getPermissoesUsuario(usuarioId: number): Promise<PermissoesUsuario> {
  return apiGet<PermissoesUsuario>(`/api/v1/permissoes-usuario/${usuarioId}/`)
}

export async function salvarPermissoesUsuario(
  usuarioId: number,
  itens: { funcionalidade: string; override: OverrideValor }[],
): Promise<PermissoesUsuario> {
  return apiPatch<PermissoesUsuario>(`/api/v1/permissoes-usuario/${usuarioId}/`, itens)
}
