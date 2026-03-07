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

export type ReportPeriod = 'week' | 'month'

export interface TrainerReportsResponse {
  stats: {
    activeClients: number
    avgAttendance: number
    totalWorkouts: number
    totalMeals: number
    prsThisWeek: number
  }
  attendance: Array<{ day: string; attended: number; missed: number }>
  adherenceRanking: Array<{
    clientId: string
    clientName: string
    avatar: string | null
    workouts: number
    plannedWorkouts: number
    meals: number
    adherencePct: number
  }>
  weeklyProgress: Array<{
    clientId: string
    clientName: string
    avatar: string | null
    completedWorkouts: number
    plannedWorkouts: number
    volumeKg: number
    prs: number
    streak: number
  }>
  groupVolume: Array<{ week: string; volume: number }>
  wellbeingSnapshot: {
    avgStress: number
    avgEnergy: number
    avgSleep: number
    moodDistribution: {
      great: number
      good: number
      neutral: number
      bad: number
      terrible: number
    }
    clientsWithCheckin: number
    clientsWithoutCheckin: number
  }
  prsThisWeek: Array<{
    clientName: string
    exerciseName: string
    newWeight: number
    previousBest: number
    date: string
  }>
  adherenceHistory: Array<{ month: string; adherencePct: number }>
}

export async function getTrainerReports(
  trainerId: string,
  period: ReportPeriod,
): Promise<TrainerReportsResponse> {
  return api.get<TrainerReportsResponse>(`/trainer/${trainerId}/reports?period=${period}`)
}
