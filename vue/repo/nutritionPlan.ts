// vue/repo/nutritionPlan.ts
import { api } from '../api'
import type { NutritionPlan } from '../types'
import { toDate } from './fireRepo'

function mapPlan(d: any): NutritionPlan {
  return {
    ...d,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date(),
  } as NutritionPlan
}

export async function createNutritionPlan(_trainerId: string, data: NutritionPlan): Promise<string> {
  const res = await api.post<{ id: string }>('/nutrition-plans', {
    name: data.name,
    description: data.description ?? '',
    days: data.days ?? [],
    target_calories: data.targetCalories,
    target_protein: data.targetProtein,
    target_carbs: data.targetCarbs,
    target_fat: data.targetFat,
    recommended_foods: data.recommendedFoods ?? [],
    forbidden_foods: data.forbiddenFoods ?? [],
    guidelines: data.guidelines ?? [],
  })
  return res.id
}

export async function listNutritionPlansByEntrenator(_trainerId?: string): Promise<NutritionPlan[]> {
  const list = await api.get<any[]>('/nutrition-plans')
  return list.map(mapPlan)
}

export const listNutritionPlans = listNutritionPlansByEntrenator

export async function getNutritionPlanById(id: string): Promise<NutritionPlan | null> {
  try {
    const d = await api.get<any>(`/nutrition-plans/${id}`)
    return mapPlan(d)
  } catch {
    return null
  }
}

export async function updateNutritionPlan(id: string, data: Partial<NutritionPlan>): Promise<void> {
  await api.put(`/nutrition-plans/${id}`, data)
}

export async function deleteNutritionPlan(id: string): Promise<void> {
  await api.delete(`/nutrition-plans/${id}`)
}

export async function assignNutritionTemplateToClient(
  templatePlanId: string,
  clientId: string,
  startDate: string,
  durationWeeks: number,
  _uid: string
): Promise<NutritionPlan | undefined> {
  await api.post(`/nutrition-plans/${templatePlanId}/assign`, {
    client_id: clientId,
    start_date: startDate,
    duration_weeks: durationWeeks,
  })
  return getNutritionPlanById(templatePlanId) ?? undefined
}
