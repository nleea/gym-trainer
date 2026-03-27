<!-- vue/components/OneRepMaxChart.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
import { useOneRepMaxStore } from '../stores/oneRepMax.store'
import { useI18n } from 'vue-i18n'

ChartJS.register(
  Title, Tooltip, Legend,
  LineElement, LineController, PointElement,
  LinearScale, CategoryScale, Filler,
)

const { t } = useI18n()

const props = defineProps<{ clientId: string }>()
const ormStore = useOneRepMaxStore()

const selectedExerciseId = ref<string>('')

const exercises = computed(() => ormStore.getExercises(props.clientId))
const data = computed(() =>
  selectedExerciseId.value
    ? ormStore.getHistory(props.clientId, selectedExerciseId.value)
    : [],
)
const error = computed(() => ormStore.getError(props.clientId))

async function loadExercises() {
  if (!props.clientId) return
  await ormStore.loadExercises(props.clientId)
  if (exercises.value.length) {
    selectedExerciseId.value = exercises.value[0].exerciseId
  }
}

async function loadChart() {
  if (!props.clientId || !selectedExerciseId.value) return
  await ormStore.loadHistory(props.clientId, selectedExerciseId.value)
}

onMounted(loadExercises)
watch(selectedExerciseId, loadChart)

/** "2024-01-08" → "08 ene" */
function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const hasData = computed(() => data.value.length >= 2)

const best1rm = computed(() => {
  if (!data.value.length) return null
  return Math.max(...data.value.map((p) => p.estimated1rm))
})

const chartData = computed(() => {
  const LINE_COLOR = 'rgba(59,130,246,0.85)'  // blue-500
  const FILL_COLOR = 'rgba(59,130,246,0.08)'
  const POINT_COLOR = 'rgba(59,130,246,1)'

  return {
    labels: data.value.map((p) => fmtDate(p.date)),
    datasets: [
      {
        label: t('client.metrics.strength.estimated1rm'),
        data: data.value.map((p) => p.estimated1rm),
        borderColor: LINE_COLOR,
        backgroundColor: FILL_COLOR,
        pointBackgroundColor: POINT_COLOR,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (item: { raw: unknown }) => {
          const val = Number(item.raw) ?? 0
          return ` ${val.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg`
        },
      },
    },
  },
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    y: {
      beginAtZero: false,
      ticks: {
        callback: (val: string | number) =>
          `${Number(val).toLocaleString('es-ES')} kg`,
      },
    },
    x: { ticks: { maxRotation: 0 } },
  },
}))

const loading = computed(() => ormStore.isLoading(props.clientId))
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="border-b px-6 py-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {{ t('client.metrics.strength.title') }}
          </p>
          <h2 class="mt-1 text-xl font-bold text-foreground">
            {{ t('client.metrics.strength.subtitle') }}
          </h2>
        </div>
        <div v-if="best1rm != null && !loading" class="text-right">
          <p class="text-xs text-muted-foreground uppercase tracking-wider">
            {{ t('client.metrics.strength.best') }}
          </p>
          <p class="mt-0.5 text-2xl font-black tabular-nums text-primary">
            {{ best1rm.toLocaleString('es-ES', { maximumFractionDigits: 1 }) }}<span class="text-sm font-semibold text-muted-foreground"> kg</span>
          </p>
        </div>
      </div>

      <!-- Exercise selector -->
      <div v-if="exercises.length" class="mt-4">
        <select
          v-model="selectedExerciseId"
          class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="" disabled>{{ t('client.metrics.strength.selectExercise') }}</option>
          <option
            v-for="ex in exercises"
            :key="ex.exerciseId"
            :value="ex.exerciseId"
          >
            {{ ex.exerciseName }}
          </option>
        </select>
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

      <!-- No exercises logged -->
      <div v-else-if="!exercises.length" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">{{ t('client.metrics.strength.noExercises') }}</p>
      </div>

      <!-- Not enough data for selected exercise -->
      <div v-else-if="!hasData && selectedExerciseId" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">{{ t('client.metrics.strength.noData') }}</p>
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
