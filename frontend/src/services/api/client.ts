// Em prod VITE_API_URL é '' (vazio) → URLs relativas roteadas pelo nginx.
// Em dev VITE_API_URL é 'http://localhost:8000' (definido no docker-compose.dev.yml).
const BASE = import.meta.env.VITE_API_URL ?? ''

function getAccessToken() {
  return localStorage.getItem('access_token')
}

async function tryRefresh(): Promise<string | null> {
  const rt = localStorage.getItem('refresh_token')
  if (!rt) return null
  try {
    const res = await fetch(`${BASE}/api/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: rt }),
    })
    if (!res.ok) {
      clearTokens()
      return null
    }
    const data = await res.json()
    localStorage.setItem('access_token', data.access)
    return data.access as string
  } catch {
    return null
  }
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

function buildHeaders(token: string | null, extra: HeadersInit = {}): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(extra as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${BASE}${path}`
  let res = await fetch(url, { ...init, headers: buildHeaders(getAccessToken(), init.headers) })

  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await fetch(url, { ...init, headers: buildHeaders(newToken, init.headers) })
    } else {
      window.location.href = '/'
      throw new Error('Sessão expirada')
    }
  }

  return res
}

type DRFPage<T> = { results: T[]; count: number }

export async function apiList<T>(path: string): Promise<T[]> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  const data: DRFPage<T> | T[] = await res.json()
  return Array.isArray(data) ? data : data.results
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error(typeof err === 'object' ? JSON.stringify(err) : String(err))
  }
  return res.json() as Promise<T>
}

/** POST multipart/form-data (uploads). Não define Content-Type — o browser
 *  adiciona o boundary automaticamente. Mantém o refresh de token em 401. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const url = `${BASE}${path}`
  const send = (token: string | null) =>
    fetch(url, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

  let res = await send(getAccessToken())
  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await send(newToken)
    } else {
      window.location.href = '/'
      throw new Error('Sessão expirada')
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error(typeof err === 'object' ? JSON.stringify(err) : String(err))
  }
  return res.json() as Promise<T>
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error(typeof err === 'object' ? JSON.stringify(err) : String(err))
  }
  return res.json() as Promise<T>
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `DELETE ${path} → ${res.status}` }))
    throw new Error(typeof err === 'object' ? JSON.stringify(err) : String(err))
  }
}
