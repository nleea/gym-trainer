import { api } from '../api'
import type { ExerciseEvidence, WeeklyEvidencesResponse } from '../types'
import { toDate } from './fireRepo'
import { toYmdLocal } from '../../lib/utils'

function mapEvidence(d: any): ExerciseEvidence {
  const submittedAt = toDate(d.submitted_at ?? d.submittedAt) ?? new Date()
  return {
    id: d.id,
    trainingLogId: d.training_log_id ?? d.trainingLogId ?? '',
    exerciseId: d.exercise_id ?? d.exerciseId ?? '',
    exerciseName: d.exercise_name ?? d.exerciseName ?? '',
    clientId: d.client_id ?? d.clientId,
    trainerId: d.trainer_id ?? d.trainerId,
    type: d.type ?? undefined,
    date: d.date ?? toYmdLocal(submittedAt),
    clientNote: d.client_note ?? d.clientNote ?? null,
    photoUrls: d.photo_urls ?? d.photoUrls ?? [],
    submittedAt,
    trainerFeedback: d.trainer_feedback ?? d.trainerFeedback ?? null,
    trainerRating: d.trainer_rating ?? d.trainerRating ?? null,
    trainerPhotoUrls: d.trainer_photo_urls ?? d.trainerPhotoUrls ?? [],
    respondedAt: toDate(d.responded_at ?? d.respondedAt),
    clientViewedAt: toDate(d.client_viewed_at ?? d.clientViewedAt),
    createdAt: toDate(d.created_at ?? d.createdAt) ?? new Date(),
  }
}

export async function createEvidence(data: {
  trainingLogId: string
  exerciseId: string
  exerciseName: string
  clientNote?: string
  photos?: File[]
}): Promise<ExerciseEvidence> {
  const form = new FormData()
  form.append('training_log_id', data.trainingLogId)
  form.append('exercise_id', data.exerciseId)
  form.append('exercise_name', data.exerciseName)
  if (data.clientNote) form.append('client_note', data.clientNote)
  for (const f of data.photos ?? []) form.append('photos', f)
  const res = await api.postForm<any>('/exercise-evidences', form)
  return mapEvidence(res)
}

export async function listEvidencesByLog(trainingLogId: string): Promise<ExerciseEvidence[]> {
  const currentUserRaw = localStorage.getItem('auth_user')
  const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null
  const clientId = currentUser?.client_id
  if (!clientId) return []

  const raw = await api.get<any>(
    `/evidences?client_id=${clientId}&type=exercise&training_log_id=${trainingLogId}`,
  )
  const items = (raw?.days ?? []).flatMap((day: any) => day?.evidences ?? [])
  return items.map(mapEvidence)
}

export async function listEvidencesByClient(
  clientId: string,
  limit = 20,
  offset = 0,
): Promise<ExerciseEvidence[]> {
  const raw = await api.get<any>(
    `/evidences?client_id=${clientId}&type=exercise&limit=${limit}&offset=${offset}`,
  )
  const items = (raw?.days ?? []).flatMap((day: any) => day?.evidences ?? [])
  return items.map(mapEvidence)
}

export async function listEvidencesByClientWeek(params: {
  clientId: string
  type?: string
  weekStart?: string
  weekEnd?: string
  limit?: number
  offset?: number
}): Promise<WeeklyEvidencesResponse> {
  const query = new URLSearchParams()
  query.set('client_id', params.clientId)
  if (params.type) query.set('type', params.type)
  if (params.weekStart) query.set('week_start', params.weekStart)
  if (params.weekEnd) query.set('week_end', params.weekEnd)
  if (typeof params.limit === 'number') query.set('limit', String(params.limit))
  if (typeof params.offset === 'number') query.set('offset', String(params.offset))

  const raw = await api.get<any>(`/evidences?${query.toString()}`)

  const days = (raw?.days ?? []).map((day: any) => ({
    date: day.date,
    label: day.label,
    evidences: (day.evidences ?? []).map(mapEvidence),
  }))

  return {
    weekStart: raw?.week_start ?? raw?.weekStart ?? params.weekStart ?? '',
    weekEnd: raw?.week_end ?? raw?.weekEnd ?? params.weekEnd ?? '',
    days,
  }
}

export async function createNutritionEvidence(data: {
  takenAt: string
  photo: File
  note?: string
  mealName?: string
}): Promise<ExerciseEvidence> {
  const form = new FormData()
  form.append('taken_at', data.takenAt)
  form.append('photo', data.photo)
  if (data.note) form.append('note', data.note)
  if (data.mealName) form.append('meal_name', data.mealName)
  const res = await api.postForm<any>('/evidences/nutrition', form)
  return mapEvidence(res)
}

export async function submitEvidenceFeedback(
  evidenceId: string,
  data: {
    evidenceType?: string
    trainerFeedback?: string
    trainerRating?: 'correct' | 'improve'
    photos?: File[]
    trainerPhotoUrls?: string[]
  },
): Promise<ExerciseEvidence> {
  const form = new FormData()
  if (data.trainerFeedback) form.append('trainer_feedback', data.trainerFeedback)
  if (data.trainerRating) form.append('trainer_rating', data.trainerRating)
  if (data.trainerPhotoUrls?.length) {
    form.append('trainer_photo_urls', data.trainerPhotoUrls.join(','))
  }
  for (const f of data.photos ?? []) form.append('photos', f)
  const endpoint = data.evidenceType === 'nutrition'
    ? `/evidences/nutrition/${evidenceId}/feedback`
    : `/exercise-evidences/${evidenceId}/feedback`
  const res = await api.putForm<any>(endpoint, form)
  return mapEvidence(res)
}

export async function markEvidenceAsViewed(evidenceId: string): Promise<ExerciseEvidence> {
  const d = await api.put<any>(`/exercise-evidences/${evidenceId}/viewed`)
  return mapEvidence(d)
}

export async function getEvidencePendingCount(clientId: string): Promise<{
  unanswered: number
  unviewed_responded: number
}> {
  return await api.get(`/exercise-evidences/pending-count/${clientId}`)
}
