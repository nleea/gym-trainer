// vue/repo/clients.ts
import { api } from '../api'
import type { Client, NutritionPlan, TrainingPlan } from '../types'
import { toDate } from './fireRepo'

interface RawClient extends Record<string, unknown> {
  createdAt?: unknown
  created_at?: unknown
  startDate?: unknown
  start_date?: unknown
}

interface RawTrainingPlan extends Record<string, unknown> {
  createdAt?: unknown
  created_at?: unknown
  updatedAt?: unknown
  updated_at?: unknown
}

interface RawNutritionPlan extends Record<string, unknown> {
  createdAt?: unknown
  created_at?: unknown
  updatedAt?: unknown
  updated_at?: unknown
}

function mapClient(d: RawClient): Client {
  return {
    ...d,
    createdAt: toDate(d.createdAt ?? d.created_at) ?? new Date(),
    startDate: toDate(d.startDate ?? d.start_date) ?? new Date(),
  } as Client
}

function mapTrainingPlan(d: RawTrainingPlan): TrainingPlan {
  return {
    ...d,
    createdAt: toDate(d.createdAt ?? d.created_at) ?? new Date(),
    updatedAt: toDate(d.updatedAt ?? d.updated_at) ?? new Date(),
  } as TrainingPlan
}

function mapNutritionPlan(d: RawNutritionPlan): NutritionPlan {
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
  const list = await api.get<RawClient[]>('/clients')
  return list.map(mapClient)
}

export const listClients = listClientsByTrainer

// GET BY ID
export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const d = await api.get<RawClient>(`/clients/${clientId}`)
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
    const plan = await api.get<RawTrainingPlan>(`/training-plans/client/${clientId}`)
    return mapTrainingPlan(plan)
  } catch {
    return null
  }
}

// Plan de nutrición activo del cliente
export async function getClientNutritionPlan(clientId: string): Promise<NutritionPlan | null> {
  try {
    const plan = await api.get<RawNutritionPlan>(`/nutrition-plans/client/${clientId}`)
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

export interface WorkoutHistorySet {
  reps: number
  weight: number
  rpe?: number
  completed?: boolean
}

export interface WorkoutHistoryExercise {
  exerciseId: string
  exerciseName: string
  sets: WorkoutHistorySet[]
  notes?: string
}

export interface WorkoutHistoryItem {
  id: string
  date: string
  duration?: number
  notes?: string
  effort?: number
  exercises: WorkoutHistoryExercise[]
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
