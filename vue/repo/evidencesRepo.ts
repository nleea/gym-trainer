import { api } from '../api'
import type { ExerciseEvidence } from '../types'
import { toDate } from './fireRepo'

function mapEvidence(d: any): ExerciseEvidence {
  return {
    id: d.id,
    trainingLogId: d.training_log_id ?? d.trainingLogId,
    exerciseId: d.exercise_id ?? d.exerciseId,
    exerciseName: d.exercise_name ?? d.exerciseName,
    clientId: d.client_id ?? d.clientId,
    trainerId: d.trainer_id ?? d.trainerId,
    clientNote: d.client_note ?? d.clientNote ?? null,
    photoUrls: d.photo_urls ?? d.photoUrls ?? [],
    submittedAt: toDate(d.submitted_at ?? d.submittedAt) ?? new Date(),
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
  const list = await api.get<any[]>(`/exercise-evidences?training_log_id=${trainingLogId}`)
  return list.map(mapEvidence)
}

export async function listEvidencesByClient(
  clientId: string,
  limit = 20,
  offset = 0,
): Promise<ExerciseEvidence[]> {
  const list = await api.get<any[]>(
    `/exercise-evidences?client_id=${clientId}&limit=${limit}&offset=${offset}`,
  )
  return list.map(mapEvidence)
}

export async function getEvidenceById(evidenceId: string): Promise<ExerciseEvidence> {
  const d = await api.get<any>(`/exercise-evidences/${evidenceId}`)
  return mapEvidence(d)
}

export async function submitEvidenceFeedback(
  evidenceId: string,
  data: {
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
  const res = await api.putForm<any>(`/exercise-evidences/${evidenceId}/feedback`, form)
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
