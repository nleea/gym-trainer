// stores/data.ts
import { defineStore } from "pinia"
import type {
  Client,
  Attendance,
  TrainingPlan,
  NutritionPlan,
  TrainingLog,
  MealLog,
  DailyDiary,
  ProgressEntry,
  AssignedTrainingPlan,
  AssignedNutritionPlan,
  MealType
} from "../types"

import { createClient, listClients, updateClient, getClientById } from "../repo/clients"
import { markAttendance, listAttendance, updateAttendance } from "../repo/attendance"
import {
  createTrainingPlan,
  listTrainingPlans,
  updateTrainingPlan,
  getTrainingPlanById,
  deleteTrainingPlan
} from "../repo/training"
import {
  createNutritionPlan,
  listNutritionPlans,
  updateNutritionPlan,
  getNutritionPlanById
} from "../repo/nutritionPlan"

import {
  createTrainingLog,
  listTrainingLogsByClient,
  listTrainingLogsByClientWeek
} from "../repo/trainingLogsrepo"

import {
  listMealLogsToday,
  createMealLog
} from "../repo/mealsRepo"

import {
  addProgressEntry,
  listProgressByClient
} from "../repo/progressEntry"

import { toJsDate } from "../../lib/utils"

// ⬇️ deja tus generators tal cual (los pegas aquí o los importas)
const generateMockTrainingPlans = (): TrainingPlan[] => [/* ... */]
const generateMockNutritionPlans = (): NutritionPlan[] => [/* ... */]
const generateMockAssignedPlans = () => ({ training: [/*...*/], nutrition: [/*...*/] })
const generateMockTrainingLogs = (): TrainingLog[] => [/* ... */]
const generateMockMealLogs = (): MealLog[] => [/* ... */]
const generateMockDiaries = (): DailyDiary[] => [/* ... */]
const generateMockProgress = (): ProgressEntry[] => [/* ... */]

