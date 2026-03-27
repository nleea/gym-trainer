<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useAuthStore } from '../../stores/auth';
import { useLogsStore } from '../../stores/logs.store';
import { useClientsStore } from '../../stores/clients.store';
import { useAttendanceStore } from '../../stores/attendance.store';
import { useEvidencesStore } from '../../stores/evidences.store';

import { formatDate, toJsDate, weekKey } from '../../../lib/utils';
import type { TrainingLog, ExerciseLog, MealLog } from '../../types';

import ProgressTab from '../../components/ProgressTab.vue';
import AssignTrainingPlanModal from '../../components/AssignTrainingPlanModal.vue';
import AssignNutritionPlanModal from '../../components/AssignNutritionPlanModal.vue';
import CreatePlanWithAIModal from '../../components/CreatePlanWithAIModal.vue';
import AdherenceCard from '../../components/AdherenceCard.vue';
import WeeklyVolumeChart from '../../components/WeeklyVolumeChart.vue';
import PhotoTimeline from '@/components/photos/PhotoTimeline.vue'
import ClientDiaryTab from './ClientDiaryTab.vue'
import ReportsTab from '../../components/ReportsTab.vue'

const logsStore = useLogsStore();
const authStore = useAuthStore();
const clientStore = useClientsStore();
const attendanceStore = useAttendanceStore();
const evidencesStore = useEvidencesStore();

const route = useRoute();
const router = useRouter();

const trainerId = computed(() => authStore.user?.uid ?? '');
const clientId = computed(() => route.params.id as string);

const { getClientTrainingLogsCached, mealsLogsByWeekKey } =
  storeToRefs(logsStore);

const { trainingPlan, nutritionPlan } = storeToRefs(clientStore);

const todayWorkoutLogs = computed(() => {
  const cid = clientId.value;
  if (!cid) return [];
  const logsWeek = getClientTrainingLogsCached.value(cid)!;

  return logsWeek
    .slice()
    .sort(
      (a: TrainingLog, b: TrainingLog) =>
        toJsDate(b.date)!.getTime() - toJsDate(a.date)!.getTime(),
    );
});

const showAssignModal = ref(false);
const showAssignModalNutrition = ref(false);
const showAIModal = ref(false);
const loadingClient = ref(true);

// -------- helpers UI --------

function calcExerciseVolume(ex: ExerciseLog) {
  return (ex?.sets || []).reduce(
    (s: number, set: { reps: number; weight: number }) =>
      s + Number(set?.reps || 0) * Number(set?.weight || 0),
    0,
  );
}

function calcExerciseMax(ex: ExerciseLog) {
  return Math.max(
    0,
    ...(ex?.sets || []).map((s: { weight: number }) => Number(s?.weight || 0)),
  );
}

function calcWorkoutVolume(log: TrainingLog) {
  return (log?.exercises || []).reduce(
    (sum: number, ex: ExerciseLog) => sum + calcExerciseVolume(ex),
    0,
  );
}

const client = computed(
  () =>
    clientStore.getClientCached(clientId.value) ??
    clientStore.getClientLocal(clientId.value) ??
    null,
);
const attendance = computed(() =>
  attendanceStore.getClientAttendance(clientId.value).slice(0, 14),
);

const attendanceRate = computed(() =>
  attendanceStore.getWeeklyAttendanceRate(clientId.value),
);

const mealLogs = computed(() => {
  const cid = clientId.value;

  const key = weekKey(cid);
  if (!cid) return [];
  const list = mealsLogsByWeekKey.value[key] ?? [];

  return (list ?? []).slice().sort((a: MealLog, b: MealLog) => {
    const da = new Date(a.date as string | number | Date).getTime();
    const db = new Date(b.date as string | number | Date).getTime();
    return db - da;
  });
});

