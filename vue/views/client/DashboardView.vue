<template>
  <div class="space-y-5 pb-8 sm:space-y-6">

    <!-- ══════════════════════════════════════════════
         HEADER
    ══════════════════════════════════════════════ -->
    <div
      class="card-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      style="--anim-delay: 0ms"
    >
      <!-- Left: avatar + greeting + name + date -->
      <div class="flex items-center gap-4">
        <div class="avatar-circle flex-shrink-0">
          {{ (authStore.user?.name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() }}
        </div>
        <div class="space-y-0.5">
          <p class="text-sm font-medium text-muted-foreground">
            {{ new Date().getHours() < 12 ? t('client.dashboard.greetingMorning') : new Date().getHours() < 18 ? t('client.dashboard.greetingAfternoon') : t('client.dashboard.greetingEvening') }} 👋
          </p>
          <h1 class="text-2xl font-black leading-none tracking-tight text-foreground sm:text-3xl">
            {{ authStore.user?.name?.split(' ')[0] ?? authStore.user?.name }}
          </h1>
          <p class="pt-0.5 text-xs capitalize text-muted-foreground">
            {{ new Date().toLocaleDateString(locale === 'es' ? 'es-ES' : locale === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }) }}
          </p>
        </div>
      </div>

      <!-- Right: CTA buttons -->
      <div class="flex gap-2 sm:flex-shrink-0">
        <router-link to="/client/daily-log" class="btn-outline-cta">
          {{ t('client.dashboard.logWorkout') }}
        </router-link>
        <router-link to="/client/progress" class="btn-primary-cta">
          {{ t('client.dashboard.viewProgress') }}
        </router-link>
      </div>
    </div>


    <!-- ══════════════════════════════════════════════
         WEEKLY CHECK-IN BANNER
    ══════════════════════════════════════════════ -->
    <div class="card-enter" style="--anim-delay: 40ms">
      <!-- Pending -->
      <router-link
        v-if="!checkinStore.currentCheckin"
        to="/client/weekly-checkin"
        class="checkin-banner checkin-pending"
      >
        <span class="text-xl flex-shrink-0">📋</span>
        <div class="min-w-0">
          <p class="text-sm font-bold text-foreground">Check-in semanal pendiente</p>
          <p class="text-xs text-muted-foreground">Como fue tu semana? Cuentale a tu trainer.</p>
        </div>
        <span class="text-xs font-semibold text-primary flex-shrink-0 whitespace-nowrap">Hacer check-in →</span>
      </router-link>
      <!-- Completed -->
      <router-link
        v-else
        to="/client/weekly-checkin"
        class="checkin-banner checkin-done"
      >
        <span class="text-xl flex-shrink-0">✓</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold" style="color: var(--chart-2)">Check-in completado</p>
          <p class="text-xs text-muted-foreground">Ver o editar respuestas</p>
        </div>
      </router-link>
    </div>

    <!-- ══════════════════════════════════════════════
         DAY PROGRESS BAR
    ══════════════════════════════════════════════ -->
    <div
      class="card-enter rounded-2xl border bg-card px-5 py-4"
      style="--anim-delay: 80ms"
    >
      <!-- Checkpoints -->
      <div class="mb-3 flex items-start justify-around">
        <div
          v-for="(cp, i) in dayCheckpoints"
          :key="i"
          class="flex flex-col items-center gap-1.5"
        >
          <div :class="['checkpoint-dot', cp.done ? 'checkpoint-done' : 'checkpoint-pending']">
            <svg v-if="cp.done" viewBox="0 0 14 14" fill="none" class="h-3.5 w-3.5">
              <path d="M2 7l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span v-else class="checkpoint-icon-text">{{ cp.icon }}</span>
          </div>
          <span
            class="text-[10px] font-medium leading-none"
            :class="cp.done ? 'text-foreground' : 'text-muted-foreground'"
          >
            {{ cp.label }}
          </span>
        </div>
      </div>

      <!-- Bar -->
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="progress-bar-fill h-full rounded-full"
          :style="`width: ${dayProgress}%`"
        ></div>
      </div>

      <p class="mt-2 text-center text-xs text-muted-foreground">
        <span class="font-bold text-foreground">{{ dayProgress }}%</span> {{ t('client.dashboard.completedToday') }}
      </p>
    </div>


    <!-- ══════════════════════════════════════════════
         STAT CARDS — 4 columns
    ══════════════════════════════════════════════ -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">

      <!-- Entrenos (semana) — azul -->
      <div
        class="stat-card card-enter"
        style="--anim-delay: 160ms; --card-accent: var(--chart-3);"
      >
        <div class="stat-inner">
          <div class="mb-2 flex items-start justify-between">
            <p class="stat-label">{{ t('client.dashboard.stats.weekWorkouts') }}</p>
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <p class="stat-number">{{ completedWorkouts }}</p>
          <p class="stat-sub">
            {{ completedWorkouts >= 4 ? 'Objetivo cumplido ✓' : `${completedWorkouts}/4 días` }}
          </p>
        </div>
      </div>

      <!-- Comidas (hoy) — verde -->
      <div
        class="stat-card card-enter"
        style="--anim-delay: 240ms; --card-accent: var(--chart-2);"
      >
        <div class="stat-inner">
          <div class="mb-2 flex items-start justify-between">
            <p class="stat-label">{{ t('client.dashboard.stats.mealsToday') }}</p>
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 8C8 10 5.9 16.17 3.82 22 3.82 22 3 19.5 4 17c.5-1 2-3 4-3 0 0-1-3 3-5s7.5-.5 6 5"/>
              <path d="M12 22V12"/>
            </svg>
          </div>
          <p class="stat-number">
            {{ todayMeals }}<span class="stat-denom">/{{ totalMealsPlanned }}</span>
          </p>
          <p class="stat-sub">
            {{ totalMealsPlanned ? `${Math.round((todayMeals / totalMealsPlanned) * 100)}% adherencia` : 'Sin plan' }}
          </p>
        </div>
      </div>

      <!-- Peso actual — naranja -->
      <div
        class="stat-card card-enter"
        style="--anim-delay: 320ms; --card-accent: var(--chart-1);"
      >
        <div class="stat-inner">
          <div class="mb-2 flex items-start justify-between">
            <p class="stat-label">{{ t('client.dashboard.stats.currentWeight') }}</p>
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <p class="stat-number">
            {{ currentWeight ?? '—' }}<span v-if="currentWeight != null" class="stat-denom"> kg</span>
          </p>
          <p
            class="stat-sub"
            :style="{ color: weightTrend >= 0 ? 'var(--chart-2)' : 'var(--destructive)' }"
          >
            {{ weightTrend >= 0 ? '+' : '' }}{{ weightTrend }} kg · Grasa {{ fatDelta?.lastValue ?? '—' }}%
          </p>
        </div>
      </div>

      <!-- Racha — amarillo -->
      <div
        class="stat-card card-enter"
        style="--anim-delay: 400ms; --card-accent: var(--chart-4);"
      >
        <div class="stat-inner">
          <div class="mb-2 flex items-start justify-between">
            <p class="stat-label">{{ t('client.dashboard.stats.streak') }}</p>
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
              <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>
            </svg>
          </div>
          <p class="stat-number">
            {{ currentStreak }}<span class="stat-denom"> días</span>
          </p>
          <p class="stat-sub">Consistencia &gt; intensidad</p>
        </div>
      </div>

    </div>


    <!-- ══════════════════════════════════════════════
         MAIN SECTION — Workout (60%) + Nutrition (40%)
    ══════════════════════════════════════════════ -->
    <div class="grid gap-4 lg:grid-cols-[3fr_2fr]">

      <!-- ─────────────────── WORKOUT CARD ─────────────────── -->
      <section
        class="card-enter overflow-hidden rounded-2xl border bg-card"
        style="--anim-delay: 480ms"
      >
        <!-- Card header -->
        <div class="flex items-center justify-between border-b px-4 py-4 sm:px-6">
          <div class="flex items-center gap-3">
            <h2 class="text-base font-bold text-foreground">{{ t('client.dashboard.workoutToday') }}</h2>
            <span class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase capitalize tracking-wide text-muted-foreground">
              {{ dayKeyToday }}
            </span>
          </div>
          <router-link
            to="/client/training"
            class="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
          >
            Ver plan <span aria-hidden="true">→</span>
          </router-link>
        </div>

        <div class="p-4 sm:p-6">
          <!-- Workout exists -->
          <div v-if="todayWorkout" class="space-y-5">
            <p class="text-xs text-muted-foreground">
              Basado en tu plan asignado · {{ todayWorkout.exercises.length }} ejercicios · descanso {{ todayWorkout.exercises?.[0]?.rest ?? 0 }}s
            </p>

            <!-- Exercise list -->
            <div class="space-y-2">
              <div
                v-for="exercise in todayWorkout.exercises.slice(0, 4)"
                :key="exercise.id"
                :class="['exercise-row', todayWorkout.completed ? 'exercise-completed' : '']"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-foreground">{{ exercise.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ exercise.sets }}×{{ exercise.reps }} · {{ exercise.rest }}s</p>
                </div>
                <div class="flex flex-shrink-0 items-center gap-1.5">
                  <span
                    v-if="exercise.weight"
                    class="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {{ exercise.weight }}kg
                  </span>
                  <svg
                    v-if="todayWorkout.completed"
                    class="h-4 w-4 flex-shrink-0"
                    style="color: var(--chart-2)"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>

              <p
                v-if="todayWorkout.exercises.length > 4"
                class="pt-1 text-center text-xs text-muted-foreground"
              >
                +{{ todayWorkout.exercises.length - 4 }} ejercicios más
              </p>
            </div>

            <!-- CTA -->
            <button
              v-if="!todayWorkout.completed"
              @click="startWorkout"
              class="btn-workout-start w-full"
            >
              {{ t('client.dashboard.startWorkout') }}
            </button>
            <router-link
              v-else
              to="/client/daily-log"
              class="btn-workout-done block w-full text-center"
            >
              Ver entrenamiento registrado ✓
            </router-link>
          </div>

          <!-- No workout -->
          <div v-else class="flex flex-col items-center justify-center py-14 text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <svg class="h-7 w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-foreground">Hoy no hay entrenamiento</p>
            <p class="mt-1 text-xs text-muted-foreground">Contacta a tu trainer para actualizar tu plan</p>
            <router-link to="/client/training" class="mt-4 text-xs font-semibold text-primary hover:underline">
              Ver mi plan →
            </router-link>
          </div>
        </div>
      </section>


      <!-- ─────────────────── NUTRITION CARD ─────────────────── -->
      <section
        class="card-enter overflow-hidden rounded-2xl border bg-card"
        style="--anim-delay: 560ms"
      >
        <!-- Card header -->
        <div class="flex items-center justify-between border-b px-4 py-4 sm:px-6">
          <h2 class="text-base font-bold text-foreground">{{ t('client.dashboard.nutritionToday') }}</h2>
          <router-link
            to="/client/nutrition"
            class="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
          >
            Ver plan <span aria-hidden="true">→</span>
          </router-link>
        </div>

        <div class="p-4 sm:p-6">
          <!-- Nutrition plan exists -->
          <div v-if="todayNutrition.length > 0" class="space-y-5">

            <!-- Macro rings -->
            <div class="flex items-end justify-between gap-2 overflow-x-auto pb-1 sm:justify-around">

              <!-- Proteína -->
              <div class="macro-ring-wrap">
                <div class="macro-ring">
                  <svg viewBox="0 0 70 70" class="macro-ring-svg">
                    <circle cx="35" cy="35" r="28" class="macro-track"/>
                    <circle
                      cx="35" cy="35" r="28"
                      class="macro-fill macro-protein"
                      :style="{
                        '--ring-to': String(175.9 * (1 - Math.min(1, totalProtein > 0
                          ? todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.protein || 0), 0) / totalProtein
                          : 0)))
                      }"
                    />
                  </svg>
                  <div class="macro-center">
                    <span class="macro-val">{{ todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.protein || 0), 0) }}</span>
                    <span class="macro-unit">g</span>
                  </div>
                </div>
                <p class="macro-name">Proteína</p>
              </div>

              <!-- Carbs -->
              <div class="macro-ring-wrap">
                <div class="macro-ring">
                  <svg viewBox="0 0 70 70" class="macro-ring-svg">
                    <circle cx="35" cy="35" r="28" class="macro-track"/>
                    <circle
                      cx="35" cy="35" r="28"
                      class="macro-fill macro-carbs"
                      :style="{
                        '--ring-to': String(175.9 * (1 - Math.min(1, totalCarbs > 0
                          ? todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.carbs || 0), 0) / totalCarbs
                          : 0)))
                      }"
                    />
                  </svg>
                  <div class="macro-center">
                    <span class="macro-val">{{ todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.carbs || 0), 0) }}</span>
                    <span class="macro-unit">g</span>
                  </div>
                </div>
                <p class="macro-name">Carbs</p>
              </div>

              <!-- Calorías -->
              <div class="macro-ring-wrap">
                <div class="macro-ring">
                  <svg viewBox="0 0 70 70" class="macro-ring-svg">
                    <circle cx="35" cy="35" r="28" class="macro-track"/>
                    <circle
                      cx="35" cy="35" r="28"
                      class="macro-fill macro-calories"
                      :style="{
                        '--ring-to': String(175.9 * (1 - Math.min(1, totalCalories > 0
                          ? todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.calories || 0), 0) / totalCalories
                          : 0)))
                      }"
                    />
                  </svg>
                  <div class="macro-center">
                    <span class="macro-val macro-val-sm">{{ todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.calories || 0), 0) }}</span>
                    <span class="macro-unit">kcal</span>
                  </div>
                </div>
                <p class="macro-name">Calorías</p>
              </div>

            </div>

            <!-- Meals list -->
            <div class="space-y-1.5">
              <div
                v-for="meal in todayNutrition"
                :key="meal.id"
                :class="['meal-chip', meal.registered ? 'meal-done' : 'meal-pending']"
              >
                <div :class="['meal-status-dot', meal.registered ? 'meal-dot-done' : 'meal-dot-pending']">
                  <svg v-if="meal.registered" viewBox="0 0 10 10" fill="none" class="h-2.5 w-2.5">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-semibold text-foreground">{{ meal.name }}</p>
                  <p class="text-[10px] text-muted-foreground">{{ ('time' in meal ? (meal as Record<string, unknown>).time : '') }} · {{ meal.calories }} kcal</p>
                </div>
              </div>
            </div>

          </div>

          <!-- No nutrition plan -->
          <div v-else class="flex flex-col items-center justify-center py-14 text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <svg class="h-7 w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-foreground">{{ t('client.dashboard.noPlan') }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ t('client.dashboard.contactTrainer') }}</p>
            <router-link to="/client/nutrition" class="mt-4 text-xs font-semibold text-primary hover:underline">
              Revisar mi plan →
            </router-link>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import type { MealLog } from '../../types';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { dayKey, weekKey } from '../../../lib/utils';
