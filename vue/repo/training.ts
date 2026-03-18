// vue/repo/training.ts
import { api } from '../api'
import type { TrainingPlan } from '../types'
import { toDate } from './fireRepo'

interface RawTrainingPlan extends Record<string, unknown> {
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

function mapPlan(d: RawTrainingPlan): TrainingPlan {
  return {
    ...d,
    isTemplate: d.is_template ?? d.isTemplate ?? false,
    clientId: d.client_id ?? d.clientId ?? null,
    sourceTemplateId: d.source_template_id ?? d.sourceTemplateId ?? null,
    assignedAt: toDate(d.assigned_at ?? d.assignedAt),
    copiesCount: d.copies_count ?? d.copiesCount ?? null,
    createdAt: toDate(d.createdAt ?? d.created_at) ?? new Date(),
    updatedAt: toDate(d.updatedAt ?? d.updated_at) ?? new Date(),
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
  const list = await api.get<RawTrainingPlan[]>('/training-plans/templates')
  return list.map(mapPlan)
}

export const listTrainingPlans = listTrainingPlansByEntrenator

export async function getTrainingPlanById(id: string): Promise<TrainingPlan | null> {
  try {
    const d = await api.get<RawTrainingPlan>(`/training-plans/${id}`)
    return mapPlan(d)
  } catch {
    return null
  }
}

export async function updateTrainingPlan(id: string, data: Partial<TrainingPlan>): Promise<void> {
  const endpoint = data.isTemplate ? `/training-plans/templates/${id}` : `/training-plans/${id}`
  await api.put(endpoint, data)
}

export async function deleteTrainingPlan(id: string): Promise<void> {
  await api.delete(`/training-plans/templates/${id}`)
}

export async function assignTemplateToClient(
  templatePlanId: string,
  clientId: string,
  startDate: string,
  durationWeeks: number,
  _uid: string
): Promise<TrainingPlan | undefined> {
  const plan = await api.post<RawTrainingPlan>(`/training-plans/${templatePlanId}/assign`, {
    client_id: clientId,
    start_date: startDate,
    duration_weeks: durationWeeks,
  })
  return mapPlan(plan)
}
