import { defineStore } from 'pinia'
import { engagementRepo } from '../repo/engagement.repo'
import type { ClientEngagement } from '../repo/engagement.repo'

interface EngagementState {
  engagementList: ClientEngagement[]
  loading: boolean
  error: string | null
  pending: Promise<void> | null
}

export const useEngagementStore = defineStore('engagement', {
  state: (): EngagementState => ({
    engagementList: [],
    loading: false,
    error: null,
    pending: null,
  }),

  getters: {
    getAll: (state) => state.engagementList,

    getAtRisk: (state) => state.engagementList.filter((c) => c.atRisk),

    getByClientId: (state) => (clientId: string) =>
      state.engagementList.find((c) => c.clientId === clientId) ?? null,

    isLoading: (state) => state.loading,

    getError: (state) => state.error,

    atRiskCount: (state) => state.engagementList.filter((c) => c.atRisk).length,
  },

  actions: {
    async loadEngagement() {
      if (this.pending) return this.pending

      this.loading = true
      this.error = null

      const promise = engagementRepo.getEngagement()
        .then((data) => {
          this.engagementList = data
        })
        .catch((e: unknown) => {
          this.error = e instanceof Error ? e.message : 'Error'
        })
        .finally(() => {
          this.loading = false
          this.pending = null
        })

      this.pending = promise as unknown as Promise<void>
      return promise
    },

    invalidate() {
      this.engagementList = []
      this.error = null
    },

    cleanStore() {
      this.$reset()
    },
  },
})
