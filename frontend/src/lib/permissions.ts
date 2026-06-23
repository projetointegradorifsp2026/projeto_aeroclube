import type { UserProfile } from '@/mocks/users'
import { getCurrentUser } from '@/services/api/auth'

/**
 * Fallback estático: usado apenas quando o backend ainda não informou a lista
 * dinâmica `funcionalidades_permitidas` (ex.: sessão antiga em cache). A fonte
 * de verdade é a parametrização por perfil/usuário vinda do endpoint /me.
 * Aluno/Sócio/Aluno Externo acessam /titulos-a-receber; Instrutor/Funcionário /titulos-a-pagar.
 */
export const ROUTE_PERMISSIONS: Record<string, UserProfile[]> = {
  '/dashboard': ['admin', 'aluno', 'socio', 'externo', 'instrutor', 'funcionario'],
  '/usuarios': ['admin'],
  '/movimentacoes': ['admin', 'aluno', 'socio', 'externo', 'instrutor', 'funcionario'],
  '/voos': ['admin', 'aluno', 'socio', 'externo', 'instrutor'],
  '/titulos-a-receber': ['admin', 'aluno', 'socio', 'externo'],
  '/titulos-a-pagar': ['admin', 'instrutor', 'funcionario'],
  '/receitas': ['admin'],
  '/custos': ['admin'],
  '/config-bancaria': ['admin'],
  '/remessas-cnab': ['admin'],
  '/aeronaves': ['admin'],
  '/clientes': ['admin'],
  '/fornecedores': ['admin'],
  '/conta-fixa': ['admin'],
  '/relatorios': ['admin'],
  '/permissoes': ['admin'],
}

/** Converte uma rota em chave de funcionalidade: '/usuarios/:id' → 'usuarios'. */
export function routeToChave(route: string): string {
  return route.replace(/^\//, '').replace('/:id', '')
}

/**
 * Decide o acesso usando a lista dinâmica `funcionalidades_permitidas` do usuário
 * logado (parametrizada pelo admin). Cai no `ROUTE_PERMISSIONS` estático apenas
 * quando essa lista não está disponível.
 */
export function canAccess(profile: string | undefined, route: string): boolean {
  if (!profile) return false

  const permitidas = getCurrentUser()?.funcionalidades_permitidas
  if (permitidas && permitidas.length > 0) {
    return permitidas.includes(routeToChave(route))
  }

  const allowed = ROUTE_PERMISSIONS[route]
  if (!allowed) return true
  return allowed.includes(profile as UserProfile)
}
