import { api } from '../api'

export interface WeeklyVolume {
  week: string
  volume: number
}

export interface AdherenceRate {
  training: { weekly: number; monthly: number }
  nutrition: { weekly: number; monthly: number }
}

// ── Backend response shapes ──────────────────────────────────────────────────
interface VolumeResponse {
  weeks: WeeklyVolume[]
  total_volume: number
}

interface AdherenceBlock {
  completed: number
  planned: number
  percentage: number
}

interface AdherenceResponse {
  training: AdherenceBlock
  nutrition: AdherenceBlock
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toYmd(d)
}

export const volumeMetricsRepo = {
  async getWeeklyVolume(clientId: string, from?: string, to?: string): Promise<WeeklyVolume[]> {
    const params = new URLSearchParams({ client_id: clientId })
    params.set('from', from ?? daysAgo(84)) // ~12 weeks
    params.set('to', to ?? toYmd(new Date()))
    const res = await api.get<VolumeResponse>(`/metrics/volume?${params}`)
    return res.weeks
  },

  async getAdherenceRate(clientId: string): Promise<AdherenceRate> {
    const today = toYmd(new Date())

    const weekParams = new URLSearchParams({ client_id: clientId, from: daysAgo(7), to: today })
    const monthParams = new URLSearchParams({ client_id: clientId, from: daysAgo(30), to: today })

    const [weekly, monthly] = await Promise.all([
      api.get<AdherenceResponse>(`/metrics/adherence?${weekParams}`),
      api.get<AdherenceResponse>(`/metrics/adherence?${monthParams}`),
    ])

    return {
      training: {
        weekly: Math.round(weekly.training.percentage),
        monthly: Math.round(monthly.training.percentage),
      },
      nutrition: {
        weekly: Math.round(weekly.nutrition.percentage),
        monthly: Math.round(monthly.nutrition.percentage),
      },
    }
  },
}
