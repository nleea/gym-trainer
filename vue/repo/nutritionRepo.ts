import { api } from '../api'
import { toYmdLocal } from '../../lib/utils'

function toISO(d: Date): string {
  return toYmdLocal(d)
}

export interface MacroProgress { consumed: number; target: number }

export interface TodayMacros {
  calories: MacroProgress
  protein_g: MacroProgress
  carbs_g: MacroProgress
  fat_g: MacroProgress
  water_ml: MacroProgress
}

export interface MealLogFull {
  id: string
  client_id: string
  date: string
  type: string
  meal_name?: string
  meal_key?: string
  description?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  water_ml?: number
  foods?: any
  notes?: string
  created_at: string
  updated_at: string
}

export interface DailyAdherence { date: string; has_log: boolean; calories_pct: number }
export interface Adherence { last_7_days: number; last_30_days: number; percentage: number }

export interface NutritionSummary {
  today_logs: MealLogFull[]
  today_macros: TodayMacros
  adherence: Adherence
  daily_history: DailyAdherence[]
}

export interface MealLogUpsertPayload {
  date: string
  type: string
  meal_name?: string
  meal_key?: string
  description?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  water_ml?: number
  foods?: any
  notes?: string
}

export async function getNutritionSummary(
  clientId: string,
  date: Date
): Promise<NutritionSummary> {
  return api.get<NutritionSummary>(
    `/meal-logs/nutrition-summary?client_id=${clientId}&date=${toISO(date)}`
  )
}

export async function upsertMealLog(data: MealLogUpsertPayload): Promise<MealLogFull> {
  return api.post<MealLogFull>('/meal-logs/upsert', data)
}

export async function deleteMealLogById(logId: string): Promise<void> {
  return api.delete(`/meal-logs/${logId}`)
}
