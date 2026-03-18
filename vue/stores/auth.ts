// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  api,
  setToken,
  setRefreshToken,
  removeToken,
  getToken,
  subscribeAuthEvents,
  revokeCurrentSession,
} from '../api'

type Role = 'client' | 'trainer' | null

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'trainer' | 'client'
  phone?: string
  // client-specific
  client_id?: string
  trainerId?: string
  // aliases para compatibilidad con vistas que usaban Firebase User
  uid?: string       // === id
  clientid?: string  // === clientId (lowercase, como en Firebase)
  plan?: string
  nutrition_plan?: string
}

type RegisterPayload = {
  name: string
  role: Exclude<Role, null>
  phone?: string
}

type LoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  user: AuthUser
}

  // Añade aliases de compatibilidad con las vistas que usaban Firebase User
function withAliases(u: AuthUser): AuthUser {
  return { ...u, uid: u.id, client_id: u.client_id ?? u.clientid }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const role = ref<Role>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isClient = computed(() => role.value === 'client')
  let syncInitialized = false

  function applyStateFromStorage() {
    const token = getToken()
    const stored = localStorage.getItem('auth_user')
    if (!token || !stored) {
      user.value = null
      role.value = null
      return
    }
    try {
      const parsed = withAliases(JSON.parse(stored) as AuthUser)
      user.value = parsed
      role.value = parsed.role
    } catch {
      user.value = null
      role.value = null
    }
  }

  function setupSessionSync() {
    if (syncInitialized || typeof window === 'undefined') return
    syncInitialized = true

    window.addEventListener('storage', (ev) => {
      if (ev.key === 'access_token' || ev.key === 'auth_user' || ev.key === 'refresh_token') {
        applyStateFromStorage()
      }
    })

    subscribeAuthEvents((event) => {
      if (event.type === 'logout' || event.type === 'token-updated') {
        applyStateFromStorage()
      }
    })
  }

  function resetState() {
    user.value = null
    role.value = null
    error.value = null
    removeToken()
  }

  function getDeviceMetadata() {
    if (typeof window === 'undefined') return { device_name: 'server', device_info: 'server' }
    const ua = navigator.userAgent || 'unknown'
    const platform = navigator.platform || 'unknown-platform'
    const width = window.innerWidth || 0
    const kind = width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile'
    return {
      device_name: `${platform} ${kind}`.slice(0, 120),
      device_info: `${platform}; ${navigator.language || 'unknown-lang'}; ${ua}`.slice(0, 500),
    }
  }

  // Restaurar sesión desde localStorage al iniciar la app
  async function initAuthListener(): Promise<void> {
    setupSessionSync()
    const token = getToken()
    if (!token) return

    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        const parsed = withAliases(JSON.parse(stored) as AuthUser)
        user.value = parsed
        role.value = parsed.role
        return
      } catch {
        resetState()
      }
    }

    // Validar token con el backend
    try {
      const me = withAliases(await api.get<AuthUser>('/auth/me'))
      user.value = me
      role.value = me.role
      localStorage.setItem('auth_user', JSON.stringify(me))
    } catch {
      resetState()
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password, ...getDeviceMetadata() })
      const u = withAliases(data.user)
      setToken(data.access_token)
      setRefreshToken(data.refresh_token)
      user.value = u
      role.value = u.role
      localStorage.setItem('auth_user', JSON.stringify(u))

      return { ok: true as const, role: u.role}
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Error al iniciar sesión'
      console.error('login error:', errMsg)
      error.value = errMsg
      return { ok: false as const, message: mapLoginError(e) }
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, payload: RegisterPayload) {
    loading.value = true
    error.value = null
    try {
      const data = await api.post<LoginResponse>('/auth/register', {
        email,
        password,
        name: payload.name,
        role: payload.role,
        phone: payload.phone ?? '',
        ...getDeviceMetadata(),
      })

      const u = withAliases(data.user)
      setToken(data.access_token)
      setRefreshToken(data.refresh_token)
      user.value = u
      role.value = u.role
      localStorage.setItem('auth_user', JSON.stringify(u))

      return { ok: true as const, role: role.value }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Error al crear cuenta'
      console.error('register error:', errMsg)
      error.value = errMsg
      return { ok: false as const, message: mapRegisterError(e) }
    } finally {
      loading.value = false
    }
  }

  // Crear cliente (solo trainer) — reemplaza Cloud Function createClientUser
  async function createClientUser(payload: {
    email: string
    password: string
    name: string
    phone?: string
  }) {
    return api.post('/auth/create-client', payload)
  }

  async function logout() {
    resetState()
    await revokeCurrentSession()
  }

  function mapLoginError(e: unknown): string {
    const msg = (e instanceof Error ? e.message : '').toLowerCase()
    if (msg.includes('401') || msg.includes('invalid') || msg.includes('incorrect'))
      return 'Correo o contraseña incorrectos'
    if (msg.includes('not found')) return 'No existe una cuenta con ese correo'
    return 'Error al iniciar sesión'
  }

  function mapRegisterError(e: unknown): string {
    const msg = (e instanceof Error ? e.message : '').toLowerCase()
    if (msg.includes('already') || msg.includes('existe') || msg.includes('duplicate'))
      return 'Ese correo ya está registrado'
    if (msg.includes('password')) return 'Contraseña muy débil (mínimo 6 caracteres)'
    return 'Error al crear la cuenta'
  }

  return {
    user,
    role,
    loading,
    error,
    isAuthenticated,
    isClient,
    initAuthListener,
    login,
    register,
    createClientUser,
    logout,
    
  }
})