import { usePlansStore } from '../../stores/plan.store';
import { useLogsStore } from '../../stores/logs.store';
import { useMetricsStore } from '../../stores/metrics.store';
import { useClientsStore } from '../../stores/clients.store';
import {  getActiveWeekIndexFromAssignedAt } from "../../../lib/helpers";
import { useI18n } from 'vue-i18n'
import { useCheckinStore } from '../../stores/checkin.store';
import { useNutritionStore } from '../../stores/nutrition.store';

const { t, locale } = useI18n();

const router = useRouter();
const authStore = useAuthStore();



const trainig = usePlansStore();
const logs = useLogsStore();
const metricsStore = useMetricsStore();
const clientStore = useClientsStore()
const checkinStore = useCheckinStore();
const nutritionStore = useNutritionStore();

// ✅ refs reactivos
const { user } = storeToRefs(authStore);

const { mealLogs, trainingLogsByWeekKey } = storeToRefs(logs);

const clientId = computed(() => user.value?.client_id || user.value?.uid || '');
const planid = computed(() => user.value?.plan || '');
const nutritionPlanId = computed(() =>
  user.value?.nutrition_plan || ''
);

watch(
  [clientId, planid, nutritionPlanId],
  async ([newClientId, plan, nutritionPlan]) => {
    if (newClientId) {
      await logs.loadTrainingLogWeek(newClientId);

      await trainig.fetchClientTrainingPlan(newClientId, plan);
      await trainig.fetchClientNutritionPlan(newClientId,nutritionPlan);

      await logs.loadTodayMeals(newClientId);
      await logs.loadProgressEntries(newClientId);

      await metricsStore.loadClientMetrics(newClientId);
      await nutritionStore.loadSummary(newClientId, new Date(), true);

      await clientStore.fetchPlanTrining(newClientId)
      await clientStore.fetchNutritionPlan(newClientId)
      await checkinStore.loadCurrentCheckin(newClientId)
    }
  },
  { immediate: true },
);

