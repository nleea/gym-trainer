<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useDataStore } from '../../stores/data';
import { useAuthStore } from '../../stores/auth';
import { useLogsStore } from '../../stores/logs.store';
import { useClientsStore } from '../../stores/clients.store';

import { formatDate, toJsDate, weekKey } from '../../../lib/utils';

import ProgressTab from '../../components/ProgressTab.vue';
import AssignTrainingPlanModal from '../../components/AssignTrainingPlanModal.vue';
import AssignNutritionPlanModal from '../../components/AssignNutritionPlanModal.vue';

const logsStore = useLogsStore();
const authStore = useAuthStore();
const clientStore = useClientsStore();

const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();

const trainerId = computed(() => authStore.user?.uid ?? '');
const clientId = computed(() => route.params.id as string);

const { getClientTrainingLogsCached, mealsLogsByWeekKey } =
  storeToRefs(logsStore);

const { trainingPlan, nutritionplan } = storeToRefs(clientStore);

const todayWorkoutLogs = computed(() => {
  const cid = clientId.value;
  if (!cid) return [];
  const logsWeek = getClientTrainingLogsCached.value(cid)!;

  return logsWeek
    .slice()
    .sort(
      (a: any, b: any) =>
        toJsDate(b.date)!.getTime() - toJsDate(a.date)!.getTime(),
    );
});

const showAssignModal = ref(false);
const showAssignModalNutrition = ref(false);

// -------- helpers UI --------

function calcExerciseVolume(ex: any) {
  return (ex?.sets || []).reduce(
    (s: number, set: any) =>
      s + Number(set?.reps || 0) * Number(set?.weight || 0),
    0,
  );
}

function calcExerciseMax(ex: any) {
  return Math.max(
    0,
    ...(ex?.sets || []).map((s: any) => Number(s?.weight || 0)),
  );
}

function calcWorkoutVolume(log: any) {
  return (log?.exercises || []).reduce(
    (sum: number, ex: any) => sum + calcExerciseVolume(ex),
    0,
  );
}

const client = computed(() => dataStore.getClient(clientId.value));
const attendance = computed(() =>
  dataStore.getClientAttendance(clientId.value).slice(0, 14),
);

const diaries = computed(() =>
  dataStore.getClientDiaries(clientId.value).slice(0, 7),
);

const attendanceRate = computed(() =>
  dataStore.getWeeklyAttendanceRate(clientId.value),
);

const mealLogs = computed(() => {
  const cid = clientId.value;

  const key = weekKey(cid);
  if (!cid) return [];
  const list = mealsLogsByWeekKey.value[key] ?? [];

  return (list ?? []).slice().sort((a: any, b: any) => {
    const da = new Date(a.date as any).getTime();
    const db = new Date(b.date as any).getTime();
    return db - da;
  });
});

