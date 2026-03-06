// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setToken, removeToken, getToken } from '../api'

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
  nutriton_plan?: string
}

type RegisterPayload = {
  name: string
  role: Exclude<Role, null>
  phone?: string
}

type LoginResponse = {
  access_token: string
  token_type: string
  user: AuthUser
}

// Añade aliases de compatibilidad con las vistas que usaban Firebase User
function withAliases(u: AuthUser): AuthUser {
  return { ...u, uid: u.id, client_id: u.client_id ?? u.id }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const role = ref<Role>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isClient = computed(() => role.value === 'client')

  function resetState() {
    user.value = null
    role.value = null
    error.value = null
    removeToken()
  }

  // Restaurar sesión desde localStorage al iniciar la app
  async function initAuthListener(): Promise<void> {
    const token = getToken()
    if (!token) return

    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        const parsed: AuthUser = JSON.parse(stored)
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
      const data = await api.post<LoginResponse>('/auth/login', { email, password })
      const u = withAliases(data.user)
      setToken(data.access_token)
      user.value = u
      role.value = u.role
      localStorage.setItem('auth_user', JSON.stringify(u))

      return { ok: true as const, role: u.role}
    } catch (e: any) {
      console.error('login error:', e?.message)
      error.value = e?.message ?? 'Error al iniciar sesión'
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
      })

      const u = withAliases(data.user)
      setToken(data.access_token)
      user.value = u
      role.value = u.role
      localStorage.setItem('auth_user', JSON.stringify(u))

      return { ok: true as const, role: role.value }
    } catch (e: any) {
      console.error('register error:', e?.message)
      error.value = e?.message ?? 'Error al crear cuenta'
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

  function logout() {
    resetState()
  }

  function mapLoginError(e: any): string {
    const msg = (e?.message ?? '').toLowerCase()
    if (msg.includes('401') || msg.includes('invalid') || msg.includes('incorrect'))
      return 'Correo o contraseña incorrectos'
    if (msg.includes('not found')) return 'No existe una cuenta con ese correo'
    return 'Error al iniciar sesión'
  }

  function mapRegisterError(e: any): string {
    const msg = (e?.message ?? '').toLowerCase()
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
