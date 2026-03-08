<template>
  <div class="space-y-5 pb-8 sm:space-y-6">
    <!-- Hero header -->
    <div class="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card px-4 py-6 sm:px-6 sm:py-8">
      <p class="text-xs font-semibold uppercase tracking-widest text-primary">{{ t('client.progress.label') }}</p>
      <h1 class="mt-1 text-2xl font-black text-foreground sm:text-3xl">{{ t('client.progress.title') }}</h1>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('client.progress.subtitle') }}</p>
    </div>

    <!-- Stats cards (full width) -->
    <WorkoutStatsCards
      :total-workouts="totalWorkouts"
      :weekly-workouts="weeklyWorkouts"
      :current-streak="currentStreak"
      :total-hours="totalHours"
      :current-weight="currentWeight"
      :weight-trend="weightTrend"
      :fat-last-value="fatDelta?.lastValue ?? null"
      :waist-last-value="waistDelta?.lastValue ?? null"
    />

    <!-- Volume chart + Heatmap  -->
    <WeeklyVolumeChart :client-id="clientId" />
    <WorkoutHeatmap :client-id="clientId" />

    <!-- Exercise progress chart (full width) -->
    <ExerciseProgressChart :workout-history="workoutHistory" />

    <!-- Exercise list + Body evolution side by side -->
    <div class="grid gap-6 lg:grid-cols-2">
      <ExerciseProgressList :items="exerciseProgress" />

      <bodyEvolutionChart
        :client-id="clientId"
        :show="['abdomen', 'waist', 'fat', 'chest', 'hips']"
        :points="24"
      />
    </div>

    <!-- History (full width) -->
    <WorkoutHistoryList :workout-history="workoutHistory" />

    <!-- Metrics (full width) — includes progress photos tab -->
    <ClientMetricsView :client-id="clientId" />

    <!-- Monthly reports -->
    <ClientReportsSection
      v-if="clientId"
      :client-id="clientId"
      :client-name="user?.name ?? ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import WorkoutStatsCards from '@/components/WorkoutStatsCards.vue'
import WeeklyVolumeChart from '@/components/WeeklyVolumeChart.vue'
import WorkoutHeatmap from '@/components/WorkoutHeatmap.vue'
import ExerciseProgressChart from '@/components/ExerciseProgressChart.vue'
import ExerciseProgressList from '@/components/ExerciseProgressList.vue'
import bodyEvolutionChart from '@/components/bodyEvolutionChart.vue'
import WorkoutHistoryList from '@/components/WorkoutHistoryList.vue'
import ClientMetricsView from './metrictsView.vue'
import ClientReportsSection from '@/components/ClientReportsSection.vue'

import { useAuthStore } from '../../stores/auth'
import { useMetricsStore } from '../../stores/metrics.store'
import { getWorkoutSummary, type WorkoutSummary } from '../../repo/clients'

const authStore = useAuthStore()
const metricsStore = useMetricsStore()
const { user } = storeToRefs(authStore)

const clientId = computed(() => user.value?.client_id || user.value?.uid || '')
const summary = ref<WorkoutSummary | null>(null)
const loadingSummary = ref(false)

watch(
  clientId,
  async (id) => {
    if (!id) return
    loadingSummary.value = true
    try {
      const [s] = await Promise.all([
        getWorkoutSummary(id),
        metricsStore.loadClientMetrics(id),
      ])
      summary.value = s
    } finally {
      loadingSummary.value = false
    }
  },
  { immediate: true },
)

// stats from workout summary
const stats = computed(() => summary.value?.stats)
const totalWorkouts  = computed(() => stats.value?.totalWorkouts  ?? 0)
const weeklyWorkouts = computed(() => stats.value?.weeklyWorkouts ?? 0)
const totalHours     = computed(() => Math.round((stats.value?.totalMinutes ?? 0) / 60))
const currentStreak  = computed(() => stats.value?.currentStreak  ?? 0)

const exerciseProgress = computed(() => summary.value?.exerciseProgress ?? [])
const workoutHistory   = computed(() => summary.value?.workoutHistory   ?? [])

// weight / body metrics from metricsStore
const weightHistory = computed(() => {
  const id = clientId.value
  if (!id) return []
  return metricsStore.getSeries(id, 'weightKg', 12).map(p => ({ date: p.date, weight: p.value }))
})

const currentWeight = computed(() => {
  const wh = weightHistory.value
  return wh.length ? wh[wh.length - 1].weight : null
})

const weightTrend = computed(() => {
  const wh = weightHistory.value
  if (wh.length < 2) return 0
  return Number((wh[wh.length - 1].weight - wh[wh.length - 2].weight).toFixed(1))
})

const fatDelta   = computed(() => clientId.value ? metricsStore.getDelta(clientId.value, 'bodyFatPct') : null)
const waistDelta = computed(() => clientId.value ? metricsStore.getDelta(clientId.value, 'waistCm')    : null)

</script>
