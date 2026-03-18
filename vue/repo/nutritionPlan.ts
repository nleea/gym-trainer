// vue/repo/nutritionPlan.ts
import { api } from '../api'
import type { NutritionPlan } from '../types'
import { toDate } from './fireRepo'

interface RawNutritionPlan extends Record<string, unknown> {
  is_template?: boolean
  isTemplate?: boolean
  client_id?: string | null
  clientId?: string | null
  source_template_id?: string | null
  sourceTemplateId?: string | null
  assigned_at?: unknown
  assignedAt?: unknown
  copies_count?: number | null
  copiesCount?: number | null
  createdAt?: unknown
  created_at?: unknown
  updatedAt?: unknown
  updated_at?: unknown
}

interface NutritionPlanWithExtras extends NutritionPlan {
  water_ml?: number
  waterMl?: number
  fiberG?: number
  mealsPerDay?: number
  notes?: string
}

function mapPlan(d: RawNutritionPlan): NutritionPlan {
  return {
    ...d,
    isTemplate: d.is_template ?? d.isTemplate ?? false,
    clientId: d.client_id ?? d.clientId ?? null,
    sourceTemplateId: d.source_template_id ?? d.sourceTemplateId ?? null,
    assignedAt: toDate(d.assigned_at ?? d.assignedAt),
    copiesCount: d.copies_count ?? d.copiesCount ?? null,
    createdAt: toDate(d.createdAt ?? d.created_at) ?? new Date(),
    updatedAt: toDate(d.updatedAt ?? d.updated_at) ?? new Date(),
  } as NutritionPlan
}

export async function createNutritionPlan(_trainerId: string, data: NutritionPlan): Promise<string> {
  const dataExt = data as NutritionPlanWithExtras
  const res = await api.post<{ id: string }>('/nutrition-plans', {
    name: data.name,
    description: data.description ?? '',
    days: data.days ?? [],
    target_calories: data.targetCalories,
    target_protein: data.targetProtein,
    target_carbs: data.targetCarbs,
    target_fat: data.targetFat,
    water_ml: dataExt.water_ml ?? dataExt.waterMl,
    recommended_foods: data.recommendedFoods ?? [],
    forbidden_foods: data.forbiddenFoods ?? [],
    guidelines: data.guidelines ?? [],
  })
  return res.id
}

export async function listNutritionPlansByEntrenator(_trainerId?: string): Promise<NutritionPlan[]> {
  const list = await api.get<RawNutritionPlan[]>('/nutrition-plans/templates')
  return list.map(mapPlan)
}

export const listNutritionPlans = listNutritionPlansByEntrenator

export async function getNutritionPlanById(id: string): Promise<NutritionPlan | null> {
  try {
    const d = await api.get<RawNutritionPlan>(`/nutrition-plans/${id}`)
    return mapPlan(d)
  } catch {
    return null
  }
}

export async function updateNutritionPlan(id: string, data: Partial<NutritionPlan>): Promise<void> {
  const dataExt = data as Partial<NutritionPlanWithExtras>
  const endpoint = data.isTemplate ? `/nutrition-plans/templates/${id}` : `/nutrition-plans/${id}`
  await api.put(endpoint, {
    name: data.name,
    days: data.days,
    target_calories: data.targetCalories,
    target_protein: data.targetProtein,
    target_carbs: data.targetCarbs,
    target_fat: data.targetFat,
    fiber_g: dataExt.fiberG,
    water_ml: dataExt.water_ml ?? dataExt.waterMl,
    meals_per_day: dataExt.mealsPerDay,
    notes: dataExt.notes,
  })
}

export async function deleteNutritionPlan(id: string): Promise<void> {
  await api.delete(`/nutrition-plans/templates/${id}`)
}

export async function assignNutritionTemplateToClient(
  templatePlanId: string,
  clientId: string,
  startDate: string,
  durationWeeks: number,
  _uid: string
): Promise<NutritionPlan | undefined> {
  const plan = await api.post<RawNutritionPlan>(`/nutrition-plans/${templatePlanId}/assign`, {
    client_id: clientId,
    start_date: startDate,
    duration_weeks: durationWeeks,
  })
  return mapPlan(plan)
}
