import { defineStore } from 'pinia'
import { wellnessRepo } from '../repo/wellness.repo'
import type { WellnessSummary, WellnessCorrelationPoint } from '../repo/wellness.repo'
import type { DailyWellness } from '../types/wellness'

interface WellnessState {
  historyByClient: Record<string, DailyWellness[]>
  summaryByClient: Record<string, WellnessSummary>
  correlationByClient: Record<string, WellnessCorrelationPoint[]>
  loadingByClient: Record<string, boolean>
  errorByClient: Record<string, string | null>
  pendingByClient: Record<string, Promise<void> | null>
}

export const useWellnessStore = defineStore('wellness', {
  state: (): WellnessState => ({
    historyByClient: {},
    summaryByClient: {},
    correlationByClient: {},
    loadingByClient: {},
    errorByClient: {},
    pendingByClient: {},
  }),

  getters: {
    getHistory: (state) => (clientId: string) =>
      state.historyByClient[clientId] ?? [],

    getSummary: (state) => (clientId: string) =>
      state.summaryByClient[clientId] ?? null,

    getCorrelation: (state) => (clientId: string) =>
      state.correlationByClient[clientId] ?? [],

    isLoading: (state) => (clientId: string) =>
      state.loadingByClient[clientId] ?? false,

    getError: (state) => (clientId: string) =>
      state.errorByClient[clientId] ?? null,
  },

  actions: {
    async loadHistory(clientId: string, from?: string, to?: string) {
      if (this.pendingByClient[`history:${clientId}`]) return this.pendingByClient[`history:${clientId}`]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = wellnessRepo.getHistory(clientId, from, to)
        .then((data) => {
          this.historyByClient[clientId] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByClient[`history:${clientId}`] = null
        })

      this.pendingByClient[`history:${clientId}`] = promise as unknown as Promise<void>
      return promise
    },

    async loadSummary(clientId: string) {
      if (this.pendingByClient[`summary:${clientId}`]) return this.pendingByClient[`summary:${clientId}`]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = wellnessRepo.getWellnessSummary(clientId)
        .then((data) => {
          this.summaryByClient[clientId] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByClient[`summary:${clientId}`] = null
        })

      this.pendingByClient[`summary:${clientId}`] = promise as unknown as Promise<void>
      return promise
    },

    async loadCorrelation(clientId: string, from?: string, to?: string) {
      if (this.pendingByClient[`corr:${clientId}`]) return this.pendingByClient[`corr:${clientId}`]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = wellnessRepo.getWellnessCorrelation(clientId, from, to)
        .then((data) => {
          this.correlationByClient[clientId] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByClient[`corr:${clientId}`] = null
        })

      this.pendingByClient[`corr:${clientId}`] = promise as unknown as Promise<void>
      return promise
    },

    async createEntry(data: {
      energy: number
      sleepQuality: number
      muscleFatigue: number
      notes?: string | null
    }) {
      const entry = await wellnessRepo.create(data)
      // Invalidate caches so next load fetches fresh data
      const clientId = entry.clientId
      if (this.historyByClient[clientId]) {
        this.historyByClient[clientId].push(entry)
      }
      delete this.summaryByClient[clientId]
      return entry
    },

    invalidate(clientId: string) {
      delete this.historyByClient[clientId]
      delete this.summaryByClient[clientId]
      delete this.correlationByClient[clientId]
      delete this.errorByClient[clientId]
    },

    cleanStore() {
      this.$reset()
    },
  },
})