// helpers
const jsDate = (d: string | number | Date) => (d instanceof Date ? d : new Date(d));
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayKeyToday = computed(() => {
  // JS: 0 domingo ... 6 sábado
  const map = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
  ] as const;
  return map[new Date().getDay()];
});


/**
 * ✅ Entrenos completados esta semana (usando trainingLogs)
 */
const completedWorkouts = computed(() => {
  if (!clientId.value) return 0;
  const key = weekKey(clientId.value);
  const logs = trainingLogsByWeekKey.value?.[key];
  console.log(logs)
  if (!logs) return 0;
  return logs.filter((l) => l.clientId === clientId.value).length;
});

/**
 * ✅ Nutrición de hoy basada en plan + logs del día
 * - totalMealsPlanned = comidas del plan para hoy
 * - todayMeals = comidas registradas hoy (mealLogs)
 */
const todayNutrition = computed(() => {
  if (!clientId.value) return [];
  const plan = trainig.getClientNutritionPlan(clientId.value);

  if (!plan) return [];
  const todayPlanDay = plan.days?.find((d) => d.day === dayKeyToday.value);
  const plannedMeals = todayPlanDay?.meals ?? [];

  const today = new Date();
  const getMealClientId = (m: MealLog) => m.clientId ?? '';
  const mealsLoggedToday = mealLogs.value.filter(
    (m) =>
      getMealClientId(m) === clientId.value && isSameDay(jsDate(m.date), today),
  );

  // marca si esa comida "ya fue registrada" por tipo (desayuno/almuerzo/cena/snack)
  const loggedTypes = new Set(mealsLoggedToday.map((m) => m.type));

  return plannedMeals.map((meal) => ({
    ...meal,
    registered: loggedTypes.has(meal.type),
  }));
});

