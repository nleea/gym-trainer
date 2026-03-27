import { api } from '../api'

// ── Public types ─────────────────────────────────────────────────────────────
export interface StreakData {
  current: number
  best: number
  lastActivity: string | null  // "YYYY-MM-DD" or null if no activity
}

// ── Backend response shape ───────────────────────────────────────────────────
interface RawStreakResponse {
  current: number
  best: number
  last_activity: string | null
}

// ── Repo ─────────────────────────────────────────────────────────────────────
export const streakRepo = {
  async getStreak(clientId: string): Promise<StreakData> {
    const raw = await api.get<RawStreakResponse>(
      `/clients/${clientId}/streak`,
    )
    return {
      current: raw.current,
      best: raw.best,
      lastActivity: raw.last_activity,
    }
  },
}
