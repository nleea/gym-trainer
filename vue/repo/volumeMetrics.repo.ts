import { api } from '../api'

export interface WeeklyVolume {
  week: string
  volume: number
}

export interface AdherenceRate {
  training: { weekly: number; monthly: number }
  nutrition: { weekly: number; monthly: number }
}

export const volumeMetricsRepo = {
  async getWeeklyVolume(clientId: string, from?: string, to?: string): Promise<WeeklyVolume[]> {
    const params = new URLSearchParams({ client_id: clientId })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return api.get<WeeklyVolume[]>(`/metrics/volume?${params}`)
  },

  async getAdherenceRate(clientId: string, from?: string, to?: string): Promise<AdherenceRate> {
    const params = new URLSearchParams({ client_id: clientId })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return api.get<AdherenceRate>(`/metrics/adherence?${params}`)
  },
}
