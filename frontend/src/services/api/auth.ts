const BASE = import.meta.env.VITE_API_URL ?? ''

export interface AuthUser {
  id: number
  nome: string
  email: string
  perfil_ativo: string
  perfis: { id: number; perfil: string }[]
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error('E-mail ou senha incorretos')
  }
  const data = await res.json()
  localStorage.setItem('access_token', data.access as string)
  localStorage.setItem('refresh_token', data.refresh as string)

  // Fetch and store current user info
  try {
    const meRes = await fetch(`${BASE}/api/v1/usuarios/me/`, {
      headers: { Authorization: `Bearer ${data.access as string}` },
    })
    if (meRes.ok) {
      const user: AuthUser = await meRes.json()
      localStorage.setItem('current_user', JSON.stringify(user))
    }
  } catch { /* ignore — user info is cosmetic */ }
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('current_user')
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token')
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem('current_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}
