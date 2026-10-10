import type { TokenResponse } from '../types/auth'

const BASE = '/api/v1'

let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      return String(data.detail[0].msg).replace(/^Value error, /, '')
    }
  } catch {
    // body was not JSON
  }
  return 'Something went wrong. Please try again.'
}

// Only one refresh at a time, even if several requests get a 401 together.
let refreshing: Promise<boolean> | null = null

export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
        if (!res.ok) return false
        const data: TokenResponse = await res.json()
        accessToken = data.access_token
        return true
      } catch {
        return false
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.')
  }

  if (res.status === 401 && retry && accessToken) {
    if (await refreshSession()) return api<T>(path, options, false)
    accessToken = null
    onSessionExpired?.()
  }

  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
