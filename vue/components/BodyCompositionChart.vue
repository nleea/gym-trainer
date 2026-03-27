<!-- vue/components/BodyCompositionChart.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LineController,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
} from 'chart.js'
import { getBodyComposition, type BodyCompositionPoint } from '../repo/metricsRepo'
import { useI18n } from 'vue-i18n'

ChartJS.register(
  Title, Tooltip, Legend,
  LineElement, LineController, PointElement,
  LinearScale, CategoryScale, Filler,
)

const { t } = useI18n()

const props = defineProps<{ clientId: string }>()

const data = ref<BodyCompositionPoint[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (!props.clientId) return
  loading.value = true
  error.value = null
  try {
    data.value = await getBodyComposition(props.clientId)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const hasData = computed(() => data.value.length >= 2)

const latestFat = computed(() => data.value.length ? data.value[data.value.length - 1].bodyFatPct : null)
const latestLean = computed(() => data.value.length ? data.value[data.value.length - 1].leanMassKg : null)

const chartData = computed(() => ({
  labels: data.value.map((p) => fmtDate(p.date)),
  datasets: [
    {
      label: t('client.metrics.bodyComposition.fatPct'),
      data: data.value.map((p) => p.bodyFatPct),
      borderColor: 'rgba(249,115,22,0.85)',  // orange-500
      backgroundColor: 'rgba(249,115,22,0.08)',
      pointBackgroundColor: 'rgba(249,115,22,1)',
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
      tension: 0.3,
      fill: true,
      yAxisID: 'yFat',
    },
    {
      label: t('client.metrics.bodyComposition.leanMass'),
      data: data.value.map((p) => p.leanMassKg),
      borderColor: 'rgba(34,197,94,0.85)',   // green-500
      backgroundColor: 'rgba(34,197,94,0.08)',
      pointBackgroundColor: 'rgba(34,197,94,1)',
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
      tension: 0.3,
      fill: true,
      yAxisID: 'yLean',
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
    },
  },
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    yFat: {
      type: 'linear' as const,
      position: 'left' as const,
      beginAtZero: false,
      ticks: {
        callback: (val: string | number) => `${Number(val).toFixed(1)}%`,
      },
      title: { display: true, text: '% Grasa' },
    },
    yLean: {
      type: 'linear' as const,
      position: 'right' as const,
      beginAtZero: false,
      grid: { drawOnChartArea: false },
      ticks: {
        callback: (val: string | number) => `${Number(val).toFixed(1)} kg`,
      },
      title: { display: true, text: 'Masa magra' },
    },
    x: { ticks: { maxRotation: 0 } },
  },
}))
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="border-b px-6 py-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {{ t('client.metrics.bodyComposition.title') }}
          </p>
          <h2 class="mt-1 text-xl font-bold text-foreground">
            {{ t('client.metrics.bodyComposition.subtitle') }}
          </h2>
        </div>
        <div v-if="latestFat != null && latestLean != null && !loading" class="text-right">
          <div class="flex items-center gap-3">
            <div>
              <p class="text-[10px] text-orange-500 uppercase tracking-wider font-medium">% Grasa</p>
              <p class="text-lg font-black tabular-nums text-foreground">{{ latestFat.toFixed(1) }}%</p>
            </div>
            <div>
              <p class="text-[10px] text-green-500 uppercase tracking-wider font-medium">Magra</p>
              <p class="text-lg font-black tabular-nums text-foreground">{{ latestLean.toFixed(1) }} kg</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
        <p class="text-sm text-destructive">{{ error }}</p>
      </div>

      <!-- No data -->
      <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">{{ t('client.metrics.bodyComposition.noData') }}</p>
        <p class="mt-1 text-xs text-muted-foreground/70">{{ t('client.metrics.bodyComposition.tip') }}</p>
      </div>

      <!-- Chart -->
      <template v-else>
        <div class="h-72">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </template>
    </div>
  </div>
</template>
