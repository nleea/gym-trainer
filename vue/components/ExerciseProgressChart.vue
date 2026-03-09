<!-- vue/components/ExerciseProgressChart.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
import { toYmdLocal } from '../../lib/utils'
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
} from 'chart.js'
ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale, Filler)

const props = defineProps<{ workoutHistory: any[] }>()

function toJsDate(d: any): Date {
  if (!d) return new Date(0)
  if (d instanceof Date) return d
  if (typeof d?.toDate === 'function') return d.toDate()
  return new Date(d)
}

const exerciseNames = computed(() => {
  const names = new Set<string>()
  for (const w of props.workoutHistory) {
    for (const ex of w.exercises ?? []) {
      if (ex.exerciseName?.trim()) names.add(ex.exerciseName.trim())
    }
  }
  return Array.from(names).sort()
})

const selectedExercise = ref('')

watch(
  exerciseNames,
  (names) => {
    if (names.length && !selectedExercise.value) {
      selectedExercise.value = names[0]
    }
  },
  { immediate: true },
)

type DataPoint = { date: Date; maxWeight: number }

const exerciseData = computed((): DataPoint[] => {
  if (!selectedExercise.value) return []

  const map = new Map<string, DataPoint>()

  for (const w of props.workoutHistory) {
    const d = toJsDate(w.date)
    const key = toYmdLocal(d)

    for (const ex of w.exercises ?? []) {
      if (ex.exerciseName?.trim() !== selectedExercise.value) continue

      let maxW = 0
      for (const set of ex.sets ?? []) {
        maxW = Math.max(maxW, Number(set.weight || 0))
      }

      const existing = map.get(key)
      if (!existing || maxW > existing.maxWeight) {
        map.set(key, { date: d, maxWeight: maxW })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
})

const pr = computed(() => {
  if (!exerciseData.value.length) return null
  return Math.max(...exerciseData.value.map(p => p.maxWeight))
})

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const chartData = computed(() => {
  const data = exerciseData.value
  const labels = data.map(p => fmtDate(p.date))
  const prVal = pr.value

  const datasets: any[] = [
    {
      label: 'Peso máx (kg)',
      data: data.map(p => p.maxWeight),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      tension: 0.35,
      fill: true,
      pointRadius: 3,
      spanGaps: true,
    },
  ]

  if (prVal != null && data.length >= 2) {
    datasets.push({
      label: `PR: ${prVal} kg`,
      data: data.map(() => prVal),
      borderColor: '#f97316',
      borderDash: [6, 3],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    })
  }

  return { labels, datasets }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' as const },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    y: { beginAtZero: false },
    x: { ticks: { maxRotation: 0 } },
  },
}
</script>

<template>
  <div class="rounded-xl border bg-card shadow-sm">
    <div class="border-b p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-foreground">Progreso por ejercicio</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Peso máximo levantado por sesión
          </p>
        </div>

        <select
          v-if="exerciseNames.length"
          v-model="selectedExercise"
          class="rounded-lg border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option v-for="name in exerciseNames" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
    </div>

    <div class="p-6">
      <!-- Sin entrenamientos -->
      <div
        v-if="!exerciseNames.length"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">No hay entrenamientos registrados aún</p>
      </div>

      <!-- Ejercicio sin suficientes datos -->
      <div
        v-else-if="exerciseData.length < 2"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <p class="text-sm text-muted-foreground">
          Se necesitan al menos 2 sesiones con
          <span class="font-medium text-foreground">{{ selectedExercise }}</span>
          para mostrar la gráfica.
        </p>
      </div>

      <!-- Gráfica -->
      <template v-else>
        <div class="h-72">
          <Line :data="chartData" :options="chartOptions" />
        </div>

        <div v-if="pr != null" class="mt-3 flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">PR histórico:</span>
          <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {{ pr }} kg
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