watch(
  () => clientId.value,
  async (id) => {
    if (!id) {
      loadingClient.value = false;
      return;
    }

    loadingClient.value = true;

    try {
      const fetchedClient = await clientStore.fetchClient(id);
      if (!fetchedClient) return;

      const fetches = [
        logsStore.loadTrainingLogWeek(id),
        logsStore.loadMealsLogWeek(id),
        attendanceStore.loadAttendance(),
        clientStore.fetchPlanTrining(id),
        clientStore.fetchNutritionPlan(id),
        evidencesStore.loadPendingCount(id),
      ];

      await Promise.all(fetches);
    } finally {
      loadingClient.value = false;
    }
  },
  { immediate: true },
)

async function refreshAssignedPlans() {
  const id = clientId.value
  if (!id) return
  await Promise.all([
    clientStore.fetchClient(id),
    clientStore.fetchPlanTrining(id),
    clientStore.fetchNutritionPlan(id),
  ])
}

const activeTab = ref<
  'overview' | 'attendance' | 'training' | 'nutrition' | 'diary' | 'progress' | 'photos' | 'reports'
>('overview');

const unansweredEvidences = computed(
  () => evidencesStore.getPendingForClient(clientId.value).unanswered || 0,
);

const tabs = computed(() => [
  { key: 'overview',    label: 'Resumen',     icon: 'home' },
  { key: 'attendance',  label: 'Asistencia',  icon: 'calendar' },
  { key: 'training',    label: 'Entrenos',    icon: 'dumbbell' },
  { key: 'nutrition',   label: 'Comidas',     icon: 'utensils' },
  { key: 'diary',       label: 'Diario',      icon: 'book', badge: unansweredEvidences.value > 0 ? unansweredEvidences.value : null },
  { key: 'progress',    label: 'Progreso',    icon: 'chart' },
  { key: 'photos',      label: 'Fotos',       icon: 'camera' },
  { key: 'reports',     label: 'Reports',     icon: 'file' },
]);

const activePhotoType = ref<'progress' | 'nutrition' | 'training'>('progress')
const photoTypeTabs = [
  { key: 'progress',  label: 'Progreso' },
  { key: 'nutrition', label: 'Nutricion' },
  { key: 'training',  label: 'Entrenamientos' },
] as const

const toggleStatus = () => {
  if (client.value) {
    clientStore.updateClient(clientId.value, {
      status: client.value.status === 'active' ? 'inactive' : 'active',
    });
  }
};

// Helper for stats display
const statsData = computed(() => [
  { 
    label: 'Asistencia', 
    value: `${attendanceRate.value}%`, 
    icon: 'calendar',
    color: attendanceRate.value >= 80 ? 'emerald' : attendanceRate.value >= 50 ? 'amber' : 'rose'
  },
  { 
    label: 'Peso', 
    value: client.value?.weight ? `${client.value.weight} kg` : '-', 
    icon: 'scale',
    color: 'sky'
  },
  { 
    label: 'Altura', 
    value: client.value?.height ? `${client.value.height} cm` : '-', 
    icon: 'ruler',
    color: 'violet'
  },
  { 
    label: 'Edad', 
    value: client.value?.age ? `${client.value.age} años` : '-', 
    icon: 'user',
    color: 'orange'
  },
]);
</script>

