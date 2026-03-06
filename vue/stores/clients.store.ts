// stores/clients.store.ts
import { defineStore } from "pinia"
import type { Client, TrainingPlan, NutritionPlan } from "../types"
import { createClient, listClients, updateClient, getClientById, getClientPlantraining, updateClientPlantraining, getClientNutritionPlan, updateClientNutritionPlan } from "../repo/clients"
import { getTrainingPlanById } from "../repo/training";

type Status = "idle" | "loading" | "error" | "success"

export const useClientsStore = defineStore("clients", {
  state: () => ({
    clients: [] as Client[],
    trainingPlan: null as TrainingPlan | null,
    nutritionplan: null as NutritionPlan | null,
    status: "idle" as Status,
    error: null as string | null,

    // cache por id (evita fetch repetido)
    clientById: {} as Record<string, Client | null | undefined>,
    pendingById: {} as Record<string, Promise<Client | null> | undefined>,
  }),

  getters: {
    activeClients: (s) => s.clients.filter(c => c.status === "active"),
    getClientLocal: (s) => (id: string) => s.clients.find(c => c.id === id) ?? null,
    getClientCached: (s) => (id: string) => s.clientById[id] ?? null,
    getClientPlanTraininggetter: (s) => s.trainingPlan
  },

  actions: {
    async loadClients(trainerId: string) {
      this.status = "loading"
      this.error = null
      try {
        const clientsFromDb = await listClients(trainerId)
        this.clients = clientsFromDb

        // refresca cache
        for (const c of clientsFromDb) {
          if (c.id) this.clientById[c.id] = c
        }

        this.status = "success"
      } catch (e: any) {
        this.status = "error"
        this.error = e?.message ?? "Error loading clients"
        throw e
      }
    },

    async syncData(data: TrainingPlan) {
      this.trainingPlan = data;
    },

    async syncNutritionData(data: NutritionPlan) {
      this.nutritionplan = data;
    },

    async fetchPlanTrining(id: string) {
      if (this.trainingPlan) {
        return this.trainingPlan
      }

      const data = await getTrainingPlanById(id);
      if (!data) return
      this.trainingPlan = data ?? null

      return data
    },

    async fetchNutritionPlan(id: string) {

      if (this.nutritionplan) {
        return this.nutritionplan
      }

      const data = await getClientNutritionPlan(id);
      if (!data) return
      this.nutritionplan = data ?? null

      return data
    },

    async fetchClient(id: string) {
      if (!id) return null

      // cache
      if (this.clientById[id] !== undefined) return this.clientById[id] ?? null

      // dedupe en vuelo
      if (this.pendingById[id]) return this.pendingById[id]!

      const p = (async () => {
        try {
          const local = this.getClientLocal(id)
          if (local) {
            this.clientById[id] = local
            return local
          }
          const remote = await getClientById(id)
          this.clientById[id] = remote ?? null
          return remote ?? null
        } finally {
          this.pendingById[id] = undefined
        }
      })()

      this.pendingById[id] = p
      return p
    },

    async addClient(client: Omit<Client, "id" | "createdAt">) {
      const newClient: Client = { ...client, createdAt: new Date() }
      const id = await createClient(newClient)

      const created = { id, ...newClient }
      this.clients.push(created)
      this.clientById[id] = created
      return created
    },

    async updateClient(id: string, updates: Partial<Client>) {
      const idx = this.clients.findIndex(c => c.id === id)
      const prev = idx !== -1 ? { ...this.clients[idx] } : null

      if (idx !== -1) this.clients[idx] = { ...this.clients[idx], ...updates }
      if (this.clientById[id]) this.clientById[id] = { ...(this.clientById[id] as Client), ...updates }

      try {
        await updateClient(id, updates)
      } catch (e) {
        // rollback
        if (prev && idx !== -1) this.clients[idx] = prev
        if (prev) this.clientById[id] = prev
        throw e
      }
    },

    invalidateClient(id: string) {
      this.clientById[id] = undefined
    },

    async updatePlanTraining(clientId: string, planId: string, updates: Partial<TrainingPlan>) {
      await updateClientPlantraining(clientId, planId, updates)

      if (this.trainingPlan) {
        this.trainingPlan = { ...this.trainingPlan, ...updates }
      }
    },

    async updateNutritionPlan(clientId: string, planId: string, updates: Partial<NutritionPlan>) {
      await updateClientNutritionPlan(clientId, planId, updates)

      if (this.nutritionplan) {
        this.nutritionplan = { ...this.nutritionplan, ...updates }
      }
    }
  },
})
