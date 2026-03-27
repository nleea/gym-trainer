<!-- vue/components/WellnessVolumeChart.vue -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  LinearScale,
  CategoryScale,
} from 'chart.js'
import { useWellnessStore } from '../stores/wellness.store'
import { useI18n } from 'vue-i18n'

ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, BarController,
  LineElement, LineController, PointElement,
  LinearScale, CategoryScale,
)

const { t } = useI18n()
const props = defineProps<{ clientId: string }>()
const wellnessStore = useWellnessStore()

const data = computed(() => wellnessStore.getCorrelation(props.clientId))
const loading = computed(() => wellnessStore.isLoading(props.clientId))
const error = computed(() => wellnessStore.getError(props.clientId))

onMounted(() => wellnessStore.loadCorrelation(props.clientId))

function fmtWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const hasData = computed(() => data.value.length >= 2)

const chartData = computed(() => ({
  labels: data.value.map((p) => fmtWeek(p.week)),
  datasets: [
    {
      type: 'bar' as const,
      label: t('wellness.volume'),
      data: data.value.map((p) => p.volume),
      backgroundColor: 'rgba(34,197,94,0.6)',
      borderColor: 'rgba(34,197,94,1)',
      borderWidth: 1,
      borderRadius: 4,
      yAxisID: 'yVolume',
      order: 2,
    },
    {
      type: 'line' as const,
      label: t('wellness.avgFatigue'),
      data: data.value.map((p) => p.avgFatigue),
      borderColor: 'rgba(239,68,68,0.85)',
      backgroundColor: 'rgba(239,68,68,0.1)',
      pointBackgroundColor: 'rgba(239,68,68,1)',
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.3,
      yAxisID: 'yFatigue',
      order: 1,
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
    tooltip: { mode: 'index' as const, intersect: false },
  },
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    yVolume: {
      type: 'linear' as const,
      position: 'left' as const,
      beginAtZero: true,
      ticks: {
        callback: (val: string | number) => `${Number(val).toLocaleString('es-ES')} kg`,
      },
      title: { display: true, text: t('wellness.volume') },
    },
    yFatigue: {
      type: 'linear' as const,
      position: 'right' as const,
      min: 1,
      max: 5,
      ticks: { stepSize: 1 },
      grid: { drawOnChartArea: false },
      title: { display: true, text: t('wellness.avgFatigue') },
    },
    x: { ticks: { maxRotation: 0 } },
  },
}))
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="border-b px-6 py-5">
      <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {{ t('wellness.volumeCorrelation') }}
      </p>
      <h2 class="mt-1 text-xl font-bold text-foreground">
        {{ t('wellness.volumeCorrelationSub') }}
      </h2>
    </div>

    <div class="p-6">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
        <p class="text-sm text-destructive">{{ error }}</p>
      </div>

      <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">{{ t('wellness.noData') }}</p>
      </div>

      <template v-else>
        <div class="h-72">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </template>
    </div>
  </div>
</template>
