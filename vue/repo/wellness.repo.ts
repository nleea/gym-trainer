import { api } from '../api'
import type { DailyWellness } from '../types/wellness'
import { toYmdLocal } from '../../lib/utils'

// ── Backend response shape ───────────────────────────────────────────────────
interface RawWellness {
  id: string
  client_id: string
  date: string
  energy: number
  sleep_quality: number
  muscle_fatigue: number
  notes: string | null
  created_at: string
}

// ── Payload (front → back) ───────────────────────────────────────────────────
interface WellnessPayload {
  date: string
  energy: number
  sleep_quality: number
  muscle_fatigue: number
  notes?: string | null
}

// ── Mapper ───────────────────────────────────────────────────────────────────
function mapWellness(d: RawWellness): DailyWellness {
  return {
    id: d.id,
    clientId: d.client_id,
    date: d.date,
    energy: d.energy,
    sleepQuality: d.sleep_quality,
    muscleFatigue: d.muscle_fatigue,
    notes: d.notes,
    createdAt: d.created_at,
  }
}

// ── Summary + Correlation types ───────────────────────────────────────────────
export interface WellnessSummary {
  overloadAlert: boolean
  avgFatigue7d: number
  avgEnergy7d: number
  readinessScore: number
  todayEntry: { energy: number; sleepQuality: number; muscleFatigue: number } | null
}

export interface WellnessCorrelationPoint {
  week: string       // "YYYY-MM-DD" (Monday)
  avgFatigue: number
  volume: number     // kg
}

interface RawWellnessSummary {
  overload_alert: boolean
  avg_fatigue_7d: number
  avg_energy_7d: number
  readiness_score: number
  today_entry: { energy: number; sleep_quality: number; muscle_fatigue: number } | null
}

interface RawCorrelationPoint {
  week: string
  avg_fatigue: number
  volume: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toYmdLocal(d)
}

// ── Repo ─────────────────────────────────────────────────────────────────────
export const wellnessRepo = {
  /** Registrar bienestar del día */
  async create(data: {
    energy: number
    sleepQuality: number
    muscleFatigue: number
    notes?: string | null
  }): Promise<DailyWellness> {
    const payload: WellnessPayload = {
      date: toYmdLocal(new Date()),
      energy: data.energy,
      sleep_quality: data.sleepQuality,
      muscle_fatigue: data.muscleFatigue,
      notes: data.notes ?? null,
    }
    const raw = await api.post<RawWellness>('/wellness', payload)
    return mapWellness(raw)
  },

  /** Historial de bienestar (para trainer o gráficas) */
  async getHistory(
    clientId: string,
    from?: string,
    to?: string,
  ): Promise<DailyWellness[]> {
    const params = new URLSearchParams({
      client_id: clientId,
      from: from ?? daysAgo(30),
      to: to ?? toYmdLocal(new Date()),
    })
    const raw = await api.get<RawWellness[]>(`/wellness?${params}`)
    return raw.map(mapWellness)
  },

  /** Check si ya se registró hoy */
  async getTodayEntry(clientId: string): Promise<DailyWellness | null> {
    const today = toYmdLocal(new Date())
    const params = new URLSearchParams({
      client_id: clientId,
      from: today,
      to: today,
    })
    const raw = await api.get<RawWellness[]>(`/wellness?${params}`)
    return raw.length ? mapWellness(raw[0]) : null
  },

  /** Summary con readiness, alerta de sobrecarga, y entry de hoy */
  async getWellnessSummary(clientId: string): Promise<WellnessSummary> {
    const raw = await api.get<RawWellnessSummary>(
      `/clients/${clientId}/wellness-summary`,
    )
    return {
      overloadAlert: raw.overload_alert,
      avgFatigue7d: raw.avg_fatigue_7d,
      avgEnergy7d: raw.avg_energy_7d,
      readinessScore: raw.readiness_score,
      todayEntry: raw.today_entry
        ? {
            energy: raw.today_entry.energy,
            sleepQuality: raw.today_entry.sleep_quality,
            muscleFatigue: raw.today_entry.muscle_fatigue,
          }
        : null,
    }
  },

  /** Correlación fatiga vs volumen por semana */
  async getWellnessCorrelation(
    clientId: string,
    from?: string,
    to?: string,
  ): Promise<WellnessCorrelationPoint[]> {
    const params = new URLSearchParams({
      from: from ?? daysAgo(84), // ~12 weeks
      to: to ?? toYmdLocal(new Date()),
    })
    const raw = await api.get<{ points: RawCorrelationPoint[] }>(
      `/clients/${clientId}/wellness-correlation?${params}`,
    )
    return raw.points.map((p) => ({
      week: p.week,
      avgFatigue: p.avg_fatigue,
      volume: p.volume,
    }))
  },
}
