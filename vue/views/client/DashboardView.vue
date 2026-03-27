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
         DAILY WELLNESS PROMPT
    ══════════════════════════════════════════════ -->
    <div v-if="!wellnessCompletedToday" class="card-enter" style="--anim-delay: 60ms">
      <router-link
        to="/client/wellness"
        class="checkin-banner checkin-pending"
      >
        <span class="text-xl flex-shrink-0">💚</span>
        <div class="min-w-0">
          <p class="text-sm font-bold text-foreground">{{ t('wellness.dashboardTitle') }}</p>
          <p class="text-xs text-muted-foreground">{{ t('wellness.dashboardDesc') }}</p>
        </div>
        <span class="text-xs font-semibold text-primary flex-shrink-0 whitespace-nowrap">{{ t('wellness.dashboardCta') }}</span>
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
            {{ currentStreak }}<span class="stat-denom"> {{ t('streak.days') }}</span>
          </p>
          <p class="stat-sub">{{ t('streak.best') }}: {{ bestStreak }} {{ t('streak.days') }}</p>
        </div>
      </div>

    </div>

    <!-- Readiness score (visible only if wellness logged today) -->
    <div
      v-if="readinessScore != null"
      class="card-enter rounded-2xl border px-4 py-3 flex items-center gap-3"
      :class="readinessScore >= 7 ? 'border-green-500/30 bg-green-500/5' : readinessScore >= 4 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'"
      style="--anim-delay: 500ms"
    >
      <span class="text-2xl">{{ readinessScore >= 7 ? '🔋' : readinessScore >= 4 ? '🔶' : '🪫' }}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-foreground">{{ t('wellness.readiness') }}</p>
        <p class="text-xs text-muted-foreground">{{ readinessScore.toFixed(1) }} / 10</p>
      </div>
      <span
        class="text-2xl font-black tabular-nums"
        :class="readinessScore >= 7 ? 'text-green-500' : readinessScore >= 4 ? 'text-yellow-500' : 'text-red-500'"
      >{{ readinessScore.toFixed(1) }}</span>
    </div>

    <!-- Achievements preview -->
    <AchievementsPreview :client-id="clientId" />

    <!-- ══════════════════════════════════════════════
         MAIN SECTION — Workout (60%) + Nutrition (40%)
    ══════════════════════════════════════════════ -->
    <div class="grid gap-5 lg:grid-cols-[3fr_2fr]">

      <!-- ─────────────────── WORKOUT CARD ─────────────────── -->
      <section class="card-enter today-card" style="--anim-delay: 480ms">

        <!-- Card header -->
        <div class="today-card-header">
          <div class="flex items-center gap-3">
            <div class="today-card-icon today-card-icon--workout">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                <path d="M13 2L3 11h7l-1 7 9-9h-7l2-7z"/>
              </svg>
            </div>
            <div>
              <h2 class="today-card-title">{{ t('client.dashboard.workoutToday') }}</h2>
              <p class="today-card-subtitle capitalize">{{ dayKeyToday }}</p>
            </div>
          </div>
          <router-link to="/client/training" class="today-card-link">
            Ver plan
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </router-link>
        </div>

        <div class="today-card-body">
          <!-- Workout exists -->
          <div v-if="todayWorkout">

            <!-- Meta row -->
            <div class="workout-meta-row">
              <span class="workout-meta-pill">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
                  <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5 1.5"/>
                </svg>
                {{ todayWorkout.exercises?.[0]?.rest ?? 0 }}s descanso
              </span>
              <span class="workout-meta-pill">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
                  <rect x="1.5" y="4" width="11" height="8" rx="1.5"/>
                  <path d="M5 4V2.5M9 4V2.5"/>
                </svg>
                {{ todayWorkout.exercises.length }} ejercicios
              </span>
              <span v-if="todayWorkout.completed" class="workout-meta-pill workout-meta-pill--done">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
                  <path d="M2.5 7l3 3 6-6"/>
                </svg>
                Completado
              </span>
            </div>

            <!-- Exercise list -->
            <div class="exercise-list">
              <div
                v-for="(exercise, idx) in todayWorkout.exercises.slice(0, 5)"
                :key="exercise.id"
                :class="['exercise-item', todayWorkout.completed ? 'exercise-item--done' : '']"
              >
                <!-- Number -->
                <span class="exercise-num">{{ String(idx + 1).padStart(2, '0') }}</span>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <p class="exercise-name">{{ exercise.name }}</p>
                  <p class="exercise-detail">{{ exercise.sets }} series · {{ exercise.reps }} reps</p>
                </div>

                <!-- Right side -->
                <div class="flex flex-shrink-0 items-center gap-2">
                  <span v-if="exercise.weight" class="exercise-weight">{{ exercise.weight }} kg</span>
                  <svg
                    v-if="todayWorkout.completed"
                    viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round"
                    class="exercise-check"
                  >
                    <path d="M3 8l3.5 3.5 6.5-7"/>
                  </svg>
                </div>
              </div>

              <p
                v-if="todayWorkout.exercises.length > 5"
                class="exercise-more"
              >
                +{{ todayWorkout.exercises.length - 5 }} más
              </p>
            </div>

            <!-- CTA -->
            <button
              v-if="!todayWorkout.completed"
              @click="startWorkout"
              class="today-cta today-cta--primary"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
              {{ t('client.dashboard.startWorkout') }}
            </button>
            <router-link
              v-else
              to="/client/daily-log"
              class="today-cta today-cta--done"
            >
              Ver entrenamiento registrado
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </router-link>
          </div>

          <!-- No workout -->
          <div v-else class="today-empty">
            <div class="today-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-muted-foreground">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>
              </svg>
            </div>
            <p class="today-empty-title">Hoy no hay entrenamiento</p>
            <p class="today-empty-desc">Contacta a tu trainer para actualizar tu plan</p>
            <router-link to="/client/training" class="today-card-link mt-4">
              Ver mi plan
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </router-link>
          </div>
        </div>
      </section>


      <!-- ─────────────────── NUTRITION CARD ─────────────────── -->
      <section class="card-enter today-card" style="--anim-delay: 560ms">

        <!-- Card header -->
        <div class="today-card-header">
          <div class="flex items-center gap-3">
            <div class="today-card-icon today-card-icon--nutrition">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                <path d="M10 2C6 4 4 8 4 11a6 6 0 0012 0c0-3-2-7-6-9z"/>
                <path d="M10 11v5"/>
              </svg>
            </div>
            <div>
              <h2 class="today-card-title">{{ t('client.dashboard.nutritionToday') }}</h2>
              <p class="today-card-subtitle">
                {{ todayNutrition.filter(m => m.registered).length }}/{{ todayNutrition.length }} comidas
              </p>
            </div>
          </div>
          <router-link to="/client/nutrition" class="today-card-link">
            Ver plan
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </router-link>
        </div>

        <div class="today-card-body">
          <!-- Nutrition plan exists -->
          <div v-if="todayNutrition.length > 0" class="space-y-5">

            <!-- Macro bars -->
            <div class="macro-bars">

              <!-- Calorias highlight -->
              <div class="macro-cal-row">
                <div class="macro-cal-left">
                  <span class="macro-cal-val">
                    {{ todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.calories || 0), 0) }}
                  </span>
                  <span class="macro-cal-unit">/ {{ totalCalories }} kcal</span>
                </div>
                <span class="macro-cal-pct">
                  {{ totalCalories > 0 ? Math.round(todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.calories || 0), 0) / totalCalories * 100) : 0 }}%
                </span>
              </div>
              <div class="macro-bar-track">
                <div
                  class="macro-bar-fill macro-bar-fill--cal"
                  :style="`width: ${totalCalories > 0 ? Math.min(100, Math.round(todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.calories || 0), 0) / totalCalories * 100)) : 0}%`"
                />
              </div>

              <!-- Proteina + Carbs side by side -->
              <div class="grid grid-cols-2 gap-3 mt-1">

                <div>
                  <div class="macro-bar-label-row">
                    <span class="macro-bar-label">Proteína</span>
                    <span class="macro-bar-nums">
                      {{ todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.protein || 0), 0) }}<span class="macro-bar-total">/{{ totalProtein }}g</span>
                    </span>
                  </div>
                  <div class="macro-bar-track macro-bar-track--sm">
                    <div
                      class="macro-bar-fill macro-bar-fill--protein"
                      :style="`width: ${totalProtein > 0 ? Math.min(100, Math.round(todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.protein || 0), 0) / totalProtein * 100)) : 0}%`"
                    />
                  </div>
                </div>

                <div>
                  <div class="macro-bar-label-row">
                    <span class="macro-bar-label">Carbs</span>
                    <span class="macro-bar-nums">
                      {{ todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.carbs || 0), 0) }}<span class="macro-bar-total">/{{ totalCarbs }}g</span>
                    </span>
                  </div>
                  <div class="macro-bar-track macro-bar-track--sm">
                    <div
                      class="macro-bar-fill macro-bar-fill--carbs"
                      :style="`width: ${totalCarbs > 0 ? Math.min(100, Math.round(todayNutrition.filter((m) => m.registered).reduce((s: number, m) => s + (m.carbs || 0), 0) / totalCarbs * 100)) : 0}%`"
                    />
                  </div>
                </div>

              </div>
            </div>

            <!-- Meals list -->
            <div class="meal-list">
              <div
                v-for="meal in todayNutrition"
                :key="meal.id"
                :class="['meal-item', meal.registered ? 'meal-item--done' : '']"
              >
                <div :class="['meal-dot', meal.registered ? 'meal-dot--done' : '']">
                  <svg v-if="meal.registered" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-2.5 w-2.5">
                    <path d="M2 5.5l2 2 4-4"/>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="meal-name">{{ meal.name }}</p>
                  <p class="meal-detail">{{ ('time' in meal ? (meal as Record<string, unknown>).time : '') as string }}{{ (('time' in meal ? (meal as Record<string, unknown>).time : '') as string) ? ' · ' : '' }}{{ meal.calories }} kcal</p>
                </div>
                <span :class="['meal-type-badge', meal.registered ? 'meal-type-badge--done' : '']">
                  {{ meal.type }}
                </span>
              </div>
            </div>

          </div>

          <!-- No nutrition plan -->
          <div v-else class="today-empty">
            <div class="today-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-muted-foreground">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
            </div>
            <p class="today-empty-title">{{ t('client.dashboard.noPlan') }}</p>
            <p class="today-empty-desc">{{ t('client.dashboard.contactTrainer') }}</p>
            <router-link to="/client/nutrition" class="today-card-link mt-4">
              Revisar mi plan
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </router-link>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
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
import { useStreakStore } from '../../stores/streak.store';
import AchievementsPreview from '../../components/AchievementsPreview.vue';
import { useWellnessStore } from '../../stores/wellness.store';

