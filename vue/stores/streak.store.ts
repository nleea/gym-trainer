import { defineStore } from 'pinia'
import { streakRepo } from '../repo/streak.repo'
import type { StreakData } from '../repo/streak.repo'

interface StreakState {
  streakByClient: Record<string, StreakData>
  loadingByClient: Record<string, boolean>
  errorByClient: Record<string, string | null>
  pendingByClient: Record<string, Promise<void> | null>
}

export const useStreakStore = defineStore('streak', {
  state: (): StreakState => ({
    streakByClient: {},
    loadingByClient: {},
    errorByClient: {},
    pendingByClient: {},
  }),

  getters: {
    getStreak: (state) => (clientId: string) =>
      state.streakByClient[clientId] ?? null,

    isLoading: (state) => (clientId: string) =>
      state.loadingByClient[clientId] ?? false,

    getError: (state) => (clientId: string) =>
      state.errorByClient[clientId] ?? null,
  },

  actions: {
    async loadStreak(clientId: string) {
      if (this.pendingByClient[clientId]) return this.pendingByClient[clientId]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = streakRepo.getStreak(clientId)
        .then((data) => {
          this.streakByClient[clientId] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByClient[clientId] = null
        })

      this.pendingByClient[clientId] = promise as unknown as Promise<void>
      return promise
    },

    invalidate(clientId: string) {
      delete this.streakByClient[clientId]
      delete this.errorByClient[clientId]
    },

    cleanStore() {
      this.$reset()
    },
  },
})
