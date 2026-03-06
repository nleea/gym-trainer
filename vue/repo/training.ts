// vue/repo/training.ts
import { api } from '../api'
import type { TrainingPlan } from '../types'
import { toDate } from './fireRepo'

function mapPlan(d: any): TrainingPlan {
  return {
    ...d,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date(),
  } as TrainingPlan
}

export async function createTrainingPlan(_trainerId: string, data: TrainingPlan): Promise<string> {
  const res = await api.post<{ id: string }>('/training-plans', {
    name: data.name,
    description: data.description ?? '',
    weeks: data.weeks ?? [],
  })
  return res.id
}

export async function listTrainingPlansByEntrenator(_trainerId?: string): Promise<TrainingPlan[]> {
  const list = await api.get<any[]>('/training-plans')
  return list.map(mapPlan)
}

export const listTrainingPlans = listTrainingPlansByEntrenator

export async function getTrainingPlanById(id: string): Promise<TrainingPlan | null> {
  try {
    const d = await api.get<any>(`/training-plans/${id}`)
    return mapPlan(d)
  } catch {
    return null
  }
}

export async function updateTrainingPlan(id: string, data: Partial<TrainingPlan>): Promise<void> {
  await api.put(`/training-plans/${id}`, data)
}

export async function deleteTrainingPlan(id: string): Promise<void> {
  await api.delete(`/training-plans/${id}`)
}

export async function assignTemplateToClient(
  templatePlanId: string,
  clientId: string,
  startDate: string,
  durationWeeks: number,
  _uid: string
): Promise<TrainingPlan | undefined> {
  await api.post(`/training-plans/${templatePlanId}/assign`, {
    client_id: clientId,
    start_date: startDate,
    duration_weeks: durationWeeks,
  })
  return getTrainingPlanById(templatePlanId) ?? undefined
}
