import { defineStore } from 'pinia'
import {
  getNutritionSummary,
  upsertMealLog,
  deleteMealLogById,
  type NutritionSummary,
  type MealLogUpsertPayload,
} from '../repo/nutritionRepo'
import { toYmdLocal } from '../../lib/utils'

function summaryKey(clientId: string, date: Date) {
  return `${clientId}|${toYmdLocal(date)}`
}

export const useNutritionStore = defineStore('nutrition', {
  state: () => ({
    summaryByKey: {} as Record<string, NutritionSummary | null | undefined>,
    loadingByKey: {} as Record<string, boolean>,
    errorByKey: {} as Record<string, string | null>,
  }),

  getters: {
    getSummary: (s) => (clientId: string, date: Date) => {
      return s.summaryByKey[summaryKey(clientId, date)] ?? null
    },
    isLoading: (s) => (clientId: string, date: Date) => {
      return s.loadingByKey[summaryKey(clientId, date)] ?? false
    },
  },

  actions: {
    async loadSummary(clientId: string, date: Date, force = false) {
      if (!clientId) return null
      const k = summaryKey(clientId, date)
      if (!force && this.summaryByKey[k] !== undefined) return this.summaryByKey[k]

      this.loadingByKey[k] = true
      this.errorByKey[k] = null
      try {
        const data = await getNutritionSummary(clientId, date)
        this.summaryByKey[k] = data
        return data
      } catch (e: any) {
        this.errorByKey[k] = e?.message ?? 'Error'
        this.summaryByKey[k] = null
        return null
      } finally {
        this.loadingByKey[k] = false
      }
    },

    invalidate(clientId: string, date: Date) {
      const k = summaryKey(clientId, date)
      this.summaryByKey[k] = undefined
    },

    async upsertLog(clientId: string, date: Date, payload: MealLogUpsertPayload) {
      const saved = await upsertMealLog(payload)
      this.invalidate(clientId, date)
      await this.loadSummary(clientId, date, true)
      return saved
    },

    async deleteLog(clientId: string, date: Date, logId: string) {
      await deleteMealLogById(logId)
      this.invalidate(clientId, date)
      await this.loadSummary(clientId, date, true)
    },

    cleanStore() {
      this.summaryByKey = {}
      this.loadingByKey = {}
      this.errorByKey = {}
    },
  },
})