const { t, locale } = useI18n();

const router = useRouter();
const authStore = useAuthStore();



const trainig = usePlansStore();
const logs = useLogsStore();
const metricsStore = useMetricsStore();
const clientStore = useClientsStore()
const checkinStore = useCheckinStore();
const nutritionStore = useNutritionStore();
const streakStore = useStreakStore();
const wellnessStore = useWellnessStore();

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

      loadStreak()
      loadWellnessSummary()
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
const wellnessProgressRatio = computed(() => (wellnessCompletedToday.value ? 1 : 0));

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
 * ✅ Streak: fetched from store → repo → backend /clients/{id}/streak
 */
const streakData = computed(() => streakStore.getStreak(clientId.value))

async function loadStreak() {
  if (!clientId.value) return
  await streakStore.loadStreak(clientId.value)
}

const currentStreak = computed(() => streakData.value?.current ?? 0)
const bestStreak = computed(() => streakData.value?.best ?? 0)

/**
 * ✅ Wellness: summary con readiness, alerta, y check de hoy
 */
const wellnessSummary = computed(() => wellnessStore.getSummary(clientId.value))
const wellnessCompletedToday = computed(() => wellnessSummary.value?.todayEntry != null)
const readinessScore = computed(() => wellnessSummary.value?.readinessScore ?? null)

