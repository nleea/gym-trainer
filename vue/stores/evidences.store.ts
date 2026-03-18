import { defineStore } from 'pinia'
import type { ExerciseEvidence, WeeklyEvidencesResponse } from '../types'
import {
  createEvidence,
  getEvidencePendingCount,
  listEvidencesByClient,
  listEvidencesByClientWeek,
  listEvidencesByLog,
  markEvidenceAsViewed,
  submitEvidenceFeedback,
} from '../repo/evidencesRepo'

export const useEvidencesStore = defineStore('evidences', {
  state: () => ({
    evidencesByLog: {} as Record<string, ExerciseEvidence[]>,
    clientEvidences: {} as Record<string, ExerciseEvidence[]>,
    clientEvidencesByWeek: {} as Record<string, WeeklyEvidencesResponse>,
    loading: false,
    pendingByClient: {} as Record<string, { unanswered: number; unviewed_responded: number }>,
  }),

  getters: {
    getLogEvidences: (s) => (logId: string) => s.evidencesByLog[logId] ?? [],
    getClientEvidences: (s) => (clientId: string) => s.clientEvidences[clientId] ?? [],
    getClientEvidencesByWeek: (s) => (key: string) => s.clientEvidencesByWeek[key] ?? null,
    getEvidenceByLogExercise: (s) => (logId: string, exerciseId: string) =>
      (s.evidencesByLog[logId] ?? []).find((e) => e.exerciseId === exerciseId) ?? null,
    getPendingForClient: (s) => (clientId: string) =>
      s.pendingByClient[clientId] ?? { unanswered: 0, unviewed_responded: 0 },
  },

  actions: {
    async loadEvidencesByLog(logId: string, force = false) {
      if (!logId) return []
      if (!force && this.evidencesByLog[logId]) return this.evidencesByLog[logId]
      this.loading = true
      try {
        const list = await listEvidencesByLog(logId)
        this.evidencesByLog[logId] = list
        return list
      } finally {
        this.loading = false
      }
    },

    async loadClientEvidences(clientId: string, limit = 50, offset = 0) {
      if (!clientId) return []
      this.loading = true
      try {
        const list = await listEvidencesByClient(clientId, limit, offset)
        this.clientEvidences[clientId] = list
        return list
      } finally {
        this.loading = false
      }
    },

    async loadClientEvidencesByWeek(params: {
      clientId: string
      type?: string
      weekStart: string
      weekEnd: string
      limit?: number
      offset?: number
    }) {
      if (!params.clientId) return null
      const key = `${params.clientId}:${params.type ?? 'all'}:${params.weekStart}:${params.weekEnd}`
      this.loading = true
      try {
        const week = await listEvidencesByClientWeek(params)
        this.clientEvidencesByWeek[key] = week
        return week
      } catch (e: unknown) {
        const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
        const isNotFound = msg.includes('404') || msg.includes('not found') || msg.includes('no encontrado')
        if (isNotFound) {
          const empty = {
            weekStart: params.weekStart,
            weekEnd: params.weekEnd,
            days: [],
          }
          this.clientEvidencesByWeek[key] = empty
          return empty
        }
        throw e
      } finally {
        this.loading = false
      }
    },

    async submitEvidence(data: {
      trainingLogId: string
      exerciseId: string
      exerciseName: string
      clientNote?: string
      photos?: File[]
    }) {
      const created = await createEvidence(data)
      const logId = created.trainingLogId
      const cur = this.evidencesByLog[logId] ?? []
      this.evidencesByLog[logId] = [created, ...cur]
      return created
    },

    async submitFeedback(
      evidenceId: string,
      data: {
        evidenceType?: string
        trainerFeedback?: string
        trainerRating?: 'correct' | 'improve'
        photos?: File[]
      },
    ) {
      const updated = await submitEvidenceFeedback(evidenceId, data)
      const logId = updated.trainingLogId
      if (logId) {
        this.evidencesByLog[logId] = (this.evidencesByLog[logId] ?? []).map((e) =>
          e.id === updated.id ? updated : e,
        )
      }
      this.clientEvidences[updated.clientId] = (this.clientEvidences[updated.clientId] ?? []).map((e) =>
        e.id === updated.id ? updated : e,
      )
      for (const key of Object.keys(this.clientEvidencesByWeek)) {
        const bucket = this.clientEvidencesByWeek[key]
        bucket.days = bucket.days.map((day) => ({
          ...day,
          evidences: day.evidences.map((e) => (e.id === updated.id ? updated : e)),
        }))
      }
      return updated
    },

    async markAsViewed(evidenceId: string) {
      const updated = await markEvidenceAsViewed(evidenceId)
      this.evidencesByLog[updated.trainingLogId] = (this.evidencesByLog[updated.trainingLogId] ?? []).map((e) =>
        e.id === updated.id ? updated : e,
      )
      this.clientEvidences[updated.clientId] = (this.clientEvidences[updated.clientId] ?? []).map((e) =>
        e.id === updated.id ? updated : e,
      )
      await this.loadPendingCount(updated.clientId)
      return updated
    },

    async loadPendingCount(clientId: string) {
      if (!clientId) return { unanswered: 0, unviewed_responded: 0 }
      const data = await getEvidencePendingCount(clientId)
      this.pendingByClient[clientId] = data
      return data
    },
  },
})
