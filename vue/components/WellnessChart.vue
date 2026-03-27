<!-- vue/components/WellnessChart.vue -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
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
} from 'chart.js'
import { useWellnessStore } from '../stores/wellness.store'
import { useI18n } from 'vue-i18n'

ChartJS.register(
  Title, Tooltip, Legend,
  LineElement, LineController, PointElement,
  LinearScale, CategoryScale,
)

const { t } = useI18n()
const props = defineProps<{ clientId: string }>()
const wellnessStore = useWellnessStore()

const data = computed(() => wellnessStore.getHistory(props.clientId))
const loading = computed(() => wellnessStore.isLoading(props.clientId))
const error = computed(() => wellnessStore.getError(props.clientId))

onMounted(() => wellnessStore.loadHistory(props.clientId))

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const hasData = computed(() => data.value.length >= 2)

const chartData = computed(() => ({
  labels: data.value.map((p) => fmtDate(p.date)),
  datasets: [
    {
      label: t('wellness.energy'),
      data: data.value.map((p) => p.energy),
      borderColor: 'rgba(234,179,8,0.85)',
      pointBackgroundColor: 'rgba(234,179,8,1)',
      pointRadius: 3,
      borderWidth: 2,
      tension: 0.3,
    },
    {
      label: t('wellness.sleep'),
      data: data.value.map((p) => p.sleepQuality),
      borderColor: 'rgba(99,102,241,0.85)',
      pointBackgroundColor: 'rgba(99,102,241,1)',
      pointRadius: 3,
      borderWidth: 2,
      tension: 0.3,
    },
    {
      label: t('wellness.fatigue'),
      data: data.value.map((p) => p.muscleFatigue),
      borderColor: 'rgba(239,68,68,0.85)',
      pointBackgroundColor: 'rgba(239,68,68,1)',
      pointRadius: 3,
      borderWidth: 2,
      tension: 0.3,
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
    y: {
      min: 1,
      max: 6,
      ticks: { stepSize: 1 },
    },
    x: { ticks: { maxRotation: 0 } },
  },
}))
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="border-b px-6 py-5">
      <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {{ t('wellness.chartTitle') }}
      </p>
      <h2 class="mt-1 text-xl font-bold text-foreground">
        {{ t('wellness.chartSubtitle') }}
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
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">{{ t('wellness.noData') }}</p>
      </div>

      <template v-else>
        <div class="h-72">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </template>
    </div>
  </div>
</template>
