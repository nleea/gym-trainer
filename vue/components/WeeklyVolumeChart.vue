<!-- vue/components/WeeklyVolumeChart.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  LinearScale,
  CategoryScale,
} from 'chart.js'
import { api } from '../api'
import { toYmdLocal } from '../../lib/utils'

ChartJS.register(Title, Tooltip, Legend, BarElement, BarController, LinearScale, CategoryScale)

const props = defineProps<{ clientId: string }>()

type WeekPoint = { week: string; volume: number }

const data = ref<WeekPoint[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (!props.clientId) return
  loading.value = true
  error.value = null
  try {
    data.value = await api.get<WeekPoint[]>(`/clients/${props.clientId}/weekly-volume`)
  } catch (e: any) {
    error.value = e?.message ?? 'Error al cargar el volumen semanal'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** "2024-01-08" → "08 ene" */
function fmtWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

/** Lunes de la semana actual en ISO */
function currentWeekMonday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Dom
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toYmdLocal(d)
}

const thisWeek = currentWeekMonday()

const hasData = computed(() => data.value.some(p => p.volume > 0))

const chartData = computed(() => {
  const PRIMARY   = 'rgba(34,197,94,0.85)'   // verde – semanas pasadas
  const CURRENT   = 'rgba(234,179,8,0.9)'    // amarillo – semana actual
  const PRIMARY_B = 'rgba(34,197,94,1)'
  const CURRENT_B = 'rgba(234,179,8,1)'

  const labels = data.value.map(p => fmtWeek(p.week))
  const volumes = data.value.map(p => p.volume)
  const bgColors = data.value.map(p => p.week === thisWeek ? CURRENT   : PRIMARY)
  const bdColors = data.value.map(p => p.week === thisWeek ? CURRENT_B : PRIMARY_B)

  return {
    labels,
    datasets: [
      {
        label: 'Volumen (kg)',
        data: volumes,
        backgroundColor: bgColors,
        borderColor: bdColors,
        borderWidth: 1.5,
        borderRadius: 4,
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
        title: (items: any[]) => {
          const idx = items[0]?.dataIndex ?? -1
          const point = data.value[idx]
          if (!point) return ''
          const label = fmtWeek(point.week)
          return point.week === thisWeek ? `${label} (semana en curso)` : label
        },
        label: (item: any) => {
          const val: number = item.raw ?? 0
          return ` ${val.toLocaleString('es-ES')} kg`
        },
      },
    },
  },
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (val: any) => `${Number(val).toLocaleString('es-ES')} kg`,
      },
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
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Volumen Semanal</p>
          <h2 class="mt-1 text-xl font-bold text-foreground">Últimas 12 semanas</h2>
        </div>
        <div v-if="hasData && !loading" class="text-right">
          <p class="text-xs text-muted-foreground uppercase tracking-wider">Total período</p>
          <p class="mt-0.5 text-2xl font-black tabular-nums text-primary">
            {{ data.reduce((s, p) => s + p.volume, 0).toLocaleString('es-ES') }}<span class="text-sm font-semibold text-muted-foreground"> kg</span>
          </p>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Cargando -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
        <p class="text-sm text-destructive">{{ error }}</p>
      </div>

      <!-- Sin datos -->
      <div v-else-if="!hasData" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">No hay entrenamientos registrados aún</p>
      </div>

      <!-- Gráfica -->
      <template v-else>
        <div class="h-72">
          <Bar :data="chartData" :options="chartOptions" />
        </div>

        <div class="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded-sm bg-success/85" />
            Semanas anteriores
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-3 w-3 rounded-sm bg-warning/90" />
            Semana en curso
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
