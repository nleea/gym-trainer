import { api } from '../api'

// ── Public types ─────────────────────────────────────────────────────────────
export interface OneRepMaxPoint {
  date: string       // "YYYY-MM-DD"
  estimated1rm: number // kg
}

export interface ExerciseOption {
  exerciseId: string
  exerciseName: string
}

export interface RpeHistoryPoint {
  date: string      // "YYYY-MM-DD"
  avgRpe: number    // average RPE for that session
}

// ── Backend response shapes ──────────────────────────────────────────────────
interface RawOneRepMaxPoint {
  date: string
  estimated_1rm: number
}

interface RawExerciseOption {
  exercise_id: string
  exercise_name: string
}

interface RawRpeHistoryPoint {
  date: string
  avg_rpe: number
}

// ── Repo ─────────────────────────────────────────────────────────────────────
export const oneRepMaxRepo = {
  async getOneRepMaxHistory(
    clientId: string,
    exerciseId: string,
  ): Promise<OneRepMaxPoint[]> {
    const params = new URLSearchParams({
      exercise_id: exerciseId,
    })
    const raw = await api.get<RawOneRepMaxPoint[]>(
      `/clients/${clientId}/one-rep-max?${params}`,
    )
    return raw.map((p) => ({
      date: p.date,
      estimated1rm: p.estimated_1rm,
    }))
  },

  async getLoggedExercises(clientId: string): Promise<ExerciseOption[]> {
    const raw = await api.get<RawExerciseOption[]>(
      `/clients/${clientId}/logged-exercises`,
    )
    return raw.map((e) => ({
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
    }))
  },

  async getRpeHistory(
    clientId: string,
    exerciseId: string,
  ): Promise<RpeHistoryPoint[]> {
    const params = new URLSearchParams({
      exercise_id: exerciseId,
    })
    const raw = await api.get<RawRpeHistoryPoint[]>(
      `/clients/${clientId}/rpe-history?${params}`,
    )
    return raw.map((p) => ({
      date: p.date,
      avgRpe: p.avg_rpe,
    }))
  },
}
