<!-- vue/views/client/TrainingView.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { isSameDay, format, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
} from '@headlessui/vue';

import { useAuthStore } from '../../stores/auth';
import { usePlansStore } from '../../stores/plan.store';
import { useLogsStore } from '../../stores/logs.store';
import { toJsDate, isSameLocalDay } from '../../../lib/utils';
import { getActiveWeekIndexFromAssignedAt } from '../../../lib/helpers';

import TaskCalendar from '../../components/taskCalendar.vue';
import PhotoTimeline from '@/components/photos/PhotoTimeline.vue'

import type { TrainingLog } from '../../types';

type DayStatus = 'completed' | 'planned' | 'rest' | 'empty';
type NutritionStatus = 'completed' | 'planned' | 'empty';
type PanelView = 'workout' | 'nutrition';
type OpenDayPayload = {
  date: Date;
  viewType: 'workouts' | 'meals';
  taskType?: 'workout' | 'nutrition' | 'rest' | 'checkup';
};

// Sun=0 Mon=1 ... Sat=6, matching getDay()
const DAY_KEYS = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const;

const router = useRouter();
const authStore = useAuthStore();
const plansStore = usePlansStore();
const logsStore = useLogsStore();

const { user } = storeToRefs(authStore);
const clientId = computed(() => user.value?.client_id || user.value?.uid || '');
const planId = computed(() => user.value?.plan || user.value?.uid || '');

// ── Plan ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const trainingPlan = computed(() =>
  plansStore.getClientTrainingPlan(clientId.value),
);

function planAssignedAt(): Date | null {
  const sd = (trainingPlan.value as any)?.startDate;
  if (!sd) return null;
  if (typeof sd?.toDate === 'function') return sd.toDate();
  if (sd instanceof Date) return sd;
  return new Date(sd);
}

function weekForDate(date: Date) {
  const plan = trainingPlan.value;
  if (!plan?.weeks?.length) return null;
  const assignedAt = planAssignedAt();
  if (!assignedAt) return plan.weeks[0] ?? null;
  const weekNum = getActiveWeekIndexFromAssignedAt(
    date,
    assignedAt,
    plan.weeks.length,
  );
  return (
    plan.weeks.find((w: any) => Number(w.weekNumber) === weekNum) ??
    plan.weeks[0] ??
    null
  );
}

function planDayFor(date: Date) {
  const week = weekForDate(date);
  const key = DAY_KEYS[getDay(date)];
  return week?.days?.find((d: any) => d.day === key) ?? null;
}

function planExercisesForDate(date: Date): any[] {
  return planDayFor(date)?.exercises ?? [];
}

// ── Nutrition plan ────────────────────────────────────────────────────────
const nutritionPlan = computed(() =>
  plansStore.getClientNutritionPlan(clientId.value),
);

function mealsForDate(date: Date): any[] {
  const plan = nutritionPlan.value;
  if (!plan) return [];
  const key = DAY_KEYS[getDay(date)];
  // flat days structure (weekly cycle)
  const day = plan.days?.find((d: any) => d.day === key);
  return day?.meals ?? [];
}

// ── Logs ──────────────────────────────────────────────────────────────────
const allLogs = computed(
  () => (logsStore.getAllClientLogs(clientId.value) ?? []) as TrainingLog[],
);

function logForDate(date: Date): TrainingLog | null {
  return (
    allLogs.value.find((l) => {
      const ld = toJsDate((l as any).date);
      return ld ? isSameLocalDay(ld, date) : false;
    }) ?? null
  );
}

// ── Day status ─────────────────────────────────────────────────────────────
function dayStatusFor(date: Date): DayStatus {
  if (logForDate(date)) return 'completed';
  if (!trainingPlan.value) return 'empty';
  const day = planDayFor(date);
  if (!day || !day.exercises?.length) return 'rest';
  return 'planned';
}

// ── Detail panel ──────────────────────────────────────────────────────────
const isPanelOpen = ref(false);
const selectedDate = ref<Date>(new Date());
const today = new Date();
const panelView = ref<PanelView>('workout');

