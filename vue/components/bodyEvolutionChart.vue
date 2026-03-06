<!-- src/components/BodyEvolutionChart.vue -->
<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Line } from "vue-chartjs"
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
} from "chart.js"
import { useMetricsStore } from "@/stores/metrics.store"

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler
)

const props = defineProps<{
  clientId: string
  show?: Array<"weight" | "fat" | "waist" | "abdomen" | "hips" | "chest">
  points?: number
}>()

const metricsStore = useMetricsStore()

type MetricKey = "weight" | "fat" | "waist" | "abdomen" | "hips" | "chest"

const COLORS: Record<MetricKey, string> = {
  weight:  "#3b82f6",
  fat:     "#f97316",
  waist:   "#eab308",
  abdomen: "#a855f7",
  hips:    "#ec4899",
  chest:   "#22c55e",
}

const LABELS: Record<MetricKey, string> = {
  weight:  "Peso (kg)",
  fat:     "% Grasa",
  waist:   "Cintura (cm)",
  abdomen: "Abdomen (cm)",
  hips:    "Cadera (cm)",
  chest:   "Pecho (cm)",
}

const showProp = computed<MetricKey[]>(() => props.show ?? ["weight", "fat", "waist"])

// Toggle state: starts with all visible metrics from prop
const activeMetrics = ref<MetricKey[]>([...showProp.value])
watch(showProp, (v) => { activeMetrics.value = [...v] }, { deep: true })

// Time range selector
type RangeOpt = "1m" | "3m" | "6m" | "all"
const rangeOption = ref<RangeOpt>("all")

const cutoffDate = computed<Date | null>(() => {
  const now = new Date()
  if (rangeOption.value === "1m") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  if (rangeOption.value === "3m") return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  if (rangeOption.value === "6m") return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
  return null
})

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

type SeriesPoint = { date: Date; value: number }

function filterByDate(arr: SeriesPoint[]): SeriesPoint[] {
  const cutoff = cutoffDate.value
  return cutoff ? arr.filter(p => p.date >= cutoff) : arr
}

const clientId = computed(() => props.clientId)

const series = computed(() => {
  const id = props.clientId
  if (!id) return {} as Record<MetricKey, SeriesPoint[]>

  const limit = rangeOption.value === "all" ? (props.points ?? 200) : 200

  return {
    weight:  filterByDate(metricsStore.getSeries(id, "weightKg",   limit)),
    fat:     filterByDate(metricsStore.getSeries(id, "bodyFatPct", limit)),
    waist:   filterByDate(metricsStore.getSeries(id, "waistCm",    limit)),
    abdomen: filterByDate(metricsStore.getSeries(id, "abdomenCm",  limit)),
    hips:    filterByDate(metricsStore.getSeries(id, "hipsCm",     limit)),
    chest:   filterByDate(metricsStore.getSeries(id, "chestCm",    limit)),
  }
})

// Union of all dates across active series
const orderedDates = computed<Date[]>(() => {
  const allDates = new Map<number, Date>()
  const s = series.value as Record<MetricKey, SeriesPoint[]>
  for (const key of showProp.value) {
    for (const p of s[key] ?? []) allDates.set(p.date.getTime(), p.date)
  }
  return Array.from(allDates.values()).sort((a, b) => a.getTime() - b.getTime())
})

const labels = computed(() => orderedDates.value.map(fmtDate))

function alignToLabels(data: SeriesPoint[]): Array<number | null> {
  const map = new Map<number, number>()
  for (const p of data) map.set(p.date.getTime(), p.value)
  return orderedDates.value.map(d => map.has(d.getTime()) ? map.get(d.getTime())! : null)
}

const datasets = computed(() => {
  const s = series.value as Record<MetricKey, SeriesPoint[]>
  const out: any[] = []

  for (const key of showProp.value) {
    if (!activeMetrics.value.includes(key)) continue
    const data = s[key] ?? []
    if (!data.length) continue
    out.push({
      label: LABELS[key],
      data: alignToLabels(data),
      borderColor: COLORS[key],
      backgroundColor: COLORS[key] + "22",
      tension: 0.35,
      fill: false,
      pointRadius: 2,
      spanGaps: true,
    })
  }

  return out
})

const chartData = computed(() => ({
  labels: labels.value,
  datasets: datasets.value,
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { mode: "index" as const, intersect: false },
  },
  interaction: { mode: "index" as const, intersect: false },
  scales: {
    y: { beginAtZero: false },
    x: { ticks: { maxRotation: 0 } },
  },
}))

watch(
  clientId,
  async (id) => {
    if (!id) return
    await metricsStore.loadClientMetrics(id)
  },
  { immediate: true },
)

function toggleMetric(key: MetricKey) {
  const idx = activeMetrics.value.indexOf(key)
  if (idx >= 0) activeMetrics.value.splice(idx, 1)
  else activeMetrics.value.push(key)
}
</script>

<template>
  <div class="rounded-xl border bg-card shadow-sm">
    <div class="border-b p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-foreground">Evolución corporal</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Peso, grasa y perímetros en el tiempo.
          </p>
        </div>

        <!-- Selector de rango temporal -->
        <div class="flex gap-1 rounded-lg border p-1 text-sm self-start">
          <button
            v-for="opt in (['1m', '3m', '6m', 'all'] as const)"
            :key="opt"
            @click="rangeOption = opt"
            class="rounded-md px-2.5 py-1 transition-colors"
            :class="rangeOption === opt ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ opt === 'all' ? 'Todo' : opt === '1m' ? '1 mes' : opt === '3m' ? '3 meses' : '6 meses' }}
          </button>
        </div>
      </div>

      <!-- Toggle chips por métrica -->
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="key in showProp"
          :key="key"
          @click="toggleMetric(key)"
          class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all"
          :style="activeMetrics.includes(key) ? { borderColor: COLORS[key], backgroundColor: COLORS[key] + '22', color: COLORS[key] } : {}"
          :class="activeMetrics.includes(key) ? '' : 'text-muted-foreground opacity-50'"
        >
          <span
            class="h-2 w-2 rounded-full"
            :style="{ backgroundColor: COLORS[key] }"
          />
          {{ LABELS[key] }}
        </button>
      </div>
    </div>

    <div class="p-6">
      <div v-if="datasets.length" class="h-72">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <div v-else class="py-10 text-center text-sm text-muted-foreground">
        No hay suficientes mediciones para graficar todavía.
      </div>
    </div>
  </div>
</template>
