import { defineStore } from 'pinia'
import type { ExerciseEvidence } from '../types'
import {
  createEvidence,
  getEvidencePendingCount,
  listEvidencesByClient,
  listEvidencesByLog,
  markEvidenceAsViewed,
  submitEvidenceFeedback,
} from '../repo/evidencesRepo'

export const useEvidencesStore = defineStore('evidences', {
  state: () => ({
    evidencesByLog: {} as Record<string, ExerciseEvidence[]>,
    clientEvidences: {} as Record<string, ExerciseEvidence[]>,
    loading: false,
    pendingByClient: {} as Record<string, { unanswered: number; unviewed_responded: number }>,
  }),

  getters: {
    getLogEvidences: (s) => (logId: string) => s.evidencesByLog[logId] ?? [],
    getClientEvidences: (s) => (clientId: string) => s.clientEvidences[clientId] ?? [],
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
        trainerFeedback?: string
        trainerRating?: 'correct' | 'improve'
        photos?: File[]
      },
    ) {
      const updated = await submitEvidenceFeedback(evidenceId, data)
      const logId = updated.trainingLogId
      this.evidencesByLog[logId] = (this.evidencesByLog[logId] ?? []).map((e) =>
        e.id === updated.id ? updated : e,
      )
      this.clientEvidences[updated.clientId] = (this.clientEvidences[updated.clientId] ?? []).map((e) =>
        e.id === updated.id ? updated : e,
      )
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
