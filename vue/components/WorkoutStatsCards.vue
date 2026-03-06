<!-- vue/components/WorkoutStatsCards.vue -->
<script setup lang="ts">
defineProps<{
  totalWorkouts: number
  weeklyWorkouts: number
  currentStreak: number
  totalHours: number
  currentWeight: number | null
  weightTrend: number
  fatLastValue: number | null
  waistLastValue: number | null
}>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <!-- Total Entrenamientos -->
    <div class="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Entrenamientos</p>
          <p class="mt-2 text-4xl font-black tabular-nums text-foreground">{{ totalWorkouts }}</p>
          <p class="mt-1 text-xs text-success font-medium">+{{ weeklyWorkouts }} esta semana</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <svg class="h-5 w-5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
          </svg>
        </div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-primary/60 rounded-b-2xl" />
    </div>

    <!-- Peso Actual -->
    <div class="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
      <div class="flex items-start justify-between">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Peso Actual</p>
          <p class="mt-2 text-4xl font-black tabular-nums text-foreground">
            {{ currentWeight != null ? currentWeight : '—' }}<span v-if="currentWeight != null" class="text-xl font-semibold text-muted-foreground"> kg</span>
          </p>
          <p class="mt-1 text-xs font-medium" :class="weightTrend >= 0 ? 'text-success' : 'text-destructive'">
            {{ weightTrend >= 0 ? '+' : '' }}{{ weightTrend }} kg · G:{{ fatLastValue ?? '—' }}% · C:{{ waistLastValue ?? '—' }}cm
          </p>
        </div>
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
          <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M1 12h2m18 0h2M4.22 19.778l.707-.707M18.364 5.636l.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"/>
          </svg>
        </div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/60 rounded-b-2xl" />
    </div>

    <!-- Racha -->
    <div class="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Racha Actual</p>
          <p class="mt-2 text-4xl font-black tabular-nums text-foreground">{{ currentStreak }}</p>
          <p class="mt-1 text-xs text-muted-foreground font-medium">días consecutivos</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
          <svg class="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
          </svg>
        </div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-orange-500/60 rounded-b-2xl" />
    </div>

    <!-- Horas -->
    <div class="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Horas Entrenadas</p>
          <p class="mt-2 text-4xl font-black tabular-nums text-foreground">{{ totalHours }}<span class="text-xl font-semibold text-muted-foreground"> h</span></p>
          <p class="mt-1 text-xs text-muted-foreground font-medium">en total</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
          <svg class="h-5 w-5 text-violet-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-violet-500/60 rounded-b-2xl" />
    </div>
  </div>
</template>
