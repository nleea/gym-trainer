import { defineStore } from 'pinia'
import type {
  TrainerDashboard,
  DashboardClient,
  TrainerReportsResponse,
  ReportPeriod,
} from '../repo/trainerRepo'
import { getTrainerDashboard, getTrainerReports } from '../repo/trainerRepo'

export const useTrainerStore = defineStore('trainer', {
  state: () => ({
    dashboard: null as TrainerDashboard | null,
    reports: null as TrainerReportsResponse | null,
    reportsPeriod: 'week' as ReportPeriod,
    reportsLoading: false,
    loading: false,
    selectedClientId: null as string | null,
  }),

  getters: {
    clients: (s): DashboardClient[] => s.dashboard?.clients ?? [],
    stats: (s) => s.dashboard?.stats ?? null,
    alertedClients: (s): DashboardClient[] =>
      (s.dashboard?.clients ?? []).filter((c) => c.alerts.length > 0),
    reportStats: (s) => s.reports?.stats ?? null,
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

    async loadReports(trainerId: string, period: ReportPeriod = 'week') {
      if (!trainerId) return
      this.reportsLoading = true
      this.reportsPeriod = period
      try {
        this.reports = await getTrainerReports(trainerId, period)
      } finally {
        this.reportsLoading = false
      }
    },

    cleanStore() {
      this.dashboard = null
      this.reports = null
      this.loading = false
      this.reportsLoading = false
      this.selectedClientId = null
    },
  },
})
