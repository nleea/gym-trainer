import { defineStore } from 'pinia'
import type { WeeklyCheckin, WeeklyCheckinPayload } from '../repo/checkinRepo'
import {
  createOrUpdateCheckin,
  listCheckins,
  getCurrentCheckin,
  updateCheckin,
} from '../repo/checkinRepo'

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    currentCheckin: null as WeeklyCheckin | null,
    history: [] as WeeklyCheckin[],
    loading: false,
  }),

  actions: {
    async loadCurrentCheckin(clientId?: string) {
      this.loading = true
      try {
        this.currentCheckin = await getCurrentCheckin(clientId)
      } finally {
        this.loading = false
      }
    },

    async loadCheckinHistory(clientId: string) {
      this.loading = true
      try {
        this.history = await listCheckins(clientId)
      } finally {
        this.loading = false
      }
    },

    async upsertCheckin(data: WeeklyCheckinPayload): Promise<WeeklyCheckin> {
      this.loading = true
      try {
        const result = await createOrUpdateCheckin(data)
        this.currentCheckin = result
        const idx = this.history.findIndex((c) => c.weekStart === result.weekStart)
        if (idx >= 0) {
          this.history[idx] = result
        } else {
          this.history.unshift(result)
        }
        return result
      } finally {
        this.loading = false
      }
    },

    async updateCheckinById(
      checkinId: string,
      data: Partial<WeeklyCheckinPayload>,
    ): Promise<WeeklyCheckin> {
      const result = await updateCheckin(checkinId, data)
      this.currentCheckin = result
      const idx = this.history.findIndex((c) => c.id === checkinId)
      if (idx >= 0) this.history[idx] = result
      return result
    },

    cleanStore() {
      this.currentCheckin = null
      this.history = []
      this.loading = false
    },
  },
})
