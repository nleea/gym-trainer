import { defineStore } from 'pinia'
import { achievementsRepo } from '../repo/achievements.repo'
import type { Achievement, AchievementsSummary } from '../types/achievement'

interface AchievementsState {
  achievementsByClient: Record<string, Achievement[]>
  summaryByClient: Record<string, AchievementsSummary>
  loadingByClient: Record<string, boolean>
  errorByClient: Record<string, string | null>
  pendingByClient: Record<string, Promise<void> | null>
}

export const useAchievementsStore = defineStore('achievements', {
  state: (): AchievementsState => ({
    achievementsByClient: {},
    summaryByClient: {},
    loadingByClient: {},
    errorByClient: {},
    pendingByClient: {},
  }),

  getters: {
    getAchievements: (state) => (clientId: string) =>
      state.achievementsByClient[clientId] ?? [],

    getSummary: (state) => (clientId: string) =>
      state.summaryByClient[clientId] ?? null,

    isLoading: (state) => (clientId: string) =>
      state.loadingByClient[clientId] ?? false,

    getError: (state) => (clientId: string) =>
      state.errorByClient[clientId] ?? null,
  },

  actions: {
    async loadAchievements(clientId: string) {
      if (this.pendingByClient[`list:${clientId}`]) return this.pendingByClient[`list:${clientId}`]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = achievementsRepo.getAchievements(clientId)
        .then((data) => {
          this.achievementsByClient[clientId] = data
        })
        .catch((e: unknown) => {
          this.errorByClient[clientId] = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loadingByClient[clientId] = false
          this.pendingByClient[`list:${clientId}`] = null
        })

      this.pendingByClient[`list:${clientId}`] = promise as unknown as Promise<void>
      return promise
    },

    async loadSummary(clientId: string) {
      if (this.pendingByClient[`summary:${clientId}`]) return this.pendingByClient[`summary:${clientId}`]

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const promise = achievementsRepo.getAchievementsSummary(clientId)
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

    invalidate(clientId: string) {
      delete this.achievementsByClient[clientId]
      delete this.summaryByClient[clientId]
      delete this.errorByClient[clientId]
    },

    cleanStore() {
      this.$reset()
    },
  },
})
