import { defineStore } from 'pinia'
import type { TrainerDashboard, DashboardClient } from '../repo/trainerRepo'
import { getTrainerDashboard } from '../repo/trainerRepo'

export const useTrainerStore = defineStore('trainer', {
  state: () => ({
    dashboard: null as TrainerDashboard | null,
    loading: false,
    selectedClientId: null as string | null,
  }),

  getters: {
    clients: (s): DashboardClient[] => s.dashboard?.clients ?? [],
    stats: (s) => s.dashboard?.stats ?? null,
    alertedClients: (s): DashboardClient[] =>
      (s.dashboard?.clients ?? []).filter((c) => c.alerts.length > 0),
  },

  actions: {
    async loadDashboard() {
      this.loading = true
      try {
        this.dashboard = await getTrainerDashboard()
      } finally {
        this.loading = false
      }
    },

    async refreshClient(_clientId: string) {
      await this.loadDashboard()
    },

    cleanStore() {
      this.dashboard = null
      this.loading = false
      this.selectedClientId = null
    },
  },
})
