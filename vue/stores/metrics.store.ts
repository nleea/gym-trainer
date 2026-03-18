// stores/metrics.store.ts
import { defineStore } from "pinia"
import type { BodyMetricsEntry } from "../types"
import { toJsDate } from "../../lib/utils"
import {
  getMetricsSummary,
  addMetricsEntry,
  updateMetricsEntry,
  deleteMetricsEntry,
  type MetricsSummary,
  type SeriesPoint,
} from "../repo/metricsRepo"

type SeriesPointJs = { date: Date; value: number }

const SUMMARY_FIELDS = ["weightKg", "bodyFatPct", "waistCm", "abdomenCm"] as const
type SummaryField = typeof SUMMARY_FIELDS[number]

function isSummaryField(field: string): field is SummaryField {
  return (SUMMARY_FIELDS as readonly string[]).includes(field)
}

function safeNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Compute delta from raw history (fallback for fields not in the pre-computed summary) */
function computeDeltaFromHistory(rows: BodyMetricsEntry[], field: keyof BodyMetricsEntry) {
  if (!rows.length) return null

  const ordered = rows
    .map(r => ({ r, d: toJsDate(r.date) }))
    .filter(x => !!x.d)
    .sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime())

  const filtered = ordered.filter(x => safeNumber(x.r[field]) != null)
  if (!filtered.length) return null

  const last = filtered[filtered.length - 1]
  const prev = filtered.length > 1 ? filtered[filtered.length - 2] : null

  const lastVal = safeNumber(last.r[field])
  const prevVal = prev ? safeNumber(prev.r[field]) : null

  return {
    lastDate: last.d as Date,
    lastValue: lastVal,
    prevValue: prevVal,
    change: lastVal != null && prevVal != null ? Number((lastVal - prevVal).toFixed(2)) : null,
  }
}

/** Compute series from raw history (fallback for fields not in the pre-computed summary) */
function computeSeriesFromHistory(
  rows: BodyMetricsEntry[],
  field: keyof BodyMetricsEntry,
  limit: number,
): SeriesPointJs[] {
  const pts: SeriesPointJs[] = []
  for (const r of rows) {
    const d = toJsDate(r.date)
    if (!d) continue
    const v = safeNumber(r[field])
    if (v == null) continue
    pts.push({ date: d, value: v })
  }
  pts.sort((a, b) => a.date.getTime() - b.date.getTime())
  return pts.slice(-limit)
}

export const useMetricsStore = defineStore("metrics", {
  state: () => ({
    summaryByClient: {} as Record<string, MetricsSummary | null | undefined>,
    loadingByClient: {} as Record<string, boolean | undefined>,
    errorByClient: {} as Record<string, string | null | undefined>,
    pendingByClient: {} as Record<string, Promise<MetricsSummary | null> | undefined>,
  }),

  getters: {
    getClientMetrics: (s) => (clientId: string): BodyMetricsEntry[] | null =>
      s.summaryByClient[clientId]?.history ?? null,

    /**
     * Delta para una métrica. Para las 4 pre-computadas usa el backend;
     * para el resto calcula desde history.
     */
    getDelta: (s) => (clientId: string, field: keyof BodyMetricsEntry) => {
      const summary = s.summaryByClient[clientId]
      if (!summary) return null

      if (isSummaryField(field as string)) {
        const d = summary.deltas[field as SummaryField]
        if (!d || d.lastValue == null) return null
        return {
          lastDate: null as Date | null,
          lastValue: d.lastValue,
          prevValue: d.lastValue != null && d.change != null ? d.lastValue - d.change : null,
          change: d.change,
        }
      }

      return computeDeltaFromHistory(summary.history ?? [], field)
    },

    /**
     * Serie para gráficas. Para las 4 pre-computadas usa el backend (6 puntos);
     * para el resto calcula desde history.
     */
    getSeries: (s) => (clientId: string, field: keyof BodyMetricsEntry, limit = 24): SeriesPointJs[] => {
      const summary = s.summaryByClient[clientId]
      if (!summary) return []

      if (isSummaryField(field as string)) {
        const pts: SeriesPoint[] = summary.series[field as SummaryField] ?? []
        return pts.map(p => ({ date: new Date(p.date + "T00:00:00"), value: p.value }))
      }

      return computeSeriesFromHistory(summary.history ?? [], field, limit)
    },
  },

  actions: {
    invalidate(clientId: string) {
      this.summaryByClient[clientId] = undefined
      this.errorByClient[clientId] = null
    },

    async loadClientMetrics(clientId: string) {
      if (!clientId) return null

      if (this.summaryByClient[clientId] !== undefined) {
        return this.summaryByClient[clientId] ?? null
      }

      if (this.pendingByClient[clientId]) return this.pendingByClient[clientId]!

      this.loadingByClient[clientId] = true
      this.errorByClient[clientId] = null

      const p = (async () => {
        try {
          const summary = await getMetricsSummary(clientId)
          this.summaryByClient[clientId] = summary
          return summary
        } catch (e: unknown) {
          this.errorByClient[clientId] = e instanceof Error ? e.message : "Error loading metrics"
          this.summaryByClient[clientId] = null
          throw e
        } finally {
          this.loadingByClient[clientId] = false
          this.pendingByClient[clientId] = undefined
        }
      })()

      this.pendingByClient[clientId] = p
      return p
    },

    async addEntry(entry: Omit<BodyMetricsEntry, "id">) {
      const clientId = entry.clientId
      if (!clientId) throw new Error("clientId is required")

      const optimisticId = crypto.randomUUID()
      const optimistic: BodyMetricsEntry = { ...entry, id: optimisticId }

      const summary = this.summaryByClient[clientId]
      if (summary?.history) {
        summary.history.push(optimistic)
        summary.history.sort((a, b) => {
          const da = toJsDate(a.date)?.getTime() ?? 0
          const db = toJsDate(b.date)?.getTime() ?? 0
          return da - db
        })
      }

      try {
        await addMetricsEntry(entry)
        // Invalidate to get fresh summary with updated deltas/series from backend
        this.invalidate(clientId)
      } catch (e) {
        // rollback optimistic update
        if (summary?.history) {
          summary.history = summary.history.filter(x => x.id !== optimisticId)
        }
        throw e
      }
    },

    async updateEntry(clientId: string, entryId: string, updates: Partial<BodyMetricsEntry>) {
      const summary = this.summaryByClient[clientId]
      let prev: BodyMetricsEntry | null = null
      let idx = -1

      if (summary?.history) {
        idx = summary.history.findIndex(r => r.id === entryId)
        if (idx !== -1) {
          prev = { ...summary.history[idx] }
          summary.history[idx] = { ...summary.history[idx], ...updates }
        }
      }

      try {
        await updateMetricsEntry(clientId, entryId, updates)
        this.invalidate(clientId)
      } catch (e) {
        if (summary?.history && idx !== -1 && prev) summary.history[idx] = prev
        throw e
      }
    },

    async removeEntry(clientId: string, entryId: string) {
      const summary = this.summaryByClient[clientId]
      let prevHistory: BodyMetricsEntry[] | null = null

      if (summary?.history) {
        prevHistory = [...summary.history]
        summary.history = summary.history.filter(r => r.id !== entryId)
      }

      try {
        await deleteMetricsEntry(clientId, entryId)
        this.invalidate(clientId)
      } catch (e) {
        if (summary && prevHistory) summary.history = prevHistory
        throw e
      }
    },

    cleanStore() {
      this.summaryByClient = {}
      this.loadingByClient = {}
      this.errorByClient = {}
      this.pendingByClient = {}
    },
  },
})
