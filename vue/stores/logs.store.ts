// stores/logs.store.ts
import { defineStore } from "pinia"
import type { TrainingLog, MealLog, DailyDiary, ProgressEntry } from "../types"

import {
  listTrainingLogsByClient,
  listTrainingLogsByClientWeek,
  upsertTrainingLog as upsertTrainingLogRepo,
  listTrainingLogsByTrainerWeek,
  type PRItem,
} from "../repo/trainingLogsrepo"

import {
  listMealLogsToday,
  createMealLog,
  listMealLogsByClientRange,
  deleteMealLog,
  listMealLogsByTrainerWeek
} from "../repo/mealsRepo"

import {
  addProgressEntry as addProgressEntryRepo,
  listProgressByClient,
} from "../repo/progressEntry"

import { getWeekRange, parseYmdLocal, toYmdLocal } from "../../lib/utils"

/** ---------- helpers ---------- */
function toJsDate(d: any): Date {
  if (!d) return new Date(0)
  if (d instanceof Date) return d
  if (typeof d?.toDate === "function") return d.toDate()
  return new Date(d)
}
function ymd(d: Date) {
  return toYmdLocal(d)
}

/** cache key por semana (domingo->sábado o lo que use getWeekRange) */
function weekKey(clientId: string, anchorDate = new Date()) {
  const { start } = getWeekRange(anchorDate)
  return `${clientId}|${ymd(start)}`
}

/** deterministic workout id */
function workoutDocId(clientId: string, date: Date) {
  return `workout_${clientId}_${ymd(date)}`
}


