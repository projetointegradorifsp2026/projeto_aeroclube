import type { UserProfile } from '@/mocks/users'

/**
 * Define quais perfis têm acesso a cada rota.
 * Aluno/Sócio/Aluno Externo acessam /titulos-a-receber (que aparece para eles como "Títulos a pagar").
 * Instrutor e Funcionário acessam /titulos-a-pagar (pagamentos que recebem do aeroclube).
 */
export const ROUTE_PERMISSIONS: Record<string, UserProfile[]> = {
  '/dashboard': ['admin', 'aluno', 'socio', 'externo', 'instrutor', 'funcionario'],
  '/usuarios': ['admin'],
  '/movimentacoes': ['admin', 'aluno', 'socio', 'externo', 'instrutor', 'funcionario'],
  '/voos': ['admin', 'aluno', 'socio', 'externo', 'instrutor'],
  '/titulos-a-receber': ['admin', 'aluno', 'socio', 'externo'],
  '/titulos-a-pagar': ['admin', 'instrutor', 'funcionario'],
  '/aeronaves': ['admin'],
  '/clientes': ['admin'],
  '/fornecedores': ['admin'],
  '/conta-fixa': ['admin'],
}

export function canAccess(profile: string | undefined, route: string): boolean {
  if (!profile) return false
  const allowed = ROUTE_PERMISSIONS[route]
  if (!allowed) return true
  return allowed.includes(profile as UserProfile)
}
