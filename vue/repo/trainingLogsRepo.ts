// vue/repo/trainingLogsRepo.ts
import { api } from '../api'
import type { TrainingLog, ExerciseLog } from '../types'
import { toDate } from './fireRepo'
import { getWeekRange, toYmdLocal } from '../../lib/utils'

function toISO(d: Date): string {
  return toYmdLocal(d)
}

interface RawSet {
  reps?: number
  weight?: number
  rpe?: number | null
  completed?: boolean
}

interface RawExerciseLog {
  exerciseId?: string
  exercise_id?: string
  exerciseName?: string
  exercise_name?: string
  sets?: RawSet[]
  notes?: string
}

interface RawTrainingLog {
  id?: string
  client_id?: string
  clientId?: string
  trainer_id?: string
  trainerId?: string
  date?: unknown
  exercises?: RawExerciseLog[]
  duration?: number
  notes?: string
  effort?: number
  name?: string
}

interface RawExerciseInput {
  exerciseId?: string
  planExerciseId?: string
  exerciseName?: string
  name?: string
  sets?: RawSet[]
  notes?: string
}

interface UpsertLogInput {
  date: Date | string
  exercises?: RawExerciseInput[]
  duration?: number | null
  notes?: string | null
  effort?: number | null
}

interface UpsertResponse {
  id?: string
  log?: { id?: string }
  prs?: PRItem[]
}

interface LastPerformanceItem {
  exercise_id: string
  reps: number
  weight: number
  date: string
}

// Mapea un ejercicio del backend (camelCase, tipado) al tipo frontend
function mapExerciseLog(e: RawExerciseLog): ExerciseLog {
  return {
    exerciseId: e.exerciseId ?? e.exercise_id ?? '',
    exerciseName: e.exerciseName ?? e.exercise_name ?? '',
    sets: (e.sets ?? []).map((s: RawSet) => ({
      reps: Number(s.reps ?? 0),
      weight: Number(s.weight ?? 0),
      rpe: s.rpe != null ? Number(s.rpe) : undefined,
      completed: s.completed ?? true,
    })),
    notes: e.notes ?? undefined,
  }
}

// Mapea un training log del backend (snake_case) al tipo frontend (camelCase)
function mapLog(d: RawTrainingLog): TrainingLog {
  return {
    id: d.id,
    clientId: d.client_id ?? d.clientId ?? '',
    trainerId: d.trainer_id ?? d.trainerId ?? '',
    date: toDate(d.date) ?? new Date(),
    exercises: (d.exercises ?? []).map(mapExerciseLog),
    duration: d.duration ?? undefined,
    notes: d.notes ?? undefined,
    effort: d.effort ?? undefined,
    name: d.name ?? undefined,
  } as TrainingLog
}

// Serializa un ExerciseLog frontend al formato que espera el backend
function serializeExercise(ex: RawExerciseInput) {
  return {
    exerciseId: ex.exerciseId ?? ex.planExerciseId ?? '',
    exerciseName: String(ex.exerciseName ?? ex.name ?? '').trim(),
    sets: (ex.sets ?? []).map((s: RawSet) => ({
      reps: Number(s.reps ?? 0),
      weight: Number(s.weight ?? 0),
      rpe: s.rpe != null ? Number(s.rpe) : null,
      completed: s.completed ?? true,
    })),
    notes: ex.notes ?? null,
  }
}

// ──────────────────────────────────────────────────────────────────────────────

export async function listTrainingLogsByClient(clientId: string): Promise<TrainingLog[]> {
  const list = await api.get<RawTrainingLog[]>(`/training-logs?client_id=${clientId}`)
  return list.map(mapLog)
}

export async function listTrainingLogsByClientWeek(
  clientId: string,
  anchorDate = new Date()
): Promise<TrainingLog[]> {
  const { start } = getWeekRange(anchorDate)
  const list = await api.get<RawTrainingLog[]>(
    `/training-logs/${clientId}/week/${toISO(start)}`
  )
  return list.map(mapLog)
}

export async function listTrainingLogsByTrainerWeek(
  _trainerId: string,
  anchorDate = new Date()
): Promise<TrainingLog[]> {
  const { start } = getWeekRange(anchorDate)
  try {
    const list = await api.get<RawTrainingLog[]>(`/training-logs?week_start=${toISO(start)}`)
    return list.map(mapLog)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('listTrainingLogsByTrainerWeek error:', message)
    return []
  }
}

export async function listTrainingLogsLastDays(clientId: string, days = 45): Promise<TrainingLog[]> {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  const list = await api.get<RawTrainingLog[]>(
    `/training-logs?client_id=${clientId}&week_start=${toISO(start)}`
  )
  return list.map(mapLog)
}

export type PRItem = { exerciseName: string; newWeight: number; previousBest: number }

/**
 * Upsert por fecha: usa POST /training-logs.
 * El backend hace create-or-update según client+date.
 * Devuelve { id: UUID, prs: PRItem[] }.
 */
export async function upsertTrainingLog(
  _deterministicId: string,
  log: UpsertLogInput,
): Promise<{ id: string; prs: PRItem[] }> {
  const res = await api.post<UpsertResponse>('/training-logs', {
    date: toISO(log.date instanceof Date ? log.date : new Date(log.date)),
    exercises: (log.exercises ?? []).map(serializeExercise),
    duration: log.duration ?? null,
    notes: log.notes ?? null,
    effort: log.effort ?? null,
  })
  return {
    id: res.log?.id ?? res.id ?? _deterministicId,
    prs: res.prs ?? [],
  }
}

export async function getLastPerformance(
  clientId: string,
  exerciseIds: string[],
): Promise<Record<string, { reps: number; weight: number; date: string }>> {
  if (!exerciseIds.length) return {}
  const ids = exerciseIds.join(',')
  const list = await api.get<LastPerformanceItem[]>(
    `/training-logs/clients/${clientId}/last-performance?exercise_ids=${encodeURIComponent(ids)}`,
  )
  return Object.fromEntries(
    list.map((r) => [r.exercise_id, { reps: r.reps, weight: r.weight, date: r.date }]),
  )
}

/**
 * Actualiza un log existente por su UUID real.
 */
export async function updateTrainingLog(id: string, data: Partial<TrainingLog>): Promise<TrainingLog> {
  const res = await api.put<RawTrainingLog>(`/training-logs/${id}`, {
    exercises: data.exercises ? data.exercises.map(serializeExercise) : undefined,
    duration: data.duration,
    notes: data.notes,
    effort: data.effort,
  })
  return mapLog(res)
}

/**
 * Crea un log nuevo explícitamente.
 * @deprecated Preferir upsertTrainingLog que hace create-or-update.
 */
export async function createTrainingLog(data: TrainingLog): Promise<string> {
  const res = await api.post<{ id: string }>('/training-logs', {
    date: toISO(data.date instanceof Date ? data.date : new Date(data.date)),
    exercises: (data.exercises ?? []).map(serializeExercise),
    duration: data.duration ?? null,
    notes: data.notes ?? null,
    effort: data.effort ?? null,
  })
  return res.id
}