function openPanel(payload: OpenDayPayload) {
  selectedDate.value = new Date(payload.date);
  panelView.value =
    payload.taskType === 'nutrition' || payload.viewType === 'meals'
      ? 'nutrition'
      : 'workout';
  isPanelOpen.value = true;
}
function closePanel() {
  isPanelOpen.value = false;
}

const selectedWorkoutStatus = computed(() => dayStatusFor(selectedDate.value));
const selectedExercises = computed(() =>
  planExercisesForDate(selectedDate.value),
);
const selectedLog = computed(() => logForDate(selectedDate.value));
const isSelectedToday = computed(() => isSameDay(selectedDate.value, today));
const selectedMeals = computed(() => mealsForDate(selectedDate.value));
const selectedMealLogs = computed(() => {
  const weekLogs =
    logsStore.getClientMealsWeekCached(clientId.value, selectedDate.value) ?? [];
  return weekLogs.filter((log: any) => {
    const logDate = toJsDate(log.date);
    return logDate ? isSameLocalDay(logDate, selectedDate.value) : false;
  });
});
const selectedLoggedMealTypes = computed(
  () => new Set(selectedMealLogs.value.map((log: any) => log.type)),
);
const selectedMealsDetailed = computed(() =>
  selectedMeals.value.map((meal: any) => ({
    ...meal,
    registered: selectedLoggedMealTypes.value.has(meal.type),
  })),
);
const selectedNutritionStatus = computed<NutritionStatus>(() => {
  if (!selectedMeals.value.length) return 'empty';
  const completed = selectedMealsDetailed.value.filter((meal: any) => meal.registered)
    .length;
  return completed >= selectedMeals.value.length ? 'completed' : 'planned';
});
const selectedStatus = computed(() =>
  panelView.value === 'nutrition'
    ? selectedNutritionStatus.value
    : selectedWorkoutStatus.value,
);

const selectedLogStats = computed(() => {
  const log = selectedLog.value;

  if (!log) return null;
  const exs = log.exercises ?? [];
  const volume = exs.reduce(
    (sum, ex: any) =>
      sum +
      (ex.sets ?? []).reduce(
        (s: number, set: any) => s + (set.reps ?? 0) * (set.weight ?? 0),
        0,
      ),
    0,
  );
  const totalSets = exs.reduce((s, ex: any) => s + (ex.sets?.length ?? 0), 0);
  const completedSets = exs.reduce(
    (s, ex: any) =>
      s + (ex.sets ?? []).filter((set: any) => set.completed).length,
    0,
  );
  const maxWeight = Math.max(
    0,
    ...exs.flatMap((ex: any) =>
      (ex.sets ?? []).map((set: any) => Number(set.weight ?? 0)),
    ),
  );
  return {
    volume,
    totalSets,
    completedSets,
    maxWeight,
    exercises: exs.length,
    effort: (log as any).effort,
    duration: (log as any).duration,
  };
});

// ── Navigate to daily log ─────────────────────────────────────────────────
function goToLog() {
  closePanel();
  router.push('/client/daily-log');
}

function goToNutrition() {
  closePanel();
  router.push('/client/nutrition');
}

