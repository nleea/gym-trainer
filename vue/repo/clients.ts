// vue/repo/clients.ts
import { api } from '../api'
import type { Client, NutritionPlan, TrainingPlan } from '../types'
import { toDate } from './fireRepo'

function mapClient(d: any): Client {
  return {
    ...d,
    createdAt: toDate(d.createdAt ?? d.created_at) ?? new Date(),
    startDate: toDate(d.startDate ?? d.start_date) ?? new Date(),
  } as Client
}

function mapTrainingPlan(d: any): TrainingPlan {
  return {
    ...d,
    createdAt: toDate(d.createdAt ?? d.created_at) ?? new Date(),
    updatedAt: toDate(d.updatedAt ?? d.updated_at) ?? new Date(),
  } as TrainingPlan
}

function mapNutritionPlan(d: any): NutritionPlan {
  return {
    ...d,
    createdAt: toDate(d.createdAt ?? d.created_at) ?? new Date(),
    updatedAt: toDate(d.updatedAt ?? d.updated_at) ?? new Date(),
  } as NutritionPlan
}

// CREATE
export async function createClient(data: Partial<Client>): Promise<string> {
  const res = await api.post<{ id: string }>('/clients', data)
  return res.id
}

// LIST (filtrado por trainer vía token)
export async function listClientsByTrainer(_trainerId?: string): Promise<Client[]> {
  const list = await api.get<any[]>('/clients')
  return list.map(mapClient)
}

export const listClients = listClientsByTrainer

// GET BY ID
export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const d = await api.get<any>(`/clients/${clientId}`)
    return mapClient(d)
  } catch {
    return null
  }
}

// UPDATE
export async function updateClient(clientId: string, data: Partial<Client>): Promise<void> {
  await api.put(`/clients/${clientId}`, data)
}

// DELETE — no expuesto en el backend actual; desactiva el cliente
export async function deleteClient(clientId: string): Promise<void> {
  await updateClient(clientId, { status: 'inactive' })
}

// Plan de entrenamiento activo del cliente
export async function getClientPlantraining(clientId: string): Promise<TrainingPlan | null> {
  try {
    const client = await api.get<any>(`/clients/${clientId}`)
    const planId = client?.plan_id
    if (!planId) return null
    const plan = await api.get<any>(`/training-plans/${planId}`)
    return mapTrainingPlan(plan)
  } catch {
    return null
  }
}

// Plan de nutrición activo del cliente
export async function getClientNutritionPlan(clientId: string): Promise<NutritionPlan | null> {
  try {
    const client = await api.get<any>(`/clients/${clientId}`)
    const nutritionPlanId = client?.nutrition_plan_id
    if (!nutritionPlanId) return null
    const plan = await api.get<any>(`/nutrition-plans/${nutritionPlanId}`)
    return mapNutritionPlan(plan)
  } catch {
    return null
  }
}

export async function updateClientPlantraining(
  _clientId: string,
  planId: string,
  data: Partial<TrainingPlan>
): Promise<void> {
  await api.put(`/training-plans/${planId}`, data)
}

export async function updateClientNutritionPlan(
  _clientId: string,
  planId: string,
  data: Partial<NutritionPlan>
): Promise<void> {
  await api.put(`/nutrition-plans/${planId}`, data)
}

export interface WorkoutSummaryStats {
  totalWorkouts: number
  weeklyWorkouts: number
  totalMinutes: number
  currentStreak: number
}

export interface ExerciseProgressItem {
  exerciseName: string
  bestWeight: number
  lastWeight: number
  lastDate: string
  trend: number
}

export interface WorkoutHistoryItem {
  id: string
  date: string
  duration?: number
  notes?: string
  effort?: number
  exercises: any[]
  volume: number
  maxWeight: number
}

export interface WorkoutSummary {
  stats: WorkoutSummaryStats
  exerciseProgress: ExerciseProgressItem[]
  workoutHistory: WorkoutHistoryItem[]
}

export async function getWorkoutSummary(clientId: string): Promise<WorkoutSummary> {
  return api.get<WorkoutSummary>(`/clients/${clientId}/workout-summary`)
}