async function loadWellnessSummary() {
  if (!clientId.value) return
  await wellnessStore.loadSummary(clientId.value)
}

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

/** 5 checkpoints del día con su estado completado */
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
  {
    label: t('wellness.label'),
    icon: '💚',
    done: wellnessCompletedToday.value,
  },
]);

/** Porcentaje completado del día (0–100) */
const dayProgress = computed(() => {
  const totalRatio =
    workoutProgressRatio.value +
    mealsProgressRatio.value +
    waterProgressRatio.value +
    metricsProgressRatio.value +
    wellnessProgressRatio.value;

  return Math.round((totalRatio / 5) * 100);
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

/* ════════════════════════════════════════
   TODAY CARDS (Workout + Nutrition)
════════════════════════════════════════ */
.today-card {
  border-radius: 22px;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.today-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 18px;
  border-bottom: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
}

.today-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.today-card-icon--workout {
  background: color-mix(in oklch, var(--primary) 12%, transparent);
  color: var(--primary);
}
.today-card-icon--nutrition {
  background: color-mix(in oklch, var(--chart-2) 12%, transparent);
  color: var(--chart-2);
}

.today-card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--foreground);
  line-height: 1.2;
}
.today-card-subtitle {
  font-size: 11px;
  color: var(--muted-foreground);
  font-weight: 500;
  margin-top: 1px;
  text-transform: capitalize;
}

.today-card-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  opacity: 0.85;
  transition: opacity 0.15s, gap 0.15s;
  white-space: nowrap;
}
.today-card-link:hover { opacity: 1; gap: 6px; }