<template>
  <!-- Loading State -->
  <div v-if="loadingClient" class="flex items-center justify-center min-h-[60vh]">
    <div class="flex flex-col items-center gap-4">
      <div class="relative">
        <div class="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
        <div class="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p class="text-muted-foreground text-sm font-medium animate-pulse">Cargando perfil...</p>
    </div>
  </div>

  <!-- Main Content -->
  <div
    v-else-if="client"
    class="w-full max-w-6xl mx-auto space-y-8 px-4 py-6 animate-in fade-in duration-500"
  >
    <!-- Hero Section -->
    <section class="profile-hero">
      <!-- Decorative Background Elements -->
      <div class="hero-bg-decoration">
        <div class="hero-blob hero-blob-1" />
        <div class="hero-blob hero-blob-2" />
        <div class="hero-blob hero-blob-3" />
      </div>
      
      <div class="relative z-10">
        <!-- Top Bar -->
        <div class="flex items-center justify-between mb-8">
          <button
            @click="router.back()"
            class="group flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 hover:bg-background/80 hover:border-border transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Volver</span>
          </button>

          <button
            @click="toggleStatus"
            :class="[
              'px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 backdrop-blur-sm',
              client.status === 'active'
                ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20',
            ]"
          >
            {{ client.status === 'active' ? 'Desactivar cliente' : 'Activar cliente' }}
          </button>
        </div>

        <!-- Profile Info -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <!-- Avatar -->
          <div class="relative">
            <div class="avatar-ring">
              <div class="avatar-inner">
                {{ client.name?.charAt(0)?.toUpperCase() }}
              </div>
            </div>
            <div 
              :class="[
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-card',
                client.status === 'active' ? 'bg-emerald-500' : 'bg-muted'
              ]"
            />
          </div>

          <!-- Name & Email -->
          <div class="flex-1 min-w-0">
            <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-1">
              {{ client.name }}
            </h1>
            <p class="text-muted-foreground text-base">{{ client.email }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Stats Grid -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        v-for="stat in statsData" 
        :key="stat.label"
        class="stat-card group"
      >
        <div :class="[
          'stat-icon-wrapper',
          `stat-icon-${stat.color}`
        ]">
          <!-- Calendar Icon -->
          <svg v-if="stat.icon === 'calendar'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <!-- Scale Icon -->
          <svg v-else-if="stat.icon === 'scale'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
          </svg>
          <!-- Ruler Icon -->
          <svg v-else-if="stat.icon === 'ruler'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <!-- User Icon -->
          <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-muted-foreground font-medium mb-0.5">{{ stat.label }}</p>
          <p class="text-xl font-bold text-foreground truncate">{{ stat.value }}</p>
        </div>
      </div>
    </section>

    <!-- Adherence & Volume Charts -->
    <section class="grid gap-5 lg:grid-cols-2">
      <div class="chart-card">
        <AdherenceCard :client-id="clientId" />
      </div>
      <div class="chart-card">
        <WeeklyVolumeChart :client-id="clientId" />
      </div>
    </section>

    <!-- Tabs Navigation -->
    <nav class="tabs-container">
      <div class="tabs-scroll">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key as typeof activeTab"
          :class="[
            'tab-button',
            activeTab === tab.key ? 'tab-active' : 'tab-inactive',
          ]"
        >
          <span class="relative">
            {{ tab.label }}
            <span 
              v-if="tab.badge" 
              class="absolute -top-2 -right-4 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full px-1"
            >
              {{ tab.badge }}
            </span>
          </span>
        </button>
      </div>
    </nav>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <!-- Goals Card -->
        <div class="content-card">
          <div class="flex items-center gap-3 mb-4">
            <div class="icon-badge icon-badge-primary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="font-semibold text-lg text-foreground">Objetivos</h3>
          </div>
          <p class="text-muted-foreground leading-relaxed">
            {{ client.goals || 'Sin objetivos definidos. Agrega objetivos para personalizar el seguimiento del cliente.' }}
          </p>
        </div>

        <!-- Plans Grid -->
        <div class="grid lg:grid-cols-2 gap-5">
          <!-- Training Plan Card -->
          <div class="content-card plan-card">
            <div class="flex items-start justify-between gap-4 mb-5">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2">
                  <div class="icon-badge icon-badge-violet">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                    </svg>
                  </div>
                  <h3 class="font-semibold text-foreground">Plan de entrenamiento</h3>
                </div>
                
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    :class="[
                      'status-badge',
                      trainingPlan ? 'status-badge-success' : 'status-badge-muted'
                    ]"
                  >
                    {{ trainingPlan ? 'Asignado' : 'Sin plan' }}
                  </span>
                  <p class="text-sm text-muted-foreground truncate">
                    {{ trainingPlan?.name || 'Asigna un plan para comenzar' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="grid gap-3">
              <button
                type="button"
                @click="showAIModal = true"
                class="action-button action-button-primary"
              >
                <div class="action-icon action-icon-primary">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-sm">Crear con IA</p>
                  <p class="text-xs text-muted-foreground">Genera un plan personalizado</p>
                </div>
              </button>

              <RouterLink
                :to="trainingPlan ? `/trainer/plans/training/${client.id}/${trainingPlan.id}` : `/trainer/plans/training/new`"
                class="action-button"
              >
                <div class="action-icon">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-sm">{{ trainingPlan ? 'Ver / Editar plan' : 'Crear plan' }}</p>
                  <p class="text-xs text-muted-foreground">{{ trainingPlan ? 'Ajusta ejercicios y semanas' : 'Crea una plantilla inicial' }}</p>
                </div>
              </RouterLink>

              <button
                type="button"
                @click="showAssignModal = true"
                class="action-button"
              >
                <div class="action-icon">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-sm">{{ trainingPlan ? 'Cambiar / reasignar' : 'Asignar plan' }}</p>
                  <p class="text-xs text-muted-foreground">Selecciona una plantilla existente</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Nutrition Plan Card -->
          <div class="content-card plan-card">
            <div class="flex items-start justify-between gap-4 mb-5">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2">
                  <div class="icon-badge icon-badge-emerald">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                    </svg>
                  </div>
                  <h3 class="font-semibold text-foreground">Plan de nutricion</h3>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    :class="[
                      'status-badge',
                      nutritionPlan ? 'status-badge-success' : 'status-badge-muted'
                    ]"
                  >
                    {{ nutritionPlan ? 'Asignado' : 'Sin plan' }}
                  </span>
                  <p class="text-sm text-muted-foreground truncate">
                    {{ nutritionPlan?.name || 'Asigna un plan para comenzar' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="grid gap-3">
              <RouterLink
                :to="nutritionPlan ? `/trainer/plans/nutrition/${client.id}/${nutritionPlan.id}` : `/trainer/plans/nutrition/new`"
                class="action-button"
              >
                <div class="action-icon">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-sm">{{ nutritionPlan ? 'Ver / Editar plan' : 'Crear plan' }}</p>
                  <p class="text-xs text-muted-foreground">{{ nutritionPlan ? 'Ajusta comidas y macros' : 'Crea un plan inicial' }}</p>
                </div>
              </RouterLink>

              <button
                type="button"
                @click="showAssignModalNutrition = true"
                class="action-button"
              >
                <div class="action-icon">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-sm">{{ nutritionPlan ? 'Cambiar / reasignar' : 'Asignar plan' }}</p>
                  <p class="text-xs text-muted-foreground">Selecciona una plantilla existente</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance Tab -->
      <div v-if="activeTab === 'attendance'" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div class="content-card">
          <div class="flex items-center gap-3 mb-5 pb-4 border-b border-border/50">
            <div class="icon-badge icon-badge-sky">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3 class="font-semibold text-foreground">Historial de asistencia</h3>
          </div>

          <div class="space-y-2">
            <div
              v-for="att in attendance"
              :key="att.id"
              class="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span class="text-sm font-medium text-foreground">{{ formatDate(att.date) }}</span>
              <span
                :class="[
                  'px-3 py-1.5 rounded-full text-xs font-semibold',
                  att.attended
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-rose-500/10 text-rose-600',
                ]"
              >
                {{ att.attended ? 'Asistio' : 'No asistio' }}
              </span>
            </div>
            <div v-if="attendance.length === 0" class="p-8 text-center text-muted-foreground">
              <svg class="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p class="font-medium">No hay registros de asistencia</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Training Tab -->
      <div v-if="activeTab === 'training'" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div class="content-card">
          <div class="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-border/50">
            <div class="flex items-center gap-3">
              <div class="icon-badge icon-badge-violet">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-foreground">Entrenamientos del cliente</h3>
                <p class="text-xs text-muted-foreground">Ultimos registros de la semana</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground">Hoy</p>
              <p class="text-sm font-semibold" :class="todayWorkoutLogs.length ? 'text-emerald-600' : 'text-muted-foreground'">
                {{ todayWorkoutLogs.length ? 'Registrado' : 'Sin registro' }}
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div v-if="todayWorkoutLogs.length === 0" class="p-8 text-center text-muted-foreground">
              <svg class="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
              <p class="font-medium">No hay registros de entrenamiento</p>
            </div>

            <div
              v-for="log in todayWorkoutLogs"
              :key="log.id"
              class="workout-log-card"
            >
              <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span class="text-sm font-semibold text-foreground">
                    {{ formatDate(log.createdAt!) }}
                  </span>
                  <p class="text-xs text-muted-foreground mt-1">
                    {{ log.duration || '-' }} min · {{ log.exercises?.length || 0 }} ejercicios
                  </p>
                </div>
                <div class="text-right px-3 py-1.5 rounded-lg bg-primary/10">
                  <p class="text-[10px] text-primary/70 font-medium">Volumen</p>
                  <p class="text-sm font-bold text-primary">{{ calcWorkoutVolume(log) }}</p>
                </div>
              </div>

              <div v-if="log.effort != null" class="flex items-center gap-3 mb-4">
                <span class="text-xs text-muted-foreground font-medium">Esfuerzo</span>
                <div class="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
                    :style="{ width: `${(Number(log.effort) / 10) * 100}%` }"
                  />
                </div>
                <span class="text-xs font-bold text-foreground">{{ log.effort }}/10</span>
              </div>

              <div class="space-y-2">
                <div
                  v-for="(ex, idx) in log.exercises"
                  :key="ex.exerciseId || idx"
                  class="p-3 rounded-xl bg-background border border-border/50"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-foreground">
                        {{ ex.exerciseName || 'Ejercicio' }}
                      </p>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {{ ex.sets?.length || 0 }} series · Max: <span class="font-semibold text-foreground">{{ calcExerciseMax(ex) }} kg</span>
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-muted-foreground">Vol</p>
                      <p class="text-sm font-semibold text-foreground">{{ calcExerciseVolume(ex) }}</p>
                    </div>
                  </div>

                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span
                      v-for="(set, sidx) in ex.sets || []"
                      :key="sidx"
                      class="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground font-medium"
                    >
                      {{ set.reps || 0 }} x {{ set.weight || 0 }}kg
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="log.notes" class="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p class="text-xs font-medium text-amber-600/80 mb-1">Notas</p>
                <p class="text-sm text-muted-foreground">{{ log.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Nutrition Tab -->
      <div v-if="activeTab === 'nutrition'" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div class="content-card">
          <div class="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-border/50">
            <div class="flex items-center gap-3">
              <div class="icon-badge icon-badge-emerald">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-foreground">Registros de comidas</h3>
                <p class="text-xs text-muted-foreground">Semana actual · {{ mealLogs.length }} registro(s)</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground">Hoy</p>
              <p class="text-sm font-semibold text-foreground">
                {{ mealLogs.filter((m) => {
                  const a = new Date(m.date as string | number | Date);
                  const b = new Date();
                  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
                }).length }}
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="log in mealLogs"
              :key="log.id || log.mealKey || String(log.date)"
              class="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-foreground capitalize">{{ log.type }}</span>
                    <span
                      v-if="log.registered"
                      class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600"
                    >
                      Registrado
                    </span>
                  </div>
                  <p v-if="log.name" class="text-xs text-muted-foreground mt-1 truncate">{{ log.name }}</p>
                </div>
                <span class="text-xs text-muted-foreground whitespace-nowrap">{{ formatDate(log.date) }}</span>
              </div>

              <p v-if="log.description" class="text-sm text-muted-foreground mb-3">{{ log.description }}</p>
              <p v-else class="text-sm text-muted-foreground/60 italic mb-3">Sin descripcion</p>

              <div v-if="log.calories || log.protein || log.carbs || log.fats" class="flex flex-wrap gap-2">
                <span v-if="log.calories != null" class="macro-badge">{{ log.calories }} kcal</span>
                <span v-if="log.protein != null" class="macro-badge macro-badge-protein">P: {{ log.protein }}g</span>
                <span v-if="log.carbs != null" class="macro-badge macro-badge-carbs">C: {{ log.carbs }}g</span>
                <span v-if="log.fats != null" class="macro-badge macro-badge-fats">G: {{ log.fats }}g</span>
              </div>

              <div v-if="log.photo" class="mt-3">
                <img :src="log.photo" alt="Foto de comida" class="h-24 w-24 rounded-xl border border-border object-cover" />
              </div>
            </div>

            <div v-if="mealLogs.length === 0" class="p-8 text-center text-muted-foreground">
              <svg class="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
              </svg>
              <p class="font-medium">No hay registros de comidas esta semana</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Diary Tab -->
      <div v-if="activeTab === 'diary'" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <ClientDiaryTab :client-id="clientId" />
      </div>

      <!-- Progress Tab -->
      <div v-if="activeTab === 'progress'" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <ProgressTab :client-id="clientId" />
      </div>

      <!-- Reports Tab -->
      <div v-if="activeTab === 'reports'" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <ReportsTab :client-id="clientId" :client-name="client.name ?? ''" />
      </div>

      <!-- Photos Tab -->
      <div v-if="activeTab === 'photos'" class="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div class="flex gap-2 p-1 bg-muted/50 rounded-2xl w-fit">
          <button
            v-for="pt in photoTypeTabs"
            :key="pt.key"
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200"
            :class="activePhotoType === pt.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
            @click="activePhotoType = pt.key"
          >
            {{ pt.label }}
          </button>
        </div>
        <PhotoTimeline
          :key="activePhotoType"
          :client-id="clientId"
          :type="activePhotoType"
          :can-upload="true"
        />
      </div>
    </div>
  </div>

  <!-- Not Found -->
  <div v-else class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div class="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
      <svg class="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    </div>
    <h2 class="text-2xl font-bold text-foreground mb-2">Cliente no encontrado</h2>
    <p class="text-muted-foreground mb-6">El cliente que buscas no existe o ha sido eliminado</p>
    <RouterLink 
      to="/trainer/clients" 
      class="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
    >
      Volver a clientes
    </RouterLink>
  </div>

  <!-- Modals -->
  <AssignTrainingPlanModal
    :open="showAssignModal"
    :client-id="clientId"
    :trainer-id="trainerId"
    @assigned="refreshAssignedPlans"
    @close="showAssignModal = false"
  />

  <AssignNutritionPlanModal
    :open="showAssignModalNutrition"
    :client-id="clientId"
    :trainer-id="trainerId"
    @assigned="refreshAssignedPlans"
    @close="showAssignModalNutrition = false"
  />

  <CreatePlanWithAIModal
    v-if="showAIModal && client"
    :client="client"
    :trainer-id="trainerId"
    @created="refreshAssignedPlans"
    @close="showAIModal = false"
  />
</template>

<style scoped>
/* Animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-bottom-4 {
  from { transform: translateY(1rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-in {
  animation: fade-in 0.3s ease-out, slide-in-from-bottom-4 0.4s ease-out;
}

/* Hero Section */
.profile-hero {
  position: relative;
  padding: 2rem;
  border-radius: 2rem;
  background: var(--card);
  border: 1px solid var(--border);
  overflow: hidden;
}

.hero-bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
}

.hero-blob-1 {
  width: 300px;
  height: 300px;
  background: var(--primary);
  opacity: 0.08;
  top: -100px;
  right: -50px;
}

.hero-blob-2 {
  width: 200px;
  height: 200px;
  background: #10b981;
  opacity: 0.06;
  bottom: -80px;
  left: 10%;
}

.hero-blob-3 {
  width: 150px;
  height: 150px;
  background: #8b5cf6;
  opacity: 0.05;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Avatar */
.avatar-ring {
  width: 80px;
  height: 80px;
  padding: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
}

.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--primary);
}

/* Stats Cards */
.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 1.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px -10px rgba(0, 0, 0, 0.1);
}

.stat-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-emerald { background: #10b98115; color: #10b981; }
.stat-icon-amber { background: #f59e0b15; color: #f59e0b; }
.stat-icon-rose { background: #f4364315; color: #f43643; }
.stat-icon-sky { background: #0ea5e915; color: #0ea5e9; }
.stat-icon-violet { background: #8b5cf615; color: #8b5cf6; }
.stat-icon-orange { background: #f9731615; color: #f97316; }

/* Chart Cards */
.chart-card {
  border-radius: 1.5rem;
  overflow: hidden;
}

.chart-card > * {
  border-radius: 1.5rem !important;
}

/* Tabs */
.tabs-container {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  padding: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tabs-scroll {
  display: flex;
  gap: 0.25rem;
  min-width: max-content;
}

.tab-button {
  padding: 0.75rem 1.25rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab-active {
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: 0 4px 12px -2px color-mix(in oklch, var(--primary) 30%, transparent);
}

.tab-inactive {
  color: var(--muted-foreground);
}

.tab-inactive:hover {
  background: var(--muted);
  color: var(--foreground);
}

/* Content Cards */
.content-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  padding: 1.5rem;
}

.plan-card {
  transition: all 0.3s ease;
}

.plan-card:hover {
  border-color: color-mix(in oklch, var(--primary) 30%, var(--border));
}

/* Icon Badges */
.icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-badge-primary { background: var(--primary); color: var(--primary-foreground); }
.icon-badge-violet { background: #8b5cf615; color: #8b5cf6; }
.icon-badge-emerald { background: #10b98115; color: #10b981; }
.icon-badge-sky { background: #0ea5e915; color: #0ea5e9; }

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge-success {
  background: #10b98115;
  color: #10b981;
}

.status-badge-muted {
  background: var(--muted);
  color: var(--muted-foreground);
}

/* Action Buttons */
.action-button {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 1rem;
  background: var(--background);
  border: 1px solid var(--border);
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.action-button:hover {
  background: var(--muted);
  border-color: color-mix(in oklch, var(--primary) 20%, var(--border));
}

.action-button-primary {
  background: color-mix(in oklch, var(--primary) 8%, transparent);
  border-color: color-mix(in oklch, var(--primary) 20%, transparent);
}

.action-button-primary:hover {
  background: color-mix(in oklch, var(--primary) 15%, transparent);
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  color: var(--foreground);
  flex-shrink: 0;
}

.action-icon-primary {
  background: color-mix(in oklch, var(--primary) 15%, transparent);
  color: var(--primary);
}

/* Workout Log Card */
.workout-log-card {
  padding: 1.25rem;
  border-radius: 1.25rem;
  background: var(--muted);
  background: color-mix(in oklch, var(--muted) 50%, transparent);
}

/* Macro Badges */
.macro-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--muted);
  color: var(--muted-foreground);
}

.macro-badge-protein {
  background: #ef444415;
  color: #ef4444;
}

.macro-badge-carbs {
  background: #f59e0b15;
  color: #f59e0b;
}

.macro-badge-fats {
  background: #8b5cf615;
  color: #8b5cf6;
}

/* Responsive */
@media (max-width: 640px) {
  .profile-hero {
    padding: 1.5rem;
    border-radius: 1.5rem;
  }
  
  .avatar-ring {
    width: 64px;
    height: 64px;
  }
  
  .avatar-inner {
    font-size: 1.5rem;
  }
  
  .stat-card {
    padding: 1rem;
    border-radius: 1.25rem;
  }
  
  .stat-icon-wrapper {
    width: 40px;
    height: 40px;
  }
}
</style>
