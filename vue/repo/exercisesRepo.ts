import { api } from '../api'

export type ExerciseItem = {
  id: string
  externalId?: string | null
  name: string
  nameEs?: string | null
  bodyPart?: string | null
  target?: string | null
  equipment?: string | null
  gifUrl?: string | null
  secondaryMuscles: string[]
  instructions: string[]
  syncedAt?: string | null
  isFavorite: boolean
}

export type ExerciseListResult = {
  items: ExerciseItem[]
  total: number
  limit: number
  offset: number
}

type RawExercise = {
  id: string
  external_id?: string | null
  name: string
  name_es?: string | null
  body_part?: string | null
  target?: string | null
  equipment?: string | null
  gif_url?: string | null
  secondary_muscles?: string[] | null
  instructions?: string[] | null
  synced_at?: string | null
  is_favorite?: boolean
}

function mapExercise(raw: RawExercise): ExerciseItem {
  return {
    id: raw.id,
    externalId: raw.external_id ?? null,
    name: raw.name,
    nameEs: raw.name_es ?? null,
    bodyPart: raw.body_part ?? null,
    target: raw.target ?? null,
    equipment: raw.equipment ?? null,
    gifUrl: raw.gif_url ?? null,
    secondaryMuscles: raw.secondary_muscles ?? [],
    instructions: raw.instructions ?? [],
    syncedAt: raw.synced_at ?? null,
    isFavorite: Boolean(raw.is_favorite),
  }
}

function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    q.set(key, String(value))
  })
  const serialized = q.toString()
  return serialized ? `?${serialized}` : ''
}

export async function listExercises(params: {
  body_part?: string
  equipment?: string
  q?: string
  favorites_only?: boolean
  user_id?: string
  limit?: number
  offset?: number
} = {}): Promise<ExerciseListResult> {
  const raw = await api.get<{
    items: RawExercise[]
    total: number
    limit: number
    offset: number
  }>(`/exercises${toQuery(params)}`)

  return {
    items: raw.items.map(mapExercise),
    total: raw.total,
    limit: raw.limit,
    offset: raw.offset,
  }
}

export async function searchExercises(query: string, limit = 20): Promise<ExerciseItem[]> {
  if (!query.trim()) return []
  const list = await api.get<RawExercise[]>(
    `/exercises/search${toQuery({ q: query.trim(), limit })}`,
  )
  return list.map(mapExercise)
}

export async function getBodyParts(): Promise<string[]> {
  return api.get<string[]>('/exercises/body-parts')
}

export async function getEquipmentList(): Promise<string[]> {
  return api.get<string[]>('/exercises/equipment')
}

export async function syncExercises() {
  return api.post<{
    synced_count: number
    updated_count: number
    created_count: number
    synced_at: string
  }>('/exercises/sync')
}

export async function favoriteExercise(exerciseId: string) {
  return api.post(`/exercises/${exerciseId}/favorite`)
}

export async function unfavoriteExercise(exerciseId: string) {
  return api.delete(`/exercises/${exerciseId}/favorite`)
}

export async function getFavorites(userId?: string): Promise<ExerciseItem[]> {
  const list = await api.get<RawExercise[]>(
    `/exercises/favorites${toQuery({ user_id: userId })}`,
  )
  return list.map(mapExercise)
}
