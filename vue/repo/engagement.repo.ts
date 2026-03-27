import { api } from '../api'

// ── Backend response shape (snake_case) ──────────────────────────────────────
interface RawEngagement {
  client_id: string
  client_name: string
  days_active_7d: number
  days_active_30d: number
  at_risk: boolean
  last_activity: string | null
}

// ── Frontend type (camelCase) ────────────────────────────────────────────────
export interface ClientEngagement {
  clientId: string
  clientName: string
  daysActive7d: number
  daysActive30d: number
  atRisk: boolean
  lastActivity: string | null
}

// ── Mapper ───────────────────────────────────────────────────────────────────
function mapEngagement(raw: RawEngagement): ClientEngagement {
  return {
    clientId: raw.client_id,
    clientName: raw.client_name,
    daysActive7d: raw.days_active_7d,
    daysActive30d: raw.days_active_30d,
    atRisk: raw.at_risk,
    lastActivity: raw.last_activity,
  }
}

// ── Repo ─────────────────────────────────────────────────────────────────────
export const engagementRepo = {
  async getEngagement(): Promise<ClientEngagement[]> {
    const raw = await api.get<RawEngagement[]>('/clients/engagement')
    return raw.map(mapEngagement)
  },
}
