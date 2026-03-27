<!-- vue/components/WorkoutHistoryList.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WorkoutHistoryItem } from '../repo/clients'
import { toYmdLocal } from '../../lib/utils'

const props = defineProps<{
  workoutHistory: WorkoutHistoryItem[]
}>()

type Filter = 'all' | 'week' | 'month'
const historyFilter = ref<Filter>('all')
const expandedWorkouts = ref<string[]>([])
const filterOptions = [{ v: 'all', l: 'Todos' }, { v: 'month', l: 'Mes' }, { v: 'week', l: 'Semana' }]

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return toYmdLocal(x)
}
function startOfMonth(d = new Date()) {
  return toYmdLocal(new Date(d.getFullYear(), d.getMonth(), 1))
}

const filtered = computed(() => {
  const h = props.workoutHistory
  if (historyFilter.value === 'all') return h
  const cutoff = historyFilter.value === 'week' ? startOfWeek() : startOfMonth()
  return h.filter(w => w.date >= cutoff)
})

function toggleExpand(id: string) {
  const i = expandedWorkouts.value.indexOf(id)
  if (i >= 0) expandedWorkouts.value.splice(i, 1)
  else expandedWorkouts.value.push(id)
}


function formatMonthYear(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

function formatDayName(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3)
}

function formatDayNum(iso: string) {
  return new Date(iso + 'T00:00:00').getDate()
}
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="border-b px-6 py-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Historial</p>
          <h2 class="mt-1 text-xl font-bold text-foreground">Entrenamientos</h2>
        </div>
        <div class="flex gap-1 rounded-xl bg-muted p-1">
          <button
            v-for="opt in filterOptions"
            :key="opt.v"
            @click="historyFilter = opt.v as Filter"
            class="rounded-lg px-3 py-1 text-xs font-semibold transition-all"
            :class="historyFilter === opt.v
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
          >{{ opt.l }}</button>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Con datos: timeline layout -->
      <div v-if="filtered.length" class="relative">
        <!-- Timeline line -->
        <div class="absolute left-[2.75rem] top-0 bottom-0 w-px bg-border" />

        <div class="space-y-0">
          <template v-for="(workout, wIdx) in filtered" :key="workout.id || workout.date">
            <!-- Month separator -->
            <div
              v-if="wIdx === 0 || formatMonthYear(workout.date) !== formatMonthYear(filtered[wIdx - 1].date)"
              class="relative mb-3 mt-4 pl-[4.5rem]"
            >
              <span class="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                {{ formatMonthYear(workout.date) }}
              </span>
            </div>

            <!-- Workout row -->
            <div class="relative flex gap-4 pb-4">
              <!-- Date block -->
              <div class="relative z-10 flex w-10 shrink-0 flex-col items-center">
                <div class="flex h-10 w-10 flex-col items-center justify-center rounded-xl border bg-card shadow-sm">
                  <span class="text-[10px] font-semibold uppercase text-muted-foreground leading-none">
                    {{ formatDayName(workout.date) }}
                  </span>
                  <span class="text-base font-black tabular-nums leading-none text-foreground">
                    {{ formatDayNum(workout.date) }}
                  </span>
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div
                  class="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40 cursor-pointer"
                  @click="toggleExpand(workout.id || workout.date)"
                >
                  <!-- Header row -->
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {{ workout.exercises?.length || 0 }} ejercicios
                      </span>
                      <span class="text-xs text-muted-foreground">{{ workout.duration || 0 }} min</span>
                      <span class="text-xs text-muted-foreground">·</span>
                      <span class="text-xs font-semibold text-foreground">{{ workout.volume?.toLocaleString('es-ES') }} kg</span>
                      <span v-if="workout.effort != null" class="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                        RPE {{ workout.effort }}
                      </span>
                    </div>
                    <svg
                      :class="expandedWorkouts.includes(workout.id || workout.date) ? 'rotate-180' : ''"
                      class="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <!-- Exercise name chips -->
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span
                      v-for="(ex, idx) in (workout.exercises || []).slice(0, 5)"
                      :key="ex.exerciseId || idx"
                      class="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                    >{{ ex.exerciseName }}</span>
                    <span
                      v-if="(workout.exercises?.length || 0) > 5"
                      class="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                    >+{{ (workout.exercises?.length || 0) - 5 }} más</span>
                  </div>

                  <!-- Notes -->
                  <div v-if="workout.notes" class="mt-3 rounded-lg bg-background/60 px-3 py-2">
                    <p class="text-xs italic text-muted-foreground">{{ workout.notes }}</p>
                  </div>

                  <!-- Expanded: exercise detail -->
                  <div
                    v-if="expandedWorkouts.includes(workout.id || workout.date)"
                    class="mt-4 space-y-2 border-t pt-4"
                  >
                    <div
                      v-for="(ex, idx) in workout.exercises || []"
                      :key="ex.exerciseId || idx"
                      class="rounded-lg bg-background p-3"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold text-foreground">{{ ex.exerciseName }}</p>
                          <p class="mt-0.5 text-xs text-muted-foreground">
                            {{ ex.sets?.length || 0 }} series · Vol: {{ (ex.sets || []).reduce((s: number, set: any) => s + (set.reps || 0) * (set.weight || 0), 0).toLocaleString('es-ES') }} kg
                          </p>
                        </div>
                        <div class="shrink-0 text-right">
                          <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Máx</p>
                          <p class="text-sm font-black text-foreground">
                            {{ Math.max(0, ...(ex.sets || []).map((s: any) => Number(s.weight || 0))) }}kg
                          </p>
                        </div>
                      </div>

                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span
                          v-for="(set, sidx) in ex.sets || []"
                          :key="sidx"
                          class="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          {{ set.reps || 0 }}×{{ set.weight || 0 }}kg<template v-if="set.rpe != null"> @{{ set.rpe }}</template>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
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
        <p class="text-sm text-muted-foreground">No hay entrenamientos registrados</p>
      </div>
    </div>
  </div>
</template>