/* ── Body ── */
.today-card-body {
  padding: 20px 22px 22px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── Workout meta pills ── */
.workout-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.workout-meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-foreground);
  background: color-mix(in oklch, var(--muted) 55%, transparent);
  border: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
  padding: 4px 9px;
  border-radius: 999px;
}
.workout-meta-pill--done {
  color: var(--chart-2);
  background: color-mix(in oklch, var(--chart-2) 10%, transparent);
  border-color: color-mix(in oklch, var(--chart-2) 25%, transparent);
}

/* ── Exercise list ── */
.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  flex: 1;
}

.exercise-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
  background: color-mix(in oklch, var(--muted) 30%, transparent);
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
}
.exercise-item:hover {
  background: color-mix(in oklch, var(--muted) 55%, transparent);
  transform: translateX(2px);
}
.exercise-item--done {
  background: color-mix(in oklch, var(--chart-2) 6%, transparent);
  border-color: color-mix(in oklch, var(--chart-2) 20%, transparent);
}

.exercise-num {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  width: 20px;
}
.exercise-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.exercise-detail {
  font-size: 11px;
  color: var(--muted-foreground);
  margin-top: 1px;
}
.exercise-weight {
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  background: color-mix(in oklch, var(--muted) 70%, transparent);
  padding: 3px 8px;
  border-radius: 6px;
}
.exercise-check {
  width: 16px;
  height: 16px;
  color: var(--chart-2);
  flex-shrink: 0;
}
.exercise-more {
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-foreground);
  padding-top: 4px;
}

/* ── CTA buttons ── */
.today-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 13px 20px;
  border-radius: 13px;
  font-size: 13.5px;
  font-weight: 700;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.12s;
  margin-top: auto;
}
.today-cta:active { transform: scale(0.98); }
.today-cta--primary {
  background: var(--primary);
  color: var(--primary-foreground);
}
.today-cta--primary:hover { opacity: 0.88; }
.today-cta--done {
  background: color-mix(in oklch, var(--chart-2) 10%, transparent);
  color: var(--chart-2);
  border: 1.5px solid color-mix(in oklch, var(--chart-2) 30%, transparent);
}
.today-cta--done:hover { background: color-mix(in oklch, var(--chart-2) 16%, transparent); }

/* ── Empty state ── */
.today-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  flex: 1;
}
.today-empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: color-mix(in oklch, var(--muted) 60%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.today-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
}
.today-empty-desc {
  font-size: 12px;
  color: var(--muted-foreground);
  margin-top: 4px;
  line-height: 1.5;
}

/* ── Macro bars (nutrition) ── */
.macro-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.macro-cal-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}
.macro-cal-val {
  font-size: 28px;
  font-weight: 900;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.macro-cal-unit {
  font-size: 12px;
  color: var(--muted-foreground);
  font-weight: 500;
}
.macro-cal-pct {
  font-size: 12px;
  font-weight: 700;
  color: var(--chart-4);
}

.macro-bar-track {
  height: 8px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--muted) 70%, transparent);
  overflow: hidden;
}
.macro-bar-track--sm {
  height: 5px;
}

@keyframes bar-grow {
  from { width: 0%; }
}
.macro-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 1.1s cubic-bezier(0.16, 1, 0.3, 1);
  animation: bar-grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 500ms;
}
.macro-bar-fill--cal     { background: var(--chart-4); }
.macro-bar-fill--protein { background: var(--chart-1); }
.macro-bar-fill--carbs   { background: var(--chart-2); }

.macro-bar-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}
.macro-bar-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
}
.macro-bar-nums {
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}
.macro-bar-total {
  font-weight: 400;
  color: var(--muted-foreground);
}

/* ── Meal list ── */
.meal-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.meal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 11px;
  border: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
  background: color-mix(in oklch, var(--muted) 25%, transparent);
  transition: background 0.15s;
}
.meal-item--done {
  background: color-mix(in oklch, var(--chart-2) 6%, transparent);
  border-color: color-mix(in oklch, var(--chart-2) 18%, transparent);
}

.meal-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in oklch, var(--border) 80%, transparent);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s;
}
.meal-dot--done {
  background: var(--chart-2);
  border-color: var(--chart-2);
  color: white;
}
.meal-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meal-detail {
  font-size: 10.5px;
  color: var(--muted-foreground);
  margin-top: 1px;
}
.meal-type-badge {
  font-size: 9.5px;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--muted-foreground);
  background: color-mix(in oklch, var(--muted) 60%, transparent);
  padding: 2px 7px;
  border-radius: 999px;
  flex-shrink: 0;
}
.meal-type-badge--done {
  color: var(--chart-2);
  background: color-mix(in oklch, var(--chart-2) 10%, transparent);
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
