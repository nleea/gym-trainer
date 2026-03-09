// vue/api.ts — Cliente HTTP centralizado para el backend FastAPI
import { getDeviceTimeZone } from '../lib/utils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const AUTH_USER_KEY = 'auth_user'
const AUTH_EVENT_KEY = 'auth_event'
const REFRESH_LOCK_KEY = 'auth_refresh_lock'
const REFRESH_LOCK_TTL_MS = 8_000
const REFRESH_WAIT_TIMEOUT_MS = 9_000

type AuthEventType = 'logout' | 'token-updated'
type AuthEvent = {
  type: AuthEventType
  at: number
}

const TAB_ID = (() => {
  if (typeof window === 'undefined') return 'server'
  const existing = sessionStorage.getItem('auth_tab_id')
  if (existing) return existing
  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  sessionStorage.setItem('auth_tab_id', created)
  return created
})()

const authChannel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('auth_sync')
    : null

function getDeviceMetadata(): { device_name: string; device_info: string } {
  if (typeof window === 'undefined') {
    return { device_name: 'server', device_info: 'server' }
  }
  const ua = navigator.userAgent || 'unknown'
  const platform = navigator.platform || 'unknown-platform'
  const language = navigator.language || 'unknown-lang'
  const width = window.innerWidth || 0
  const name = `${platform} ${width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile'}`
  return {
    device_name: name.slice(0, 120),
    device_info: `${platform}; ${language}; ${ua}`.slice(0, 500),
  }
}

// ── Token helpers ────────────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
  emitAuthEvent({ type: 'token-updated', at: Date.now() })
}

export function removeToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(REFRESH_LOCK_KEY)
  emitAuthEvent({ type: 'logout', at: Date.now() })
}

// ── HTTP client ───────────────────────────────────────────────────────────────
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

function buildHeaders(token: string | null, isJson = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Timezone': getDeviceTimeZone(),
  }
  if (isJson) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  if (!window.location.hash.includes('/auth/login')) {
    window.location.href = '/#/auth/login'
  }
}

function emitAuthEvent(event: AuthEvent): void {
  if (typeof window === 'undefined') return
  try {
    authChannel?.postMessage(event)
  } catch {
    // no-op
  }
  localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify(event))
}

export function subscribeAuthEvents(handler: (event: AuthEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== AUTH_EVENT_KEY || !ev.newValue) return
    try {
      handler(JSON.parse(ev.newValue) as AuthEvent)
    } catch {
      // ignore malformed payloads
    }
  }

  const onChannel = (ev: MessageEvent<AuthEvent>) => {
    if (ev?.data?.type) handler(ev.data)
  }

  window.addEventListener('storage', onStorage)
  authChannel?.addEventListener('message', onChannel)

  return () => {
    window.removeEventListener('storage', onStorage)
    authChannel?.removeEventListener('message', onChannel)
  }
}

type RefreshLockPayload = {
  owner: string
  expiresAt: number
}

function readRefreshLock(): RefreshLockPayload | null {
  const raw = localStorage.getItem(REFRESH_LOCK_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RefreshLockPayload
  } catch {
    return null
  }
}

function acquireRefreshLock(): boolean {
  const now = Date.now()
  const current = readRefreshLock()

  if (current && current.expiresAt > now && current.owner !== TAB_ID) {
    return false
  }

  const lock: RefreshLockPayload = { owner: TAB_ID, expiresAt: now + REFRESH_LOCK_TTL_MS }
  localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lock))
  return true
}

function releaseRefreshLock(): void {
  const current = readRefreshLock()
  if (current?.owner === TAB_ID) {
    localStorage.removeItem(REFRESH_LOCK_KEY)
  }
}

async function waitForTokenUpdate(previousToken: string | null): Promise<boolean> {
  if (typeof window === 'undefined') return false

  return new Promise((resolve) => {
    let done = false

    const finish = (ok: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      window.removeEventListener('storage', onStorage)
      stopChannel()
      resolve(ok)
    }

    const check = () => {
      const latest = getToken()
      finish(Boolean(latest && latest !== previousToken))
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === ACCESS_TOKEN_KEY || ev.key === AUTH_EVENT_KEY) check()
    }

    const stopChannel = subscribeAuthEvents((event) => {
      if (event.type === 'token-updated' || event.type === 'logout') check()
    })

    const timer = window.setTimeout(() => finish(false), REFRESH_WAIT_TIMEOUT_MS)
    window.addEventListener('storage', onStorage)
    check()
  })
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: buildHeaders(null, true),
      body: JSON.stringify({ refresh_token: refreshToken, ...getDeviceMetadata() }),
    })

    if (!res.ok) return false
    const data = await res.json().catch(() => null)
    if (!data?.access_token) return false

    setToken(data.access_token)
    if (data.refresh_token) setRefreshToken(data.refresh_token)
    emitAuthEvent({ type: 'token-updated', at: Date.now() })
    return true
  } catch {
    return false
  }
}

async function tryRefreshAcrossTabs(previousToken: string | null): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  if (acquireRefreshLock()) {
    try {
      return await refreshAccessToken()
    } finally {
      releaseRefreshLock()
    }
  }

  return waitForTokenUpdate(previousToken)
}

async function rawRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = getToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token, true),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail ?? `Error ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const initialToken = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(initialToken, true),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    const refreshed = await tryRefreshAcrossTabs(initialToken)
    if (refreshed) return rawRequest<T>(method, path, body)

    removeToken()
    redirectToLogin()
    throw new Error('No autorizado — sesión expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail ?? `Error ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

async function requestForm<T>(method: 'POST' | 'PUT' | 'PATCH', path: string, form: FormData): Promise<T> {
  const initialToken = getToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(initialToken, false),
    body: form,
  })

  if (res.status === 401) {
    const refreshed = await tryRefreshAcrossTabs(initialToken)
    if (refreshed) {
      const retry = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: buildHeaders(getToken(), false),
        body: form,
      })
      if (retry.status === 401) {
        removeToken()
        redirectToLogin()
        throw new Error('No autorizado — sesión expirada')
      }
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({}))
        throw new Error(err?.detail ?? `Error ${retry.status}`)
      }
      if (retry.status === 204) return undefined as T
      return retry.json() as Promise<T>
    }

    removeToken()
    redirectToLogin()
    throw new Error('No autorizado — sesión expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail ?? `Error ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string)                   => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)   => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown)   => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)   => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                   => request<T>('DELETE', path),
  postForm: <T>(path: string, form: FormData) => requestForm<T>('POST', path, form),
  putForm: <T>(path: string, form: FormData)  => requestForm<T>('PUT', path, form),
}