const todayMeals = computed(
  () => todayNutrition.value.filter((m) => m.registered).length,
);
const totalMealsPlanned = computed(() => todayNutrition.value.length);

const workoutProgressRatio = computed(() => (todayWorkout.value?.completed ? 1 : 0));

const mealsProgressRatio = computed(() => {
  if (!totalMealsPlanned.value) return 0;
  return Math.min(1, todayMeals.value / totalMealsPlanned.value);
});

const waterProgressRatio = computed(() => {
  if (!clientId.value) return 0;
  const summary = nutritionStore.getSummary(clientId.value, new Date());
  const consumed = summary?.today_macros?.water_ml?.consumed ?? 0;
  const target = summary?.today_macros?.water_ml?.target ?? 0;
  if (!target) return 0;
  return Math.min(1, consumed / target);
});

const metricsProgressRatio = computed(() => (currentWeight.value != null ? 1 : 0));

/**
 * ✅ Calorías/macros del plan de hoy
 */
const totalCalories = computed(() =>
  todayNutrition.value.reduce(
    (sum, meal) => sum + (meal.calories || 0),
    0,
  ),
);
const totalProtein = computed(() =>
  todayNutrition.value.reduce((sum, meal) => sum + (meal.protein || 0), 0),
);
const totalCarbs = computed(() =>
  todayNutrition.value.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
);

