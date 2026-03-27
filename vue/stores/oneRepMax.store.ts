import { defineStore } from 'pinia'
import { oneRepMaxRepo } from '../repo/oneRepMax.repo'
import type { OneRepMaxPoint, ExerciseOption, RpeHistoryPoint } from '../repo/oneRepMax.repo'

interface OneRepMaxState {
  exercisesByClient: Record<string, ExerciseOption[]>
  historyByKey: Record<string, OneRepMaxPoint[]> // key = "clientId|exerciseId"
  rpeByKey: Record<string, RpeHistoryPoint[]>    // key = "clientId|exerciseId"
  loadingByClient: Record<string, boolean>
  errorByClient: Record<string, string | null>
  pendingByKey: Record<string, Promise<void> | null>
}

function cacheKey(clientId: string, exerciseId: string) {
  return `${clientId}|${exerciseId}`
}

export const useOneRepMaxStore = defineStore('oneRepMax', {
  state: (): OneRepMaxState => ({
    exercisesByClient: {},
    historyByKey: {},
    rpeByKey: {},
    loadingByClient: {},
    errorByClient: {},
    pendingByKey: {},
  }),

  getters: {
    getExercises: (state) => (clientId: string) =>
      state.exercisesByClient[clientId] ?? [],

    getHistory: (state) => (clientId: string, exerciseId: string) =>
      state.historyByKey[cacheKey(clientId, exerciseId)] ?? [],

    getRpeHistory: (state) => (clientId: string, exerciseId: string) =>
      state.rpeByKey[cacheKey(clientId, exerciseId)] ?? [],

    isLoading: (state) => (clientId: string) =>
      state.loadingByClient[clientId] ?? false,

    getError: (state) => (clientId: string) =>
      state.errorByClient[clientId] ?? null,
  },

  actions: {
    async loadExercises(clientId: string) {
      const key = `exercises:${clientId}`
      if (this.pendingByKey[key]) return this.pendingByKey[key]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = oneRepMaxRepo.getLoggedExercises(clientId)
        .then((data) => {
          this.exercisesByClient[clientId] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByKey[key] = null
        })

      this.pendingByKey[key] = promise as unknown as Promise<void>
      return promise
    },

    async loadHistory(clientId: string, exerciseId: string) {
      const key = cacheKey(clientId, exerciseId)
      if (this.pendingByKey[`history:${key}`]) return this.pendingByKey[`history:${key}`]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = oneRepMaxRepo.getOneRepMaxHistory(clientId, exerciseId)
        .then((data) => {
          this.historyByKey[key] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByKey[`history:${key}`] = null
        })

      this.pendingByKey[`history:${key}`] = promise as unknown as Promise<void>
      return promise
    },

    async loadRpeHistory(clientId: string, exerciseId: string) {
      const key = cacheKey(clientId, exerciseId)
      if (this.pendingByKey[`rpe:${key}`]) return this.pendingByKey[`rpe:${key}`]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = oneRepMaxRepo.getRpeHistory(clientId, exerciseId)
        .then((data) => {
          this.rpeByKey[key] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByKey[`rpe:${key}`] = null
        })

      this.pendingByKey[`rpe:${key}`] = promise as unknown as Promise<void>
      return promise
    },

    invalidate(clientId: string) {
      delete this.exercisesByClient[clientId]
      // Clean all keys for this client
      for (const key of Object.keys(this.historyByKey)) {
        if (key.startsWith(`${clientId}|`)) delete this.historyByKey[key]
      }
      for (const key of Object.keys(this.rpeByKey)) {
        if (key.startsWith(`${clientId}|`)) delete this.rpeByKey[key]
      }
      delete this.errorByClient[clientId]
    },

    cleanStore() {
      this.$reset()
    },
  },
})