// ── Format helpers ────────────────────────────────────────────────────────
function fmtDayAbbr(d: Date) {
  return format(d, 'EEE', { locale: es }).toUpperCase().slice(0, 3);
}
function fmtFullDate(d: Date) {
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

// ── Load data ─────────────────────────────────────────────────────────────
watch(
  [clientId, planId],
  async ([id, pId]) => {
    if (!id) return;
    loading.value = true;
    try {
      await Promise.all([
        plansStore.fetchClientTrainingPlan(id, pId),
        plansStore.fetchClientNutritionPlan(id),
        logsStore.loadAllClientLogs(id),
        logsStore.loadMealsLogWeek(id, new Date()),
      ]);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

watch(
  [clientId, selectedDate],
  async ([id, day]) => {
    if (!id) return;
    await logsStore.loadMealsLogWeek(id, day);
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <!-- ── Header ───────────────────────────────────────────────────────── -->
    <div class="mb-5">
      <p class="text-xs font-semibold uppercase tracking-widest text-primary">
        {{ t('client.training.title') }}
      </p>
      <h1 class="mt-0.5 text-xl font-black text-foreground sm:text-2xl">
        {{ t('client.training.myTraining') }}
      </h1>
      <p
        v-if="trainingPlan"
        class="mt-0.5 truncate text-sm text-muted-foreground"
      >
        {{ trainingPlan.name }}
      </p>
    </div>

    <!-- ── Loading ─────────────────────────────────────────────────────── -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
      />
    </div>

    <!-- ── No plan ──────────────────────────────────────────────────────── -->
    <div
      v-else-if="!trainingPlan"
      class="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center shadow-sm"
    >
      <div
        class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"
      >
        <svg
          class="h-8 w-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-foreground">{{ t('client.training.noPlan') }}</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ t('client.training.contactTrainer') }}
      </p>
    </div>

    <!-- ── Calendar ─────────────────────────────────────────────────────── -->
    <TaskCalendar
      v-else
      :day-status="dayStatusFor"
      :exercises="planExercisesForDate"
      :log="logForDate"
      :meals-for-date="nutritionPlan ? mealsForDate : undefined"
      @open-day="openPanel"
    />

    <!-- Training photos -->
    <PhotoTimeline
      v-if="clientId"
      :client-id="clientId"
      type="training"
      :can-upload="true"
    />
  </div>

  <!-- ── Detail drawer ───────────────────────────────────────────────────── -->
  <TransitionRoot :show="isPanelOpen" as="template">
    <Dialog @close="closePanel" class="relative z-50">
      <!-- Backdrop -->
      <TransitionChild
        as="template"
        enter="transition-opacity duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="transition-opacity duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      </TransitionChild>

      <!-- Panel -->
      <TransitionChild
        as="template"
        enter="transition ease-out duration-300 transform"
        enter-from="translate-x-full"
        enter-to="translate-x-0"
        leave="transition ease-in duration-200 transform"
        leave-from="translate-x-0"
        leave-to="translate-x-full"
      >
        <DialogPanel
          class="fixed inset-y-0 right-0 flex w-full max-w-md flex-col overflow-hidden bg-card shadow-2xl"
        >
          <!-- Panel header -->
          <div
            class="flex shrink-0 items-start justify-between border-b px-5 py-4"
          >
            <div class="min-w-0">
              <p
                class="truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                {{ fmtDayAbbr(selectedDate) }}
              </p>
              <h2
                class="mt-0.5 truncate text-lg font-black capitalize text-foreground"
              >
                {{ fmtFullDate(selectedDate) }}
              </h2>
            </div>

            <div class="ml-3 flex shrink-0 items-center gap-2">
              <!-- Status badge -->
              <span
                class="rounded-full px-2.5 py-1 text-xs font-bold"
                :class="{
                  'bg-success/10 text-success': selectedStatus === 'completed',
                  'bg-primary/10 text-primary': selectedStatus === 'planned',
                  'bg-muted text-muted-foreground':
                    selectedStatus === 'rest' || selectedStatus === 'empty',
                }"
              >
                {{
                  selectedStatus === 'completed'
                    ? '✓ Completado'
                    : selectedStatus === 'planned'
                      ? panelView === 'nutrition'
                        ? '🥗 En progreso'
                        : '💪 Planificado'
                      : panelView === 'nutrition'
                        ? 'Sin comidas planificadas'
                        : selectedStatus === 'rest'
                          ? '😴 Descanso'
                          : 'Sin plan'
                }}
              </span>

              <!-- Close button -->
              <button
                @click="closePanel"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Panel body (scrollable) -->
          <div class="flex-1 overflow-y-auto">
            <template v-if="panelView === 'workout'">
            <!-- Rest / Empty state -->
            <div
              v-if="selectedStatus === 'rest' || selectedStatus === 'empty'"
              class="flex flex-col items-center justify-center py-16 text-center"
            >
              <span class="text-5xl">{{
                selectedStatus === 'rest' ? '😴' : '📅'
              }}</span>
              <p class="mt-4 text-base font-semibold text-foreground">
                {{
                  selectedStatus === 'rest'
                    ? 'Día de descanso'
                    : 'Sin plan para este día'
                }}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{
                  selectedStatus === 'rest'
                    ? 'Aprovecha para movilidad o un paseo suave'
                    : 'No hay ejercicios programados'
                }}
              </p>
            </div>

            <!-- Planned / Completed exercises -->
            <div v-else class="divide-y">
              <!-- Exercises from plan -->
              <div class="px-5 py-4">
                <p
                  class="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {{ t('client.training.exercises') }}
                </p>

                <div class="space-y-3">
                  <div
                    v-for="(ex, idx) in selectedExercises"
                    :key="ex.id ?? idx"
                    class="rounded-xl border p-4"
                    :class="
                      selectedStatus === 'completed'
                        ? 'bg-success/5 border-success/20'
                        : 'bg-muted/20'
                    "
                  >
                    <div class="flex items-start gap-3">
                      <div
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                        :class="
                          selectedStatus === 'completed'
                            ? 'bg-success/20 text-success'
                            : 'bg-primary/15 text-primary'
                        "
                      >
                        {{ idx + 1 }}
                      </div>

                      <div class="flex-1 min-w-0">
                        <p class="font-semibold text-foreground">
                          {{ ex.name }}
                        </p>
                        <div class="mt-1.5 flex flex-wrap gap-2">
                          <span
                            class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            {{ ex.sets }} series × {{ ex.reps }} reps
                          </span>
                          <span
                            v-if="ex.weight"
                            class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            {{ ex.weight }}kg sugerido
                          </span>
                          <span
                            v-if="ex.rest"
                            class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            Descanso: {{ ex.rest }}s
                          </span>
                          <span
                            v-if="ex.muscleGroup"
                            class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {{ ex.muscleGroup }}
                          </span>
                        </div>
                        <p
                          v-if="ex.notes"
                          class="mt-2 text-xs italic text-muted-foreground"
                        >
                          "{{ ex.notes }}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Logged session summary (if completed) -->
              <div
                v-if="selectedStatus === 'completed' && selectedLogStats"
                class="px-5 py-4"
              >
                <p
                  class="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {{ t('client.training.sessionLogged') }}
                </p>

                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-xl bg-muted/30 p-3 text-center">
                    <p
                      class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {{ t('client.training.volume') }}
                    </p>
                    <p
                      class="mt-1 text-xl font-black tabular-nums text-foreground"
                    >
                      {{ selectedLogStats.volume.toLocaleString('es-ES')
                      }}<span
                        class="text-xs font-semibold text-muted-foreground"
                      >
                        kg</span
                      >
                    </p>
                  </div>
                  <div class="rounded-xl bg-muted/30 p-3 text-center">
                    <p
                      class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {{ t('client.training.maxWeight') }}
                    </p>
                    <p
                      class="mt-1 text-xl font-black tabular-nums text-foreground"
                    >
                      {{ selectedLogStats.maxWeight
                      }}<span
                        class="text-xs font-semibold text-muted-foreground"
                      >
                        kg</span
                      >
                    </p>
                  </div>
                  <div class="rounded-xl bg-muted/30 p-3 text-center">
                    <p
                      class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {{ t('client.training.sets') }}
                    </p>
                    <p
                      class="mt-1 text-xl font-black tabular-nums text-foreground"
                    >
                      {{ selectedLogStats.completedSets
                      }}<span
                        class="text-xs font-semibold text-muted-foreground"
                        >/{{ selectedLogStats.totalSets }}</span
                      >
                    </p>
                  </div>
                  <div class="rounded-xl bg-muted/30 p-3 text-center">
                    <p
                      class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {{
                        selectedLogStats.effort != null
                          ? t('client.training.effort')
                          : t('client.training.duration')
                      }}
                    </p>
                    <p
                      class="mt-1 text-xl font-black tabular-nums text-foreground"
                    >
                      <template v-if="selectedLogStats.effort != null">
                        {{ selectedLogStats.effort
                        }}<span
                          class="text-xs font-semibold text-muted-foreground"
                          >/10</span
                        >
                      </template>
                      <template v-else-if="selectedLogStats.duration">
                        {{ selectedLogStats.duration
                        }}<span
                          class="text-xs font-semibold text-muted-foreground"
                        >
                          min</span
                        >
                      </template>
                      <template v-else>—</template>
                    </p>
                  </div>
                </div>

                <!-- Log notes -->
                <div
                  v-if="selectedLog?.notes"
                  class="mt-3 rounded-xl bg-muted/30 p-3"
                >
                  <p class="text-xs font-semibold text-muted-foreground">
                    Notas
                  </p>
                  <p class="mt-1 text-sm text-foreground">
                    {{ selectedLog.notes }}
                  </p>
                </div>
              </div>
            </div>
            </template>

            <template v-else>
              <div
                v-if="selectedStatus === 'empty'"
                class="flex flex-col items-center justify-center py-16 text-center"
              >
                <span class="text-5xl">🥗</span>
                <p class="mt-4 text-base font-semibold text-foreground">
                  Sin comidas planificadas
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  Este día no tiene comidas definidas en tu plan nutricional
                </p>
              </div>

              <div v-else class="space-y-3 px-5 py-4">
                <p
                  class="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Comidas del día
                </p>
                <div
                  v-for="(meal, idx) in selectedMealsDetailed"
                  :key="meal.id ?? `${meal.type}-${idx}`"
                  class="rounded-xl border p-4"
                  :class="meal.registered ? 'border-success/20 bg-success/5' : 'bg-muted/20'"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-semibold text-foreground">
                        {{ meal.name || meal.type || `Comida ${idx + 1}` }}
                      </p>
                      <p class="mt-1 text-xs capitalize text-muted-foreground">
                        {{ meal.type || 'comida' }}
                      </p>
                      <p
                        v-if="meal.notes"
                        class="mt-2 text-xs italic text-muted-foreground"
                      >
                        "{{ meal.notes }}"
                      </p>
                    </div>
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-semibold"
                      :class="
                        meal.registered
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground'
                      "
                    >
                      {{ meal.registered ? 'Registrada' : 'Pendiente' }}
                    </span>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-2 text-xs">
                    <span v-if="meal.calories" class="rounded-full bg-muted px-2 py-0.5">
                      {{ meal.calories }} kcal
                    </span>
                    <span v-if="meal.protein" class="rounded-full bg-muted px-2 py-0.5">
                      P {{ meal.protein }}g
                    </span>
                    <span v-if="meal.carbs" class="rounded-full bg-muted px-2 py-0.5">
                      C {{ meal.carbs }}g
                    </span>
                    <span v-if="meal.fat" class="rounded-full bg-muted px-2 py-0.5">
                      G {{ meal.fat }}g
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Panel footer -->
          <div class="shrink-0 border-t p-4 space-y-2">
            <template v-if="panelView === 'workout'">
            <!-- Register: only for today, not completed -->
            <button
              v-if="isSelectedToday && selectedStatus !== 'completed'"
              @click="goToLog"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {{ t('client.training.logWorkout') }}
            </button>

            <!-- View log: only if completed -->
            <button
              v-else-if="selectedStatus === 'completed'"
              @click="goToLog"
              class="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold text-foreground transition hover:bg-muted active:scale-[0.98]"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Ver sesión registrada →
            </button>
            </template>

            <button
              v-else
              @click="goToNutrition"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Registrar comida / agua
            </button>

            <button
              @click="closePanel"
              class="w-full rounded-xl border py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {{ t('client.training.close') }}
            </button>
          </div>
        </DialogPanel>
      </TransitionChild>
    </Dialog>
  </TransitionRoot>
</template>