export const useLogsStore = defineStore("logs", {
  state: () => ({
    // ✅ ahora cache por semana (key = clientId|startWeek)
    trainingLogsByWeekKey: {} as Record<string, TrainingLog[] | null | undefined>,
    mealsLogsByWeekKey: {} as Record<string, MealLog[] | null | undefined>,
    trainingLogsByWeekKeyTrainer: {} as Record<string, TrainingLog[] | null | undefined>,
    mealsLogsByWeekKeyTrainer: {} as Record<string, MealLog[] | null | undefined>,

    // listas auxiliares (si las usas para UI del día)
    mealLogs: [] as MealLog[],
    dailyDiaries: [] as DailyDiary[],
    trainingLog: [] as DailyDiary[],

    allLogsByClient: {} as Record<string, TrainingLog[] | null | undefined>,
    loadingAllByClient: {} as Record<string, boolean | undefined>,

    progressEntriesByClient: {} as Record<string, ProgressEntry[] | null | undefined>,

    loadingTrainingByWeekKey: {} as Record<string, boolean | undefined>,
    pendingTrainingByWeekKey: {} as Record<string, Promise<TrainingLog[] | null> | undefined>,

    loadingMealsByWeekKey: {} as Record<string, boolean | undefined>,
    pendingMealsByWeekKey: {} as Record<string, Promise<MealLog[] | null> | undefined>,
  }),

  getters: {
    /** compat: devuelve logs de semana actual (por defecto hoy) */
    getClientTrainingLogsCached: (s) => (clientId: string, anchorDate = new Date()) => {
      const k = weekKey(clientId, anchorDate)
      return s.trainingLogsByWeekKey[k] ?? null
    },

    /** compat: meal logs de semana actual */
    getClientMealsWeekCached: (s) => (clientId: string, anchorDate = new Date()) => {
      const k = weekKey(clientId, anchorDate)
      console.log(k)
      return s.mealsLogsByWeekKey[k] ?? null
    },

    getClientMealLogs: (s) => (clientId: string) =>
      s.mealLogs.filter((m) => m.clientId === clientId),

    getClientProgress: (s) => (clientId: string) =>
      s.progressEntriesByClient[clientId] ?? null,

    getAllClientLogs: (s) => (clientId: string) =>
      s.allLogsByClient[clientId] ?? null,
  },

  actions: {
    /** ---------------- Meals week ---------------- */
    async loadMealsLogWeek(clientId: string, anchorDate = new Date()) {
      if (!clientId) return null

      const k = weekKey(clientId, anchorDate)

      if (this.mealsLogsByWeekKey[k] !== undefined) {
        return this.mealsLogsByWeekKey[k] ?? null
      }

      if (this.pendingMealsByWeekKey[k]) {
        return this.pendingMealsByWeekKey[k]!
      }

      this.loadingMealsByWeekKey[k] = true

      const p = (async () => {
        try {
          const { start, end } = getWeekRange(anchorDate)
          const logs = await listMealLogsByClientRange(clientId, start, end)
          this.mealsLogsByWeekKey[k] = logs ?? null
          return logs ?? null
        } finally {
          this.loadingMealsByWeekKey[k] = false
          this.pendingMealsByWeekKey[k] = undefined
        }
      })()

      this.pendingMealsByWeekKey[k] = p
      return p
    },

    invalidateMealsWeek(clientId: string, anchorDate = new Date()) {
      const k = weekKey(clientId, anchorDate)
      this.mealsLogsByWeekKey[k] = undefined
    },

    async loadTodayMeals(clientId: string) {
      this.mealLogs = await listMealLogsToday(clientId)
    },

    async registerMeal(clientId: string, meal: Omit<MealLog, "id">) {
      const d = toJsDate((meal as any).date)
      await createMealLog(meal);
      this.mealLogs.push(meal)
      const k = weekKey(clientId, d)
      const arr = this.mealsLogsByWeekKey[k]
      if (Array.isArray(arr)) arr.push(meal as any)
      else this.mealsLogsByWeekKey[k] = [meal as any]

      return meal
    },

    /**
     * Elimina un registro de comida por su mealKey (que coincide con el id en el backend).
     * En UI se llama como unregisterMeal(clientId, meal.mealKey)
     */
    async unregisterMeal(clientId: string, mealKey: string, anchorDate = new Date()) {
      // si tu docId es mealKey:
      await deleteMealLog(mealKey)

      // limpia del cache de la semana actual y también del día/semana donde esté
      // (por simplicidad: limpia semana actual; si quieres exacto, pasa la fecha)
      const k = weekKey(clientId, anchorDate)
      const arr = this.mealsLogsByWeekKey[k]
      if (Array.isArray(arr)) {
        this.mealsLogsByWeekKey[k] = arr.filter((m: any) => m.mealKey !== mealKey) as any
      }

      // también del listado "today" si está ahí
      this.mealLogs = this.mealLogs.filter((m: any) => m.mealKey !== mealKey)
    },

    /** ---------------- All logs for a client (historial completo) ---------------- */
    async loadAllClientLogs(clientId: string) {
      if (!clientId) return null

      if (this.allLogsByClient[clientId] !== undefined)
        return this.allLogsByClient[clientId] ?? null

      this.loadingAllByClient[clientId] = true
      try {
        const logs = await listTrainingLogsByClient(clientId)
        this.allLogsByClient[clientId] = logs ?? null
        return logs ?? null
      } finally {
        this.loadingAllByClient[clientId] = false
      }
    },

    invalidateAllClientLogs(clientId: string) {
      this.allLogsByClient[clientId] = undefined
    },

    /** ---------------- Training week ---------------- */
    async loadTrainingLogWeek(clientId: string, anchorDate = new Date()) {
      if (!clientId) return null

      const k = weekKey(clientId, anchorDate)

      if (this.trainingLogsByWeekKey[k] !== undefined) {
        return this.trainingLogsByWeekKey[k] ?? null
      }

      if (this.pendingTrainingByWeekKey[k]) {
        return this.pendingTrainingByWeekKey[k]!
      }

      this.loadingTrainingByWeekKey[k] = true

      const p = (async () => {
        try {
          const logs = await listTrainingLogsByClientWeek(clientId, anchorDate)
          this.trainingLogsByWeekKey[k] = logs ?? null
          return logs ?? null
        } finally {
          this.loadingTrainingByWeekKey[k] = false
          this.pendingTrainingByWeekKey[k] = undefined
        }
      })()

      this.pendingTrainingByWeekKey[k] = p
      return p
    },

    async loadTrainingLogWeekByTrainer(trainerId: string, anchorDate = new Date()) {
      if (!trainerId) return null

      const k = weekKey(trainerId, anchorDate)

      if (this.trainingLogsByWeekKeyTrainer[k] !== undefined) {
        return this.trainingLogsByWeekKeyTrainer[k] ?? null
      }

      if (this.pendingTrainingByWeekKey[k]) {
        return this.pendingTrainingByWeekKey[k]!
      }

      this.loadingTrainingByWeekKey[k] = true

      const p = (async () => {
        try {
          const logs = await listTrainingLogsByTrainerWeek(trainerId, anchorDate)
          this.trainingLogsByWeekKeyTrainer[k] = logs ?? null
          return logs ?? null
        }
        finally {
          this.loadingTrainingByWeekKey[k] = false
          this.pendingTrainingByWeekKey[k] = undefined
        }
      })()

      this.pendingTrainingByWeekKey[k] = p
      return p
    },

    async loadMealLogWeekByTrainer(trainerId: string, anchorDate = new Date()) {
      if (!trainerId) return null

      const k = weekKey(trainerId, anchorDate)

      if (this.mealsLogsByWeekKeyTrainer[k] !== undefined) {
        return this.mealsLogsByWeekKeyTrainer[k] ?? null
      }

      if (this.pendingMealsByWeekKey[k]) {
        return this.pendingMealsByWeekKey[k]!
      }

      this.loadingMealsByWeekKey[k] = true

      const p = (async () => {
        try {
          const logs = await listMealLogsByTrainerWeek(trainerId, anchorDate)
          this.mealsLogsByWeekKeyTrainer[k] = logs ?? null
          return logs ?? null
        }
        finally {
          this.loadingMealsByWeekKey[k] = false
          this.pendingMealsByWeekKey[k] = undefined
        }
      })()

      this.pendingMealsByWeekKey[k] = p
      return p
    },

    invalidateTrainingWeek(clientId: string, anchorDate = new Date()) {
      const k = weekKey(clientId, anchorDate)
      this.trainingLogsByWeekKey[k] = undefined
    },

    /**
     * ✅ UPSERT por día (no duplica)
     * Usa POST en el backend que hace create-or-update por client+date.
     * El ID real (UUID) lo asigna el backend y se usa en el cache.
     */
    async upsertTrainingLog(
      log: Omit<TrainingLog, "id"> & { name?: string },
    ): Promise<{ log: TrainingLog; prs: PRItem[] }> {
      const cid = log.clientId;

      const dRaw = (log as any).date;
      const d =
        typeof dRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dRaw)
          ? parseYmdLocal(dRaw)
          : toJsDate(dRaw);

      const deterministicId = workoutDocId(cid, d);
      const wk = weekKey(cid, d);

      // Usa POST → upsert por client+date en el backend. Devuelve { id, prs }.
      const { id: realId, prs } = await upsertTrainingLogRepo(deterministicId, log);

      const merged: TrainingLog = {
        ...(log as any),
        id: realId,
        date: d,
      };

      const current = Array.isArray(this.trainingLogsByWeekKey[wk])
        ? this.trainingLogsByWeekKey[wk]
        : [];

      // Busca por fecha (no por ID determinístico) para no duplicar
      const dStr = ymd(d)
      const idx = current.findIndex((x: any) => ymd(toJsDate(x.date)) === dStr);

      let next: any[];
      if (idx >= 0) {
        next = current.map((x: any, i: number) => (i === idx ? merged : x));
      } else {
        next = [merged, ...current];
      }

      next.sort(
        (a: any, b: any) => toJsDate(b.date).getTime() - toJsDate(a.date).getTime()
      );

      this.trainingLogsByWeekKey[wk] = next;

      // Mantener sincronizado el cache global usado por TrainingView/calendar.
      const allCurrent = Array.isArray(this.allLogsByClient[cid])
        ? this.allLogsByClient[cid]
        : [];
      const allIdx = allCurrent.findIndex(
        (x: any) => ymd(toJsDate(x.date)) === dStr,
      );
      const allNext =
        allIdx >= 0
          ? allCurrent.map((x: any, i: number) => (i === allIdx ? merged : x))
          : [merged, ...allCurrent];

      allNext.sort(
        (a: any, b: any) =>
          toJsDate(b.date).getTime() - toJsDate(a.date).getTime(),
      );
      this.allLogsByClient[cid] = allNext;

      return { log: merged, prs };
    },


    /**
     * Mantengo tu addTrainingLog por compatibilidad,
     * pero internamente hace UPSERT (mejor).
     */
    async addTrainingLog(log: Omit<TrainingLog, "id">) {
      return await this.upsertTrainingLog(log as any)
    },

    /** ---------------- Progress ---------------- */
    async loadProgressEntries(clientId: string) {
      const entries = await listProgressByClient(clientId)
      this.progressEntriesByClient[clientId] = entries ?? null
      return entries
    },

    async addProgressEntry(entry: Omit<ProgressEntry, "id">) {
      const newEntry: ProgressEntry = { ...entry }
      await addProgressEntryRepo(newEntry)

      const cid = entry.clientId
      const existing = this.progressEntriesByClient[cid]
      if (Array.isArray(existing)) existing.unshift(newEntry)
      else this.progressEntriesByClient[cid] = [newEntry]

      return newEntry
    },

    addDailyDiary(diary: Omit<DailyDiary, "id">) {
      const newDiary: DailyDiary = { ...diary, id: crypto.randomUUID() }
      this.dailyDiaries.push(newDiary)
      return newDiary
    },

    cleanStore() {
      this.allLogsByClient = {}
      this.loadingAllByClient = {}
      this.trainingLogsByWeekKey = {}
      this.mealsLogsByWeekKey = {}
      this.trainingLogsByWeekKeyTrainer = {}
      this.mealsLogsByWeekKeyTrainer = {}

      this.mealLogs = []
      this.dailyDiaries = []
      this.progressEntriesByClient = {}

      this.loadingTrainingByWeekKey = {}
      this.pendingTrainingByWeekKey = {}
      this.loadingMealsByWeekKey = {}
      this.pendingMealsByWeekKey = {}
    },
  },
})
