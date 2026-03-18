// vue/repo/assingTrainedRepo.ts
// Ahora el backend maneja asignaciones directamente en /training-plans/{id}/assign
// Este repo se mantiene para compatibilidad con los stores existentes.
import { api } from '../api'
import type { AssignedTrainingPlan } from '../types'
import { toDate } from './fireRepo'
import { toYmdLocal } from '../../lib/utils'

interface RawAssignedPlan extends Record<string, unknown> {
  startDate?: unknown
  start_date?: unknown
  endDate?: unknown
  end_date?: unknown
}

interface RawClientSummary {
  training_plan?: Record<string, unknown>
}

interface RawClientRecord {
  plan_id?: string
}

function mapAssigned(d: RawAssignedPlan): AssignedTrainingPlan {
  return {
    ...d,
    startDate: toDate(d.startDate ?? d.start_date) ?? new Date(),
    endDate: toDate(d.endDate ?? d.end_date) ?? new Date(),
  } as AssignedTrainingPlan
}

export async function assignTrainingPlan(data: AssignedTrainingPlan): Promise<string> {
  const res = await api.post<{ id: string }>(`/training-plans/${data.planId}/assign`, {
    client_id: data.clientId,
    start_date: data.startDate instanceof Date
      ? toYmdLocal(data.startDate)
      : data.startDate,
  })
  return res.id
}

export async function getActiveTrainingPlanByClient(
  clientId: string
): Promise<AssignedTrainingPlan | null> {
  try {
    const summary = await api.get<RawClientSummary>(`/clients/${clientId}/summary`)
    if (!summary?.training_plan) return null
    return mapAssigned({ ...summary.training_plan, clientId, status: 'active' })
  } catch {
    return null
  }
}

export async function listAssignedTrainingPlans(clientId: string): Promise<AssignedTrainingPlan[]> {
  const client = await api.get<RawClientRecord>(`/clients/${clientId}`)
  if (!client?.plan_id) return []
  return [mapAssigned({ id: client.plan_id, clientId, planId: client.plan_id, status: 'active' })]
}

export async function updateAssignedTraining(
  _id: string,
  _data: Partial<AssignedTrainingPlan>
): Promise<void> {
  // El backend no expone este endpoint; las asignaciones se manejan via /assign
}
