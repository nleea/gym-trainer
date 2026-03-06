// vue/repo/mealsRepo.ts
import { api } from '../api'
import type { MealLog, MealType } from '../types'
import { toDate } from './fireRepo'
import { getWeekRange } from '../../lib/utils'

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function mapLog(d: any): MealLog {
  return {
    ...d,
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

export async function upsertMealLog(id: string, log: any): Promise<string> {
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
  const list = await api.get<any[]>(
    `/meal-logs?client_id=${clientId}&start=${toISO(start)}&end=${toISO(end)}`
  )
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
): Promise<any[]> {
  const { start, end } = getWeekRange(anchorDate)
  try {
    return await api.get<any[]>(`/meal-logs?start=${toISO(start)}&end=${toISO(end)}`)
  } catch (err: any) {
    console.error('listMealLogsByTrainerWeek error:', err?.message)
    return []
  }
}
