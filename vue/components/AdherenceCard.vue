<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { volumeMetricsRepo, type AdherenceRate } from '../repo/volumeMetrics.repo'
import { useAttendanceStore } from '../stores/attendance.store'

const props = defineProps<{ clientId: string }>()

const attendanceStore = useAttendanceStore()
const loading = ref(false)
const data = ref<AdherenceRate | null>(null)

async function load() {
  if (!props.clientId) return
  loading.value = true
  try {
    data.value = await volumeMetricsRepo.getAdherenceRate(props.clientId)
  } catch {
    // Fallback: use local attendance store data if backend endpoint doesn't exist yet
    const weeklyRate = attendanceStore.getWeeklyAttendanceRate(props.clientId)
    data.value = {
      training: { weekly: weeklyRate, monthly: weeklyRate },
      nutrition: { weekly: 0, monthly: 0 },
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.clientId, load, { immediate: true })

function pctColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-500'
  if (pct >= 50) return 'text-amber-500'
  return 'text-rose-500'
}

function barColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-rose-400'
}

function barBg(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/15'
  if (pct >= 50) return 'bg-amber-400/15'
  return 'bg-rose-400/15'
}
</script>

<template>
  <div class="rounded-2xl border border-border bg-card p-5 space-y-4">
    <div class="flex items-center gap-2">
      <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h4 class="text-sm font-semibold text-foreground">Adherencia al plan</h4>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>

    <template v-else-if="data">
      <!-- Training adherence -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Entrenamiento</span>
          <div class="flex items-center gap-3 text-xs">
            <span>Sem: <strong :class="pctColor(data.training.weekly)">{{ data.training.weekly }}%</strong></span>
            <span>Mes: <strong :class="pctColor(data.training.monthly)">{{ data.training.monthly }}%</strong></span>
          </div>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full" :class="barBg(data.training.monthly)">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="barColor(data.training.monthly)"
            :style="{ width: `${Math.min(data.training.monthly, 100)}%` }"
          />
        </div>
      </div>

      <!-- Nutrition adherence -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Nutrición</span>
          <div class="flex items-center gap-3 text-xs">
            <span>Sem: <strong :class="pctColor(data.nutrition.weekly)">{{ data.nutrition.weekly }}%</strong></span>
            <span>Mes: <strong :class="pctColor(data.nutrition.monthly)">{{ data.nutrition.monthly }}%</strong></span>
          </div>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full" :class="barBg(data.nutrition.monthly)">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="barColor(data.nutrition.monthly)"
            :style="{ width: `${Math.min(data.nutrition.monthly, 100)}%` }"
          />
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
        <span class="flex items-center gap-1"><span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> ≥80%</span>
        <span class="flex items-center gap-1"><span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" /> 50-79%</span>
        <span class="flex items-center gap-1"><span class="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" /> &lt;50%</span>
      </div>
    </template>

    <!-- No data -->
    <div v-else class="py-3 text-center text-xs text-muted-foreground">
      Sin datos de adherencia
    </div>
  </div>
</template>
