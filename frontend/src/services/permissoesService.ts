import { apiGet, apiPatch } from './api/client'

export interface PermissaoUsuarioItem {
  funcionalidade: string
  nome: string
  permitido: boolean
}

export interface PermissoesUsuario {
  usuario: number
  perfil_ativo: string
  itens: PermissaoUsuarioItem[]
}

/** Telas administrativas liberadas para um admin secundário (checkbox). */
export async function getPermissoesUsuario(usuarioId: number): Promise<PermissoesUsuario> {
  return apiGet<PermissoesUsuario>(`/api/v1/permissoes-usuario/${usuarioId}/`)
}

export async function salvarPermissoesUsuario(
  usuarioId: number,
  itens: { funcionalidade: string; permitido: boolean }[],
): Promise<PermissoesUsuario> {
  return apiPatch<PermissoesUsuario>(`/api/v1/permissoes-usuario/${usuarioId}/`, itens)
}
