export type AchievementCategory =
  | 'workouts'
  | 'streak'
  | 'strength'
  | 'consistency'
  | 'milestones'

export interface Achievement {
  id: string
  slug: string
  title: string
  description: string
  icon: string // emoji (e.g. "🏋️", "🔥", "🏆")
  category: AchievementCategory
  unlocked: boolean
  unlockedAt: string | null // "YYYY-MM-DD" or null
  progress: number // current value (e.g. 7 workouts done)
  target: number   // goal value (e.g. 10 workouts)
}

export interface AchievementsSummary {
  total: number
  unlocked: number
  latest: {
    slug: string
    title: string
    icon: string
    unlockedAt: string
  }[]
}