/**
 * ✅ Peso actual desde progressEntriesByClient (último)
 */
const weightHistory = computed(() => {
  const id = clientId.value;
  if (!id) return [];
  return metricsStore.getSeries(id, 'weightKg', 12).map((p) => ({
    date: p.date,
    weight: p.value,
  }));
});

const currentWeight = computed(() => {
  const wh = weightHistory.value;
  return wh.length ? wh[wh.length - 1].weight : null;
});

const weightTrend = computed(() => {
  const wh = weightHistory.value;
  if (wh.length < 2) return 0;
  return Number(
    (wh[wh.length - 1].weight - wh[wh.length - 2].weight).toFixed(1),
  );
});

const fatDelta = computed(() =>
  clientId.value ? metricsStore.getDelta(clientId.value, 'bodyFatPct') : null,
);


/**
 * ✅ Streak: días seguidos con trainingLogs
 */

function calcCurrentStreak(logs: { date: string | number | Date }[], allowSkipToday = true) {
  const days = new Set(logs.map((l) => dayKey(l.date)));

  const base = new Date();
  if (allowSkipToday && !days.has(dayKey(base))) {
    base.setDate(base.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    if (days.has(dayKey(d))) streak++;
    else break;
  }

  return streak;
}

const currentStreak = computed(() => {
  const key = weekKey(clientId.value);
  const logs = trainingLogsByWeekKey.value?.[key] ?? [];
  return calcCurrentStreak(logs, true);
});

/**
 * ✅ Entreno de hoy desde TrainingPlan.weeks[0].days (y verifica si ya se completó hoy)
 */
const todayWorkout = computed(() => {
  if (!clientId.value) return null;

  const plan = clientStore.getClientPlanTraininggetter;

  if (!plan) return null;

  const week = plan.weeks?.find((w) => w.weekNumber === getActiveWeekIndexFromAssignedAt(new Date(), plan.startDate instanceof Date ? plan.startDate : new Date(plan.startDate ?? Date.now()), 4)) ?? plan.weeks?.[0];
  const day = week?.days?.find((d) => d.day === dayKeyToday.value);
  if (!day) return null;

  const today = new Date();
  const key = weekKey(clientId.value);
  const completed = trainingLogsByWeekKey.value[key]
    ?.filter((l) => l.clientId === clientId.value)
    .some((l) => isSameDay(jsDate(l.date), today));

  return { ...day, completed };
});

const startWorkout = () => {
  router.push('/client/daily-log');
};

// ─── UI-only computeds for the new dashboard layout ───────────────────────────

/** 4 checkpoints del día con su estado completado */
const dayCheckpoints = computed(() => [
  {
    label: 'Entrenamiento',
    icon: '⚡',
    done: workoutProgressRatio.value >= 1,
  },
  {
    label: 'Comidas',
    icon: '🥗',
    done: mealsProgressRatio.value >= 1,
  },
  {
    label: 'Agua',
    icon: '💧',
    done: waterProgressRatio.value >= 1,
  },
  {
    label: 'Métricas',
    icon: '📊',
    done: metricsProgressRatio.value >= 1,
  },
]);

/** Porcentaje completado del día (0–100) */
const dayProgress = computed(() => {
  const totalRatio =
    workoutProgressRatio.value +
    mealsProgressRatio.value +
    waterProgressRatio.value +
    metricsProgressRatio.value;

  return Math.round((totalRatio / 4) * 100);
});


</script>

<style scoped>
/* ────────────────────────────────────────
   Card entrance animation (staggered)
──────────────────────────────────────── */
@keyframes card-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card-enter {
  animation: card-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--anim-delay, 0ms);
}

