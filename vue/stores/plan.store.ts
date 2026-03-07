// stores/plans.store.ts
import { defineStore } from "pinia"
import type { TrainingPlan, NutritionPlan } from "../types"

import {
  listTrainingPlans,
  updateTrainingPlan,
  getTrainingPlanById,
  createTrainingPlan,
  assignTemplateToClient
} from "../repo/training"

import {
  listNutritionPlans,
  updateNutritionPlan,
  getNutritionPlanById,
  createNutritionPlan,
  assignNutritionTemplateToClient as assignNutritionTemplateToClientRepo
} from "../repo/nutritionPlan"
import { getClientNutritionPlan as getClientNutritionPlanFromClientRepo } from "../repo/clients"

import { useClientsStore } from "./clients.store"

export const usePlansStore = defineStore("plans", {
  state: () => ({
    trainingPlans: [] as TrainingPlan[],
    nutritionPlans: [] as NutritionPlan[],

    trainingPlanByClient: {} as Record<string, TrainingPlan | null | undefined>,
    nutritionPlanByClient: {} as Record<string, NutritionPlan | null | undefined>,

    loadingTrainingPlanByClient: {} as Record<string, boolean | undefined>,
    errorTrainingPlanByClient: {} as Record<string, string | null | undefined>,
    pendingTrainingPlanByClient: {} as Record<string, Promise<TrainingPlan | null> | undefined>,

    loadingNutritionPlanByClient: {} as Record<string, boolean | undefined>,
    errorNutritionPlanByClient: {} as Record<string, string | null | undefined>,
    pendingNutritionPlanByClient: {} as Record<string, Promise<NutritionPlan | null> | undefined>,
  }),

  getters: {
    trainingPlansList: (s) => s.trainingPlans,
    nutritionPlansList: (s) => s.nutritionPlans,

    getTrainingPlanLocal: (s) => (id: string) =>
      s.trainingPlans.find(p => p.id === id) ?? null,

    getNutritionPlanLocal: (s) => (id: string) =>
      s.nutritionPlans.find(p => p.id === id) ?? null,

    getClientTrainingPlan: (s) => (clientId: string) =>
      s.trainingPlanByClient[clientId] ?? null,

    getClientNutritionPlan: (s) => (clientId: string) =>
      s.nutritionPlanByClient[clientId] ?? null,
  },

  actions: {
    async loadTrainingPlans() {
      this.trainingPlans = await listTrainingPlans()
    },

    async loadNutritionPlans() {
      this.nutritionPlans = await listNutritionPlans()
    },

    invalidateClientTrainingPlan(clientId: string) {
      this.trainingPlanByClient[clientId] = undefined
      this.errorTrainingPlanByClient[clientId] = null
    },

    invalidateClientNutritionPlan(clientId: string) {
      this.nutritionPlanByClient[clientId] = undefined
      this.errorNutritionPlanByClient[clientId] = null
    },

    async fetchClientTrainingPlan(clientId: string, planId: string) {
      if (!planId) {
            this.trainingPlanByClient[clientId] = null
            return null
      }

      const plan = await getTrainingPlanById(planId)
      this.trainingPlanByClient[clientId] = plan ?? null
      return plan ?? null

    },

    async fetchClientNutritionPlan(clientId: string, nutritionPlan: string) {
      if (!clientId) return null

      if (
        this.nutritionPlanByClient[clientId] !== undefined &&
        this.nutritionPlanByClient[clientId]?.id === nutritionPlan
      ) {
        return this.nutritionPlanByClient[clientId] ?? null
      }

      try {
          if (!nutritionPlan) {
            const planFromClient = await getClientNutritionPlanFromClientRepo(clientId)
            this.nutritionPlanByClient[clientId] = planFromClient ?? null
            return planFromClient ?? null
          }

          const plan = await getNutritionPlanById(nutritionPlan)
          this.nutritionPlanByClient[clientId] = plan ?? null
          return plan ?? null
        } catch (e: any) {
          this.errorNutritionPlanByClient[clientId] = e?.message ?? "Error loading nutrition plan"
          this.nutritionPlanByClient[clientId] = null
          throw e
        } finally {
          this.loadingNutritionPlanByClient[clientId] = false
          this.pendingNutritionPlanByClient[clientId] = undefined
        }
    },

    // --- Updates ---

    async updateTrainingPlan(id: string, updates: Partial<TrainingPlan>) {
      const idx = this.trainingPlans.findIndex(p => p.id === id)
      const prev = idx !== -1 ? { ...this.trainingPlans[idx] } : null

      if (idx !== -1) {
        this.trainingPlans[idx] = { ...this.trainingPlans[idx], ...updates, updatedAt: new Date() }
      }

      try {
        await updateTrainingPlan(id, updates)
      } catch (e) {
        if (prev && idx !== -1) this.trainingPlans[idx] = prev
        throw e
      }
    },

    async updateNutritionPlan(id: string, updates: Partial<NutritionPlan>) {
      const idx = this.nutritionPlans.findIndex(p => p.id === id)
      const prev = idx !== -1 ? { ...this.nutritionPlans[idx] } : null

      if (idx !== -1) {
        this.nutritionPlans[idx] = { ...this.nutritionPlans[idx], ...updates, updatedAt: new Date() }
      }

      try {
        await updateNutritionPlan(id, updates)
      } catch (e) {
        if (prev && idx !== -1) this.nutritionPlans[idx] = prev
        throw e
      }
    },

    async addTrainingPlan(plan: Omit<TrainingPlan, "id" | "createdAt" | "updatedAt">) {
      const newPlan: TrainingPlan = { ...plan, createdAt: new Date(), updatedAt: new Date() }
      await createTrainingPlan("", newPlan)
      this.trainingPlans.push(newPlan)
      return newPlan
    },

    async addNutritionPlan(plan: Omit<NutritionPlan, "id" | "createdAt" | "updatedAt">) {
      const newPlan: NutritionPlan = { ...plan, createdAt: new Date(), updatedAt: new Date() }
      await createNutritionPlan("", newPlan)
      this.nutritionPlans.push(newPlan)
      return newPlan
    },

    async assignTemplateToClient(template: string, clientId: string, startDate: string, durationWeeks: number, uid: string) {
      return await assignTemplateToClient(template, clientId, startDate, durationWeeks, uid)
    },

    async assignNutritionTemplateToClient(template: string, clientId: string, startDate: string, durationWeeks: number, uid: string) {
      return await assignNutritionTemplateToClientRepo(template, clientId, startDate, durationWeeks, uid)
    },

    cleanStore() {
      this.trainingPlans = [];
      this.nutritionPlans = [] as NutritionPlan[];
      this.trainingPlanByClient = {} as Record<string, TrainingPlan | null | undefined>;
      this.nutritionPlanByClient = {} as Record<string, NutritionPlan | null | undefined>;
    }
  },



})
