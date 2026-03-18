<template>
  <div class="rounded-2xl border bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <h4 class="text-sm font-semibold text-foreground">Adherencia nutricional</h4>
        <p class="text-xs text-muted-foreground">Últimos 30 días</p>
      </div>
      <div class="text-right">
        <p class="text-xl font-bold text-primary">{{ adherence.percentage }}%</p>
        <p class="text-xs text-muted-foreground">{{ adherence.last_30_days }}/30 días</p>
      </div>
    </div>

    <div class="flex items-end gap-0.5 overflow-hidden" style="height: 60px">
      <div
        v-for="day in history"
        :key="day.date"
        class="flex-1 min-w-0 rounded-t transition-all duration-300"
        :class="barClass(day)"
        :style="{ height: barHeight(day) }"
        :title="`${day.date}: ${day.has_log ? Math.round(day.calories_pct) + '%' : 'sin registro'}`"
      />
    </div>

    <div class="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
      <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> ≥80%</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span> 50-79%</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-rose-400"></span> &lt;50%</span>
      <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-muted"></span> sin registro</span>
    </div>

    <div class="mt-2 flex justify-between text-[10px] text-muted-foreground">
      <span>hace 30 días</span>
      <span>hoy</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyAdherence, Adherence } from '../repo/nutritionRepo'

defineProps<{
  history: DailyAdherence[]
  adherence: Adherence
}>()

function barHeight(day: DailyAdherence) {
  if (!day.has_log) return '8px'
  const h = Math.max(8, (day.calories_pct / 100) * 52)
  return `${h}px`
}

function barClass(day: DailyAdherence) {
  if (!day.has_log) return 'bg-muted/50'
  if (day.calories_pct >= 80) return 'bg-emerald-500'
  if (day.calories_pct >= 50) return 'bg-amber-400'
  return 'bg-rose-400'
}
</script>