export const useDataStore = defineStore("data", {
  state: () => ({
    clients: [] as Client[],
    attendance: [] as Attendance[],
    selectedClient: {} as Client,

    trainingPlans: [] as TrainingPlan[],
    nutritionPlans: [] as NutritionPlan[],

    assignedTrainingPlans: generateMockAssignedPlans().training as AssignedTrainingPlan[],
    assignedNutritionPlans: [] as AssignedNutritionPlan[],

    trainingLogs: [] as TrainingLog[],
    mealLogs: [] as MealLog[],
    dailyDiaries: generateMockDiaries(),
    progressEntries: [] as ProgressEntry[],

    // cache para plan por cliente (para resolver tu problema async)
    trainingPlanByClient: {} as Record<string, TrainingPlan | null | undefined>,
    nutritionPlansPlanByClient: {} as Record<string, NutritionPlan | null | undefined>,
    trainingPlanslogByClient: {} as Record<string, TrainingLog[] | null | undefined>,
    loadingTrainingPlan: false,
    trainingPlanError: null as string | null,
  }),

  getters: {
    activeClients: (s) => s.clients.filter(c => c.status === "active"),

    getClient: (s) => {
      return (id: string) => s.clients.find(c => c.id === id)
    },

    attendanceList: (s) => s.attendance,

    trainingPlansList: (s) => s.trainingPlans,
    nutritionPlansList: (s) => s.nutritionPlans,

    getTrainingPlan: (s) => {
      return (id: string) => s.trainingPlans.find(p => p.id === id)
    },


    getNutritionPlan: (s) => {
      return (id: string) => s.nutritionPlans.find(p => p.id === id)
    },

    getClientAttendance: (s) => {
      return (clientId: string) => s.attendance.filter(a => a.clientId === clientId)
    },

    getTodayAttendance: (s) => {
      return () => s.attendance.filter(a => {
        // mismo helper que tenías, pero inline
        const d1 = toJsDate(a.date)
        const d2 = new Date()
        if (!d1) return false
        return d1.getFullYear() === d2.getFullYear()
          && d1.getMonth() === d2.getMonth()
          && d1.getDate() === d2.getDate()
          && a.attended
      })
    },

    getClientNutritionPlan: (s) => {
      return (id: string) => s.nutritionPlansPlanByClient[id] || null
    },

    getClientTrainingLogs: (s) => (clientId: string) =>
      s.trainingLogs.filter(l => l.clientId === clientId),

    getClientMealLogs: (s) => (clientId: string) =>
      s.mealLogs.filter(l => l.clientId === clientId),

    getClientDiaries: (s) => (clientId: string) =>
      s.dailyDiaries.filter(d => d.clientId === clientId),

    getClientProgress: (s) => (clientId: string) =>
      s.progressEntries.filter(p => p.clientId === clientId),

    getWeeklyAttendanceRate: (s) => {
      return (clientId: string) => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        const weekAttendance = s.attendance.filter(
          a => a.clientId === clientId && new Date(a.date as any) >= weekAgo
        )

        if (weekAttendance.length === 0) return 0
        const attended = weekAttendance.filter(a => a.attended).length
        return Math.round((attended / weekAttendance.length) * 100)
      }
    },

    getClientTrainingPlan: (s) => {
      return (clientId: string) => s.trainingPlanByClient[clientId] ?? null
    },
  },

  actions: {

    setSelectedClient(client: Client){
      this.selectedClient = client
    },

    async loadToday(clientId: string) {
      this.mealLogs = await listMealLogsToday(clientId);
    },

    async loadProgressEntries(clientId: string) {
      this.progressEntries = await listProgressByClient(clientId);
    },

    async loadClients(trainerId: string) {
      const clientsFromDb = await listClients(trainerId)
      this.clients = clientsFromDb
    },

    async loadAttendance() {
      const attendanceFromDb = await listAttendance()
      this.attendance = attendanceFromDb
    },

    async loadTrainingPlans() {
      const plansFromDb = await listTrainingPlans()
      this.trainingPlans = plansFromDb
    },

    async loadNutritionsPlans() {
      const plansFromDb = await listNutritionPlans()
      this.nutritionPlans = plansFromDb
    },

    async loadTrainingLog(clientId: string) {
      const logsFromDb = await listTrainingLogsByClientWeek(clientId)
      this.trainingPlanslogByClient[clientId] = logsFromDb
    },

    async addClient(client: Omit<Client, "id" | "createdAt">) {
      const newClient: Client = {
        ...client,
        createdAt: new Date(),
      }

      const id = await createClient(newClient)
      this.clients.push({ id: id, ...newClient })
      return { id, ...newClient }
    },

    updateClient(id: string, updates: Partial<Client>) {
      const index = this.clients.findIndex(c => c.id === id)
      if (index !== -1) {
        this.clients[index] = { ...this.clients[index], ...updates }
      }
      updateClient(id, updates)
    },

    async markAttendance(clientId: string, attended: boolean, notes?: string) {
      const today = new Date()
      const existing = this.attendance.find(
        a => a.clientId === clientId && new Date(a.date as any).toDateString() === today.toDateString()
      )

      if (existing) {
        const prev = { ...existing }
        existing.attended = attended
        existing.notes = notes
        try {
          if (existing.id) {
            await updateAttendance(existing.id, {
              attended: existing.attended,
              notes: existing.notes,
            })
          } else {
            const createdId = await markAttendance({
              clientId,
              date: today,
              attended,
              notes: notes ?? "",
            } as Attendance)
            existing.id = createdId
          }
        } catch (e) {
          Object.assign(existing, prev)
          throw e
        }
      } else {
        const attendanceRecord: Attendance = {
          clientId,
          date: today,
          attended,
          notes: notes ?? "",
        }
        this.attendance.push(attendanceRecord)
        try {
          const createdId = await markAttendance(attendanceRecord)
          attendanceRecord.id = createdId
        } catch (e) {
          this.attendance = this.attendance.filter(a => a !== attendanceRecord)
          throw e
        }
      }
    },

    async addTrainingPlan(plan: Omit<TrainingPlan, "id" | "createdAt" | "updatedAt">) {
      const newPlan: TrainingPlan = {
        ...plan,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTemplate: true,
      }

      const id = await createTrainingPlan("", newPlan)
      newPlan.id = id
      this.trainingPlans.push(newPlan)
      return newPlan
    },

    async updateTrainingPlan(id: string, updates: Partial<TrainingPlan>) {
      const index = this.trainingPlans.findIndex(p => p.id === id)
      if (index !== -1) {
        this.trainingPlans[index] = {
          ...this.trainingPlans[index],
          ...updates,
          updatedAt: new Date()
        }
      }
      await updateTrainingPlan(id, updates)
    },
    async updateNutritionPlan(id: string, updates: Partial<NutritionPlan>) {
      const index = this.nutritionPlans.findIndex(p => p.id === id)
      if (index !== -1) {
        this.nutritionPlans[index] = {
          ...this.nutritionPlans[index],
          ...updates,
          updatedAt: new Date()
        }
      }
      await updateNutritionPlan(id, updates)
    },

    async assignTrainingPlan(planId: string, clientId: string, startDate: Date, endDate: Date) {
      const assignment: AssignedTrainingPlan = {
        id: crypto.randomUUID(),
        planId,
        clientId,
        startDate,
        endDate,
        status: "active",
      }

      await updateClient(clientId, { plan_id: planId })
      this.assignedTrainingPlans.push(assignment)
      return assignment
    },

    async fetchNutritionplan(clientId: string) {
      try {
        if (this.nutritionPlansPlanByClient[clientId] !== undefined) {
          return this.nutritionPlansPlanByClient[clientId] ?? null
        }

        const client = this.getClient(clientId) || await getClientById(clientId)
        const nutritionplanId = client?.nutrition_plan_id || ""

        if (!nutritionplanId) {
          return null
        }

        const plan = await getNutritionPlanById(nutritionplanId);
        this.nutritionPlansPlanByClient[clientId] = plan ?? null

        return plan ?? null
      } catch (error) {
        throw error
      }
    },

    async fetchClientTrainingPlan(clientId: string) {
      if (!clientId) return null

      // cache simple
      if (this.trainingPlanByClient[clientId] !== undefined) {
        return this.trainingPlanByClient[clientId] ?? null
      }

      this.loadingTrainingPlan = true
      this.trainingPlanError = null

      try {
        const client = this.getClient(clientId) || await getClientById(clientId)
        const planId = client?.plan_id || ""

        if (!planId) {
          this.trainingPlanByClient[clientId] = null
          return null
        }

        const plan = await getTrainingPlanById(planId)
        this.trainingPlanByClient[clientId] = plan ?? null
        return plan ?? null
      } catch (e: any) {
        this.trainingPlanError = e?.message ?? "Error loading training plan"
        this.trainingPlanByClient[clientId] = null
        throw e
      } finally {
        this.loadingTrainingPlan = false
      }
    },

    async addnutritionPlan(plan: Partial<NutritionPlan>) {
      const newPlan: NutritionPlan = {
        ...plan,
        days: plan.days || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isTemplate: true,
      }

      const id = await createNutritionPlan("", newPlan)
      newPlan.id = id
      this.nutritionPlans.push(newPlan)
      return newPlan
    },

    async assignNutritionPlan(planId: string, clientId: string, startDate: Date, endDate: Date) {
      const assignment: AssignedNutritionPlan = {
        id: crypto.randomUUID(),
        planId,
        clientId,
        startDate,
        endDate,
        status: "active",
      }
      await updateClient(clientId, { nutrition_plan_id: planId });
      this.assignedNutritionPlans.push(assignment)
      return assignment
    },

    async addTrainingLog(log: Omit<TrainingLog, "id">) {
      const newLog: TrainingLog = { ...log };
      await createTrainingLog(newLog);
      this.trainingLogs.push(newLog)
      return newLog
    },

    async registerMeal(meal: Omit<MealLog, "id">) {
      await createMealLog(meal);
      this.mealLogs.push(meal)
      return meal
    },

    addDailyDiary(diary: Omit<DailyDiary, "id">) {
      const newDiary: DailyDiary = { ...diary, id: crypto.randomUUID() }
      this.dailyDiaries.push(newDiary)
      return newDiary
    },

    async addProgressEntry(entry: Omit<ProgressEntry, "id">) {
      const newEntry: ProgressEntry = { ...entry };
      await addProgressEntry(newEntry);
      this.progressEntries.push(newEntry);
      return newEntry
    },
  },
})