/* ────────────────────────────────────────
   Avatar
──────────────────────────────────────── */
.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--foreground);
  color: var(--background);
  font-size: 18px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: -0.02em;
  user-select: none;
}

/* ────────────────────────────────────────
   Header CTA buttons
──────────────────────────────────────── */
.btn-outline-cta {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.btn-outline-cta:hover { background: var(--muted); }

.btn-primary-cta {
  display: inline-flex;
  align-items: center;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  text-decoration: none;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-primary-cta:hover { opacity: 0.85; }

/* ────────────────────────────────────────
   Day progress bar
──────────────────────────────────────── */
.checkpoint-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}
.checkpoint-done {
  background: var(--foreground);
  color: var(--background);
}
.checkpoint-pending {
  background: var(--muted);
  color: var(--muted-foreground);
}
.checkpoint-icon-text {
  font-size: 13px;
  line-height: 1;
}

.progress-bar-fill {
  background: var(--foreground);
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ────────────────────────────────────────
   Stat cards
──────────────────────────────────────── */
.stat-card {
  position: relative;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
}
/* Colored top accent stripe */
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--card-accent, var(--primary));
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px color-mix(in oklch, var(--foreground) 8%, transparent);
}

.stat-inner { padding: 20px; }

.stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  line-height: 1.4;
}
.stat-icon {
  width: 26px;
  height: 26px;
  color: var(--card-accent, var(--muted-foreground));
  opacity: 0.65;
  flex-shrink: 0;
}
.stat-number {
  font-size: 36px;
  font-weight: 900;
  line-height: 1;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
  margin-top: 6px;
  margin-bottom: 4px;
}
.stat-denom {
  font-size: 20px;
  font-weight: 500;
  color: var(--muted-foreground);
}
.stat-sub {
  font-size: 11px;
  color: var(--muted-foreground);
}