watch(
  () => clientId.value,
  async (id) => {
    if (!id) return

    const client = await clientStore.fetchClient(id)
    if (!client) return

    const fetches = [
      logsStore.loadTrainingLogWeek(id),
      logsStore.loadMealsLogWeek(id),
      dataStore.loadAttendance(),
      clientStore.fetchPlanTrining(id),
      clientStore.fetchNutritionPlan(id),
    ]

    await Promise.all(fetches)
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
  'overview' | 'attendance' | 'training' | 'nutrition' | 'diary' | 'progress'
>('overview');

const tabs = [
  { key: 'overview', label: 'Resumen' },
  { key: 'attendance', label: 'Asistencia' },
  { key: 'training', label: 'Entrenos' },
  { key: 'nutrition', label: 'Comidas' },
  { key: 'diary', label: 'Diario' },
  { key: 'progress', label: 'Progreso' },
];

const getMoodEmoji = (mood: number) => {
  const moods = ['', 'Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'];
  return moods[mood] || '';
};

const toggleStatus = () => {
  if (client.value) {
    dataStore.updateClient(clientId.value, {
      status: client.value.status === 'active' ? 'inactive' : 'active',
    });
  }
};
</script>

<template>
  <div v-if="client" class="space-y-6">
    <!-- Header -->
    <div class="flex items-start gap-4">
      <button
        @click="router.back()"
        class="p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div class="flex-1">
        <div class="flex items-center gap-3">
          <div
            class="w-14 h-14 rounded-full bg-muted flex items-center justify-center"
          >
            <span class="text-xl font-semibold text-foreground">{{
              client.name?.charAt(0)
            }}</span>
          </div>
          <div>
            <h1 class="text-xl font-bold text-foreground">{{ client.name }}</h1>
            <p class="text-sm text-muted-foreground">{{ client.email }}</p>
          </div>
        </div>
      </div>

      <button
        @click="toggleStatus"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          client.status === 'active'
            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            : 'bg-primary/10 text-primary hover:bg-primary/20',
        ]"
      >
        {{ client.status === 'active' ? 'Desactivar' : 'Activar' }}
      </button>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-card rounded-xl p-4 border border-border">
        <p class="text-sm text-muted-foreground">Asistencia semanal</p>
        <p class="text-2xl font-bold text-foreground">{{ attendanceRate }}%</p>
      </div>
      <div class="bg-card rounded-xl p-4 border border-border">
        <p class="text-sm text-muted-foreground">Peso actual</p>
        <p class="text-2xl font-bold text-foreground">
          {{ client.weight || '-' }} kg
        </p>
      </div>
      <div class="bg-card rounded-xl p-4 border border-border">
        <p class="text-sm text-muted-foreground">Altura</p>
        <p class="text-2xl font-bold text-foreground">
          {{ client.height || '-' }} cm
        </p>
      </div>
      <div class="bg-card rounded-xl p-4 border border-border">
        <p class="text-sm text-muted-foreground">Edad</p>
        <p class="text-2xl font-bold text-foreground">
          {{ client.age || '-' }} años
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-border overflow-x-auto">
      <div class="flex gap-1 min-w-max">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key as typeof activeTab"
          :class="[
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div>
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <div class="bg-card rounded-xl border border-border p-6">
          <h3 class="font-semibold text-foreground mb-3">Objetivos</h3>
          <p class="text-muted-foreground">
            {{ client.goals || 'Sin objetivos definidos' }}
          </p>
        </div>

        <div class="grid lg:grid-cols-2 gap-6">
          <div class="bg-card rounded-xl border border-border p-6">
            <!-- Header -->
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <h3 class="text-base font-semibold text-foreground">
                  Plan de entrenamiento
                </h3>

                <div class="flex items-center gap-2">
                  <span
                    v-if="trainingPlan"
                    class="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground"
                  >
                    Asignado
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    Sin plan
                  </span>

                  <p class="text-sm text-muted-foreground">
                    <span v-if="trainingPlan">{{ trainingPlan.name }}</span>
                    <span v-else
                      >Asigna un plan para empezar el seguimiento</span
                    >
                  </p>
                </div>
              </div>

              <!-- Optional: small icon badge -->
              <div
                class="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted"
              >
                <!-- dumbbell icon (inline svg) -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 7v10M17 7v10M4 10v4m16-4v4M9 9h6v6H9V9z"
                  />
                </svg>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <!-- Ver / Editar -->
              <RouterLink
                :to="
                  trainingPlan
                    ? `/trainer/plans/training/${client.id}/${trainingPlan.id}`
                    : `/trainer/plans/training/new`
                "
                class="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div
                  class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted transition group-hover:bg-background"
                >
                  <!-- eye icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>

                <div class="min-w-0">
                  <p class="font-medium text-foreground">
                    {{ trainingPlan ? 'Ver / Editar plan' : 'Crear plan' }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {{
                      trainingPlan
                        ? 'Ajusta ejercicios y semanas para este cliente'
                        : 'Crea una plantilla o plan inicial'
                    }}
                  </p>
                </div>
              </RouterLink>

              <!-- Asignar / Cambiar -->
              <button
                type="button"
                @click="showAssignModal = true"
                class="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div
                  class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted transition group-hover:bg-background"
                >
                  <!-- plus icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>

                <div class="min-w-0">
                  <p class="font-medium text-foreground">
                    {{ trainingPlan ? 'Cambiar / reasignar' : 'Asignar plan' }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Selecciona una plantilla y crea el plan del cliente
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div class="bg-card rounded-xl border border-border p-6">
            <!-- Header -->
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <h3 class="text-base font-semibold text-foreground">
                  Plan de nutricion
                </h3>

                <div class="flex items-center gap-2">
                  <span
                    v-if="nutritionplan"
                    class="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground"
                  >
                    Asignado
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    Sin plan
                  </span>

                  <p class="text-sm text-muted-foreground">
                    <span v-if="nutritionplan">{{ nutritionplan.name }}</span>
                    <span v-else
                      >Asigna un plan para empezar el seguimiento</span
                    >
                  </p>
                </div>
              </div>

              <!-- Optional: small icon badge -->
              <div
                class="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted"
              >
                <!-- dumbbell icon (inline svg) -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 7v10M17 7v10M4 10v4m16-4v4M9 9h6v6H9V9z"
                  />
                </svg>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <!-- Ver / Editar -->
              <RouterLink
                :to="
                  nutritionplan
                    ? `/trainer/plans/nutrition/${client.id}/${nutritionplan.id}`
                    : `/trainer/plans/nutrition/new`
                "
                class="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div
                  class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted transition group-hover:bg-background"
                >
                  <!-- eye icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>

                <div class="min-w-0">
                  <p class="font-medium text-foreground">
                    {{ nutritionplan ? 'Ver / Editar plan' : 'Crear plan' }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {{
                      nutritionplan
                        ? 'Ajusta ejercicios y semanas para este cliente'
                        : 'Crea una plantilla o plan inicial'
                    }}
                  </p>
                </div>
              </RouterLink>

              <!-- Asignar / Cambiar -->
              <button
                type="button"
                @click="showAssignModalNutrition = true"
                class="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div
                  class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted transition group-hover:bg-background"
                >
                  <!-- plus icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>

                <div class="min-w-0">
                  <p class="font-medium text-foreground">
                    {{ nutritionplan ? 'Cambiar / reasignar' : 'Asignar plan' }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Selecciona una plantilla y crea el plan del cliente
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance Tab -->
      <div
        v-if="activeTab === 'attendance'"
        class="bg-card rounded-xl border border-border"
      >
        <div class="p-4 border-b border-border">
          <h3 class="font-semibold text-foreground">Historial de asistencia</h3>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="att in attendance"
            :key="att.id"
            class="p-4 flex items-center justify-between"
          >
            <span class="text-sm text-foreground">{{
              formatDate(att.date)
            }}</span>
            <span
              :class="[
                'px-3 py-1 rounded-full text-xs font-medium',
                att.attended
                  ? 'bg-primary/10 text-primary'
                  : 'bg-destructive/10 text-destructive',
              ]"
            >
              {{ att.attended ? 'Asistió' : 'No asistió' }}
            </span>
          </div>
          <div
            v-if="attendance.length === 0"
            class="p-6 text-center text-muted-foreground"
          >
            No hay registros de asistencia
          </div>
        </div>
      </div>

      <!-- TAB: TRAINING (vista entrenador) -->
      <div
        v-if="activeTab === 'training'"
        class="bg-card rounded-xl border border-border"
      >
        <div
          class="p-4 border-b border-border flex items-center justify-between"
        >
          <div>
            <h3 class="font-semibold text-foreground">
              Entrenamientos del cliente
            </h3>
            <p class="text-xs text-muted-foreground mt-1">
              Últimos registros (hoy / semana según carga)
            </p>
          </div>

          <!-- mini resumen -->
          <div class="text-right">
            <p class="text-xs text-muted-foreground">Hoy</p>
            <p class="text-sm font-semibold text-foreground">
              {{ todayWorkoutLogs.length ? 'Registrado' : 'Sin registro' }}
            </p>
          </div>
        </div>

        <div class="divide-y divide-border">
          <!-- EMPTY -->
          <div
            v-if="todayWorkoutLogs.length === 0"
            class="p-6 text-center text-muted-foreground"
          >
            No hay registros de entrenamiento para hoy.
          </div>

          <!-- LIST -->
          <div
            v-for="log in todayWorkoutLogs"
            :key="log.id"
            class="p-4 space-y-3"
          >
            <!-- header -->
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="text-sm font-medium text-foreground">
                  {{ formatDate(log.createdAt!) }}
                </span>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ log.duration || '-' }} min ·
                  {{ log.exercises?.length || 0 }} ejercicios
                </p>
              </div>

              <div class="text-right">
                <p class="text-xs text-muted-foreground">Volumen</p>
                <p class="text-sm font-semibold text-foreground">
                  {{ calcWorkoutVolume(log) }}
                </p>
              </div>
            </div>

            <!-- esfuerzo -->
            <div v-if="log.effort != null" class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">Esfuerzo</span>
              <div class="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary rounded-full"
                  :style="{ width: `${(Number(log.effort) / 10) * 100}%` }"
                ></div>
              </div>
              <span class="text-xs font-medium text-foreground">
                {{ log.effort }}/10
              </span>
            </div>

            <!-- ejercicios -->
            <div class="rounded-lg border bg-muted/20 p-3">
              <p class="text-xs font-medium text-muted-foreground mb-2">
                Detalle por ejercicio
              </p>

              <div v-if="log.exercises?.length" class="space-y-2">
                <div
                  v-for="(ex, idx) in log.exercises"
                  :key="ex.exerciseId || idx"
                  class="rounded-lg bg-background p-3"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-foreground">
                        {{ ex.exerciseName || 'Ejercicio' }}
                      </p>
                      <p class="text-xs text-muted-foreground mt-1">
                        {{ ex.sets?.length || 0 }} series · Max:
                        <span class="font-medium text-foreground">
                          {{ calcExerciseMax(ex) }} kg
                        </span>
                      </p>
                    </div>

                    <div class="text-right">
                      <p class="text-xs text-muted-foreground">Vol</p>
                      <p class="text-sm font-semibold text-foreground">
                        {{ calcExerciseVolume(ex) }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="(set, sidx) in ex.sets || []"
                      :key="sidx"
                      class="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {{ set.reps || 0 }} reps · {{ set.weight || 0 }}kg
                    </span>
                  </div>
                </div>
              </div>

              <div v-else class="text-sm text-muted-foreground">
                No hay ejercicios en este log.
              </div>
            </div>

            <!-- notas -->
            <div v-if="log.notes" class="rounded-lg bg-muted/30 p-3">
              <p class="text-xs font-medium text-muted-foreground mb-1">
                Notas
              </p>
              <p class="text-sm text-muted-foreground">{{ log.notes }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Nutrition Tab -->
      <div
        v-if="activeTab === 'nutrition'"
        class="bg-card rounded-xl border border-border"
      >
        <div
          class="p-4 border-b border-border flex items-center justify-between"
        >
          <div>
            <h3 class="font-semibold text-foreground">Registros de comidas</h3>
            <p class="text-xs text-muted-foreground mt-1">
              Semana actual · {{ mealLogs.length }} registro(s)
            </p>
          </div>

          <!-- mini resumen -->
          <div class="text-right">
            <p class="text-xs text-muted-foreground">Hoy</p>
            <p class="text-sm font-semibold text-foreground">
              {{
                mealLogs.filter((m) => {
                  const a = new Date(m.date as any);
                  const b = new Date();
                  return (
                    a.getFullYear() === b.getFullYear() &&
                    a.getMonth() === b.getMonth() &&
                    a.getDate() === b.getDate()
                  );
                }).length
              }}
            </p>
          </div>
        </div>

        <div class="divide-y divide-border">
          <div
            v-for="log in mealLogs"
            :key="log.id || log.mealKey || String(log.date)"
            class="p-4"
          >
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-foreground capitalize">
                    {{ log.type }}
                  </span>

                  <span
                    v-if="log.registered"
                    class="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                  >
                    ✓ registrado
                  </span>
                </div>

                <p
                  v-if="log.name"
                  class="text-xs text-muted-foreground mt-1 truncate"
                >
                  {{ log.name }}
                </p>
              </div>

              <span class="text-xs text-muted-foreground whitespace-nowrap">
                {{ formatDate(log.date) }}
              </span>
            </div>

            <p v-if="log.description" class="text-sm text-muted-foreground">
              {{ log.description }}
            </p>
            <p v-else class="text-sm text-muted-foreground italic">
              Sin descripción
            </p>

            <!-- macros -->
            <div
              v-if="log.calories || log.protein || log.carbs || log.fats"
              class="mt-3 flex flex-wrap gap-2 text-xs"
            >
              <span
                v-if="log.calories != null"
                class="rounded-full border bg-muted/30 px-2 py-1 text-muted-foreground"
              >
                {{ log.calories }} kcal
              </span>
              <span
                v-if="log.protein != null"
                class="rounded-full border bg-muted/30 px-2 py-1 text-muted-foreground"
              >
                P: {{ log.protein }}g
              </span>
              <span
                v-if="log.carbs != null"
                class="rounded-full border bg-muted/30 px-2 py-1 text-muted-foreground"
              >
                C: {{ log.carbs }}g
              </span>
              <span
                v-if="log.fats != null"
                class="rounded-full border bg-muted/30 px-2 py-1 text-muted-foreground"
              >
                G: {{ log.fats }}g
              </span>
            </div>

            <!-- photo -->
            <div v-if="log.photo" class="mt-3">
              <img
                :src="log.photo"
                alt="Foto de comida"
                class="h-28 w-28 rounded-lg border object-cover"
              />
            </div>
          </div>

          <div
            v-if="mealLogs.length === 0"
            class="p-6 text-center text-muted-foreground"
          >
            No hay registros de comidas esta semana.
          </div>
        </div>
      </div>

      <!-- Diary Tab -->
      <div
        v-if="activeTab === 'diary'"
        class="bg-card rounded-xl border border-border"
      >
        <div class="p-4 border-b border-border">
          <h3 class="font-semibold text-foreground">Diario del cliente</h3>
        </div>
        <div class="divide-y divide-border">
          <div v-for="diary in diaries" :key="diary.id" class="p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-foreground">{{
                formatDate(diary.date)
              }}</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div class="text-center p-2 bg-muted/50 rounded-lg">
                <p class="text-xs text-muted-foreground">Ánimo</p>
                <p class="text-sm font-medium text-foreground">
                  {{ getMoodEmoji(diary.mood) }}
                </p>
              </div>
              <div class="text-center p-2 bg-muted/50 rounded-lg">
                <p class="text-xs text-muted-foreground">Energía</p>
                <p class="text-sm font-medium text-foreground">
                  {{ diary.energy }}/5
                </p>
              </div>
              <div class="text-center p-2 bg-muted/50 rounded-lg">
                <p class="text-xs text-muted-foreground">Sueño</p>
                <p class="text-sm font-medium text-foreground">
                  {{ diary.sleep.toFixed(1) }}h
                </p>
              </div>
              <div class="text-center p-2 bg-muted/50 rounded-lg">
                <p class="text-xs text-muted-foreground">Estrés</p>
                <p class="text-sm font-medium text-foreground">
                  {{ diary.stress }}/5
                </p>
              </div>
            </div>
            <p v-if="diary.notes" class="text-sm text-muted-foreground">
              {{ diary.notes }}
            </p>
          </div>
          <div
            v-if="diaries.length === 0"
            class="p-6 text-center text-muted-foreground"
          >
            No hay entradas en el diario
          </div>
        </div>
      </div>

      <!-- Progress Tab -->
      <div v-if="activeTab === 'progress'" class="space-y-6">
        <ProgressTab :client-id="clientId" />
      </div>
    </div>
  </div>

  <!-- Not Found -->
  <div v-else class="text-center py-12">
    <h2 class="text-xl font-bold text-foreground mb-2">
      Cliente no encontrado
    </h2>
    <p class="text-muted-foreground mb-4">El cliente que buscas no existe</p>
    <RouterLink to="/trainer/clients" class="text-primary hover:underline">
      Volver a clientes
    </RouterLink>
  </div>

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
</template>
