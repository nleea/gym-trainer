import { api } from '../api'
import { format, startOfWeek } from 'date-fns'

export interface WeeklyCheckin {
  id: string
  clientId: string
  trainerId: string
  weekStart: string
  sleepHours: number | null
  sleepQuality: number | null
  stressLevel: number | null
  energyLevel: number | null
  muscleSoreness: number | null
  mood: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface WeeklyCheckinPayload {
  week_start: string
  sleep_hours?: number | null
  sleep_quality?: number | null
  stress_level?: number | null
  energy_level?: number | null
  muscle_soreness?: number | null
  mood?: string | null
  notes?: string | null
}

interface RawCheckin {
  id: string
  client_id: string
  trainer_id: string
  week_start: string
  sleep_hours?: number | null
  sleep_quality?: number | null
  stress_level?: number | null
  energy_level?: number | null
  muscle_soreness?: number | null
  mood?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

function mapCheckin(d: RawCheckin): WeeklyCheckin {
  return {
    id: d.id,
    clientId: d.client_id,
    trainerId: d.trainer_id,
    weekStart: d.week_start,
    sleepHours: d.sleep_hours ?? null,
    sleepQuality: d.sleep_quality ?? null,
    stressLevel: d.stress_level ?? null,
    energyLevel: d.energy_level ?? null,
    muscleSoreness: d.muscle_soreness ?? null,
    mood: d.mood ?? null,
    notes: d.notes ?? null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

export async function createOrUpdateCheckin(data: WeeklyCheckinPayload): Promise<WeeklyCheckin> {
  const res = await api.post<RawCheckin>('/checkins', data)
  return mapCheckin(res)
}

export async function listCheckins(clientId: string): Promise<WeeklyCheckin[]> {
  const list = await api.get<RawCheckin[]>(`/checkins?client_id=${clientId}`)
  return list.map(mapCheckin)
}

export async function getCurrentCheckin(clientId?: string): Promise<WeeklyCheckin | null> {
  const url = clientId ? `/checkins/current?client_id=${clientId}` : '/checkins/current'
  try {
    const res = await api.get<RawCheckin | null>(url)
    return res ? mapCheckin(res) : null
  } catch {
    return null
  }
}

export async function updateCheckin(
  checkinId: string,
  data: Partial<WeeklyCheckinPayload>,
): Promise<WeeklyCheckin> {
  const res = await api.put<RawCheckin>(`/checkins/${checkinId}`, data)
  return mapCheckin(res)
}

export function getWeekStartISO(date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return format(monday, 'yyyy-MM-dd')
}