/* ────────────────────────────────────────
   Exercise rows (workout card)
──────────────────────────────────────── */
.exercise-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in oklch, var(--muted) 45%, transparent);
  transition: background 0.15s;
}
.exercise-completed {
  background: color-mix(in oklch, var(--chart-2) 8%, transparent);
  border-color: color-mix(in oklch, var(--chart-2) 22%, transparent);
}

/* ────────────────────────────────────────
   Workout CTA buttons
──────────────────────────────────────── */
.btn-workout-start {
  padding: 13px 20px;
  border-radius: 12px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.btn-workout-start:hover { opacity: 0.88; }
.btn-workout-start:active { transform: scale(0.98); }

.btn-workout-done {
  padding: 13px 20px;
  border-radius: 12px;
  border: 1.5px solid var(--primary);
  color: var(--primary);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-workout-done:hover {
  background: color-mix(in oklch, var(--primary) 7%, transparent);
}

/* ────────────────────────────────────────
   Macro rings (nutrition card)
──────────────────────────────────────── */
@keyframes ring-draw {
  to { stroke-dashoffset: var(--ring-to, 0); }
}

.macro-ring-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.macro-ring {
  position: relative;
  width: 72px;
  height: 72px;
}
.macro-ring-svg {
  width: 72px;
  height: 72px;
  transform: rotate(-90deg);
}

.macro-track {
  fill: none;
  stroke: var(--muted);
  stroke-width: 6;
}
.macro-fill {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 175.9;
  stroke-dashoffset: 175.9; /* start empty — animated to --ring-to */
  animation: ring-draw 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 640ms;
}
.macro-protein  { stroke: var(--chart-1); }
.macro-carbs    { stroke: var(--chart-2); }
.macro-calories { stroke: var(--chart-4); }

.macro-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
}
.macro-val {
  font-size: 13px;
  font-weight: 900;
  color: var(--foreground);
}
.macro-val-sm {
  font-size: 10px;
}
.macro-unit {
  font-size: 9px;
  color: var(--muted-foreground);
  font-weight: 500;
}
.macro-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted-foreground);
  text-align: center;
}

/* ────────────────────────────────────────
   Check-in banner
──────────────────────────────────────── */
.checkin-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: var(--card);
  text-decoration: none;
  transition: background 0.15s, transform 0.15s;
}
.checkin-banner:hover { background: var(--muted); transform: translateY(-1px); }
.checkin-pending { border-color: color-mix(in oklch, var(--primary) 30%, transparent); }
.checkin-done {
  border-color: color-mix(in oklch, var(--chart-2) 30%, transparent);
  background: color-mix(in oklch, var(--chart-2) 5%, transparent);
}

/* ────────────────────────────────────────
   Meal chips (nutrition card)
──────────────────────────────────────── */
.meal-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in oklch, var(--muted) 35%, transparent);
  transition: background 0.15s;
}
.meal-done {
  background: color-mix(in oklch, var(--chart-2) 6%, transparent);
  border-color: color-mix(in oklch, var(--chart-2) 20%, transparent);
}

.meal-status-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.meal-dot-done {
  background: var(--chart-2);
  color: white;
}
.meal-dot-pending {
  border: 1.5px solid var(--border);
  background: transparent;
}

@media (max-width: 640px) {
  .stat-inner { padding: 14px; }
  .stat-number { font-size: 1.45rem; }
  .macro-ring {
    width: 64px;
    height: 64px;
  }
  .macro-ring-svg {
    width: 64px;
    height: 64px;
  }
}
</style>
