// vue/repo/mealsRepo.ts
import { api } from '../api'
import type { MealLog, MealType } from '../types'
import { toDate } from './fireRepo'
import { getWeekRange, toYmdLocal } from '../../lib/utils'

function toISO(d: Date): string {
  return toYmdLocal(d)
}

interface RawMealLog extends Record<string, unknown> {
  clientId?: string
  client_id?: string
  trainerId?: string
  trainer_id?: string
  mealKey?: string
  meal_key?: string
  date?: unknown
}

function mapLog(d: RawMealLog): MealLog {
  return {
    ...d,
    clientId: d.clientId ?? d.client_id,
    trainerId: d.trainerId ?? d.trainer_id,
    mealKey: d.mealKey ?? d.meal_key,
    date: toDate(d.date) ?? new Date(),
  } as MealLog
}

export async function createMealLog(
  input: Omit<MealLog, 'id' | 'createdAt' | 'date'> & { date?: Date }
): Promise<string> {
  const res = await api.post<{ id: string }>('/meal-logs', {
    client_id: input.clientId,
    trainer_id: input.trainerId,
    date: toISO(input.date ?? new Date()),
    type: input.type,
    description: input.description,
    calories: input.calories,
    protein: input.protein,
  })
  return res.id
}

export async function upsertMealLog(id: string, log: MealLog): Promise<string> {
  try {
    await api.put(`/meal-logs/${id}`, {
      ...log,
      date: toISO(log.date instanceof Date ? log.date : new Date(log.date)),
    })
  } catch {
    // Si no existe, crearlo
    await createMealLog(log)
  }
  return id
}

export async function listMealLogsByClientRange(
  clientId: string,
  start: Date,
  end: Date
): Promise<MealLog[]> {
  const list = await api.get<RawMealLog[]>(
    `/meal-logs?client_id=${clientId}&start=${toISO(start)}&end=${toISO(end)}`
  )
  return list.map(mapLog)
}

export async function listMealLogsByClient(clientId: string): Promise<MealLog[]> {
  const list = await api.get<RawMealLog[]>(`/meal-logs?client_id=${clientId}`)
  return list.map(mapLog)
}

export async function listMealLogsToday(clientId: string): Promise<MealLog[]> {
  const today = new Date()
  return listMealLogsByClientRange(clientId, today, today)
}

export async function listMealLogsByClientWeek(clientId: string): Promise<MealLog[]> {
  const { start, end } = getWeekRange(new Date())
  return listMealLogsByClientRange(clientId, start, end)
}

export async function updateMealLog(
  logId: string,
  updates: Partial<Omit<MealLog, 'id' | 'clientId'>>
): Promise<void> {
  await api.put(`/meal-logs/${logId}`, updates)
}

export async function deleteMealLog(logId: string): Promise<void> {
  await api.delete(`/meal-logs/${logId}`)
}

export async function findMealLogTodayByType(
  clientId: string,
  type: MealType
): Promise<MealLog | null> {
  const today = new Date()
  const logs = await listMealLogsByClientRange(clientId, today, today)
  return logs.find((l) => l.type === type) ?? null
}

export async function listMealLogsByTrainerWeek(
  _trainerId: string,
  anchorDate = new Date()
): Promise<MealLog[]> {
  const { start, end } = getWeekRange(anchorDate)
  try {
    const list = await api.get<RawMealLog[]>(`/meal-logs?start=${toISO(start)}&end=${toISO(end)}`)
    return list.map(mapLog)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('listMealLogsByTrainerWeek error:', message)
    return []
  }
}
