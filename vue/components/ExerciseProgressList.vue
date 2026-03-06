<!-- vue/components/ExerciseProgressList.vue -->
<script setup lang="ts">
import type { ExerciseProgressItem } from '../repo/clients'

defineProps<{
  items: ExerciseProgressItem[]
}>()

function formatShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="border-b px-6 py-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Récords</p>
          <h2 class="mt-1 text-xl font-bold text-foreground">Progreso por Ejercicio</h2>
        </div>
        <span class="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          último vs mejor
        </span>
      </div>
    </div>

    <div class="p-6">
      <!-- Con datos -->
      <div v-if="items.length" class="space-y-4">
        <div
          v-for="ex in items.slice(0, 12)"
          :key="ex.exerciseName"
          class="group"
        >
          <div class="flex items-center justify-between gap-3 mb-1.5">
            <p class="truncate text-sm font-semibold text-foreground">{{ ex.exerciseName }}</p>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs text-muted-foreground">{{ formatShortDate(ex.lastDate) }}</span>
              <div
                class="rounded-full px-2 py-0.5 text-xs font-bold"
                :class="ex.trend >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'"
              >
                {{ ex.trend >= 0 ? '▲' : '▼' }} {{ Math.abs(ex.trend) }}kg
              </div>
            </div>
          </div>

          <!-- Progress bar: lastWeight / bestWeight -->
          <div class="relative h-2 rounded-full bg-muted overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              :class="ex.trend >= 0 ? 'bg-success' : 'bg-primary'"
              :style="{ width: `${Math.min(100, ex.bestWeight > 0 ? (ex.lastWeight / ex.bestWeight) * 100 : 0)}%` }"
            />
          </div>

          <div class="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Último: <span class="font-semibold text-foreground">{{ ex.lastWeight }}kg</span></span>
            <span>Mejor: <span class="font-semibold text-foreground">{{ ex.bestWeight }}kg</span></span>
          </div>
        </div>
      </div>

      <!-- Sin datos -->
      <div v-else class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">Aún no hay datos de ejercicios</p>
      </div>
    </div>
  </div>
</template>
