const BASE = import.meta.env.VITE_API_URL ?? ''

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
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token')
}
