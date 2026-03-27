import { api } from '../api'
import type { Achievement, AchievementsSummary } from '../types/achievement'

// ── Backend response shapes ──────────────────────────────────────────────────
interface RawAchievement {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  category: string
  unlocked: boolean
  unlocked_at: string | null
  progress: number
  target: number
}

interface RawSummary {
  total: number
  unlocked: number
  latest: {
    slug: string
    title: string
    icon: string
    unlocked_at: string
  }[]
}

// ── Mappers ──────────────────────────────────────────────────────────────────
function mapAchievement(raw: RawAchievement): Achievement {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    icon: raw.icon,
    category: raw.category as Achievement['category'],
    unlocked: raw.unlocked,
    unlockedAt: raw.unlocked_at,
    progress: raw.progress,
    target: raw.target,
  }
}

function mapSummary(raw: RawSummary): AchievementsSummary {
  return {
    total: raw.total,
    unlocked: raw.unlocked,
    latest: raw.latest.map((l) => ({
      slug: l.slug,
      title: l.title,
      icon: l.icon,
      unlockedAt: l.unlocked_at,
    })),
  }
}

// ── Repo ─────────────────────────────────────────────────────────────────────
export const achievementsRepo = {
  async getAchievements(clientId: string): Promise<Achievement[]> {
    const raw = await api.get<RawAchievement[]>(
      `/clients/${clientId}/achievements`,
    )
    return raw.map(mapAchievement)
  },

  async getAchievementsSummary(clientId: string): Promise<AchievementsSummary> {
    const raw = await api.get<RawSummary>(
      `/clients/${clientId}/achievements/summary`,
    )
    return mapSummary(raw)
  },
}
