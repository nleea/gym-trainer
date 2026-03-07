import { api } from '../api'

export interface TrainerDashboardStats {
  totalClients: number
  activeThisWeek: number
  inactiveClients: number
  prsThisWeek: number
}

export interface LastCheckinSummary {
  mood: string | null
  energy: number | null
  stress: number | null
  weekStart: string
}

export interface WeightPoint {
  date: string
  weightKg: number | null
}

export interface RecentWorkoutItem {
  date: string
  exerciseCount: number
  volume: number
  duration: number | null
}

export interface DashboardClient {
  id: string
  name: string
  avatar: null
  streak: number
  lastWorkout: string | null
  daysSinceLastWorkout: number | null
  weeklyWorkouts: number
  weightKg: number | null
  weightChange: number | null
  currentPlan: string | null
  hasNutritionPlan: boolean
  lastCheckin: LastCheckinSummary | null
  alerts: string[]
  workoutDates7d: string[]
  recentWorkouts: RecentWorkoutItem[]
  weightHistory: WeightPoint[]
}

export interface TrainerDashboard {
  stats: TrainerDashboardStats
  clients: DashboardClient[]
}

export async function getTrainerDashboard(): Promise<TrainerDashboard> {
  return api.get<TrainerDashboard>('/trainer/dashboard')
}
