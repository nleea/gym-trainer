<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/data';
import { useAuthStore } from '../../stores/auth';
import { useLogsStore } from '../../stores/logs.store';

import WeekAttendanceBar from '../../components/WeekAttendanceBar.vue';

import { weekKey } from '../../../lib/utils';

const authStore = useAuthStore();
/** ✅ Store (NO destructuring directo) */
const dataStore = useDataStore();

const logStore = useLogsStore();

const { user } = storeToRefs(authStore);
const { activeClients, attendance } = storeToRefs(dataStore);

const { trainingLogsByWeekKeyTrainer, mealsLogsByWeekKeyTrainer } =
  storeToRefs(logStore);

const loading = ref(false);
const error = ref('');

const userId = computed(() => user.value?.uid ?? '');
const periodFilter = ref<'week' | 'month'>('week');

/** ---------- helpers ---------- */
function toJsDate(d: any): Date {
  if (!d) return new Date(0);
  if (d instanceof Date) return d;
  if (typeof d?.toDate === 'function') return d.toDate();
  return new Date(d);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getDateRange() {
  const end = startOfDay(new Date());
  const start = startOfDay(new Date());

  if (periodFilter.value === 'week') {
    start.setDate(start.getDate() - 7);
  } else {
    start.setMonth(start.getMonth() - 1);
  }

  // end inclusive: +1 día para comparaciones tipo < endExclusive
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);

  return { start, endExclusive };
}

/** ---------- computed datasets ---------- */
const activeClientsCount = computed(() => (activeClients.value ?? []).length);

const filteredAttendance = computed(() => {
  const list = attendance.value ?? [];
  const { start, endExclusive } = getDateRange();

  return list.filter((a: any) => {
    const date = toJsDate(a.date);
    return date >= start && date < endExclusive;
  });
});

const attendanceStats = computed(() => {
  const total = filteredAttendance.value.length;
  const attended = filteredAttendance.value.filter(
    (a: any) => !!a.attended,
  ).length;
  return {
    total,
    attended,
    rate: total > 0 ? Math.round((attended / total) * 100) : 0,
  };
});

const filteredTrainingLogs = computed(() => {
  const { start, endExclusive } = getDateRange();
  const k = weekKey(userId.value, new Date());
  return (
    trainingLogsByWeekKeyTrainer.value[k]?.filter((l) => {
      const date = toJsDate(l.date);
      return date >= start && date < endExclusive;
    }) ?? []
  );
});

const filteredMealLogs = computed(() => {
  const { start, endExclusive } = getDateRange();
  const k = weekKey(userId.value, new Date());
  return (
    mealsLogsByWeekKeyTrainer.value[k]?.filter((l) => {
      const date = toJsDate(l.date);
      return date >= start && date < endExclusive;
    }) ?? []
  );
});

/** Ranking */
const clientStats = computed(() => {
  const actives = activeClients.value ?? [];
  const denom = periodFilter.value === 'week' ? 14 : 60; // (7 entrenos + 7 comidas) o (30+30)

  return actives
    .map((client: any) => {
      const cid = client.id;

      const clientAttendance = filteredAttendance.value.filter(
        (a: any) => a.clientId === cid,
      );
      const attended = clientAttendance.filter((a: any) => !!a.attended).length;
      const total = clientAttendance.length;

      const trainings = filteredTrainingLogs.value.filter(
        (l: any) => l.clientId === cid,
      ).length;
      const meals = filteredMealLogs.value.filter(
        (l: any) => l.clientId === cid,
      ).length;

      const adherence =
        denom > 0
          ? Math.min(100, Math.round(((trainings + meals) / denom) * 100))
          : 0;

      return {
        ...client,
        attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
        trainings,
        meals,
        adherence,
      };
    })
    .sort((a: any, b: any) => b.adherence - a.adherence);
});

/** Chart últimos 7 días (siempre últimos 7) */
const weekDays = computed(() => {
  const days: Array<{
    date: Date;
    dayName: string;
    attended: number;
    total: number;
  }> = [];

  const today = startOfDay(new Date());

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayAttendance = (attendance.value ?? []).filter((a: any) => {
      const attDate = startOfDay(toJsDate(a.date));
      return attDate.getTime() === date.getTime();
    });

    days.push({
      date,
      dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
      attended: dayAttendance.filter((a: any) => !!a.attended).length,
      total: dayAttendance.length,
    });
  }

  return days;
});


async function loadTrainerData(uid: string) {
  if (!uid) return;
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([
      logStore.loadMealLogWeekByTrainer(uid),
      logStore.loadTrainingLogWeekByTrainer(uid),
      dataStore.loadAttendance(),
      dataStore.loadClients(uid),
    ]);
  } catch (e: any) {
    error.value = e?.message ?? 'Error cargando datos';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadTrainerData(userId.value);
});

watch(
  userId,
  async (uid, prev) => {
    if (!uid || uid === prev) return;
    await loadTrainerData(uid);
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-foreground">Reportes</h1>
        <p class="text-muted-foreground">Analiza el progreso de tus clientes</p>
      </div>

      <div class="flex bg-muted p-1 rounded-lg">
        <button
          type="button"
          @click="periodFilter = 'week'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            periodFilter === 'week'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          Semana
        </button>

        <button
          type="button"
          @click="periodFilter = 'month'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            periodFilter === 'month'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          Mes
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <p class="text-sm text-muted-foreground">Clientes activos</p>
        <p class="text-3xl font-bold text-foreground mt-1">
          {{ activeClientsCount }}
        </p>
      </div>

      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <p class="text-sm text-muted-foreground">Asistencia media</p>
        <p class="text-3xl font-bold text-primary mt-1">
          {{ attendanceStats.rate }}%
        </p>
      </div>

      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <p class="text-sm text-muted-foreground">Entrenos registrados</p>
        <p class="text-3xl font-bold text-foreground mt-1">
          {{ filteredTrainingLogs.length }}
        </p>
      </div>

      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <p class="text-sm text-muted-foreground">Comidas registradas</p>
        <p class="text-3xl font-bold text-foreground mt-1">
          {{ filteredMealLogs.length }}
        </p>
      </div>
    </div>

    <!-- Weekly Chart -->
    <div class="bg-card rounded-xl border border-border p-4 lg:p-6">
      <h3 class="font-semibold text-foreground mb-4">
        Asistencia últimos 7 días
      </h3>

      <div class="h-48 flex items-end gap-2">
        <WeekAttendanceBar :week-days="weekDays" />
      </div>

      <div class="flex justify-center gap-6 mt-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-sm bg-primary"></div>
          <span class="text-xs text-muted-foreground">Asistió</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-sm bg-muted"></div>
          <span class="text-xs text-muted-foreground">No asistió</span>
        </div>
      </div>
    </div>

    <!-- Client Rankings -->
    <div class="bg-card rounded-xl border border-border">
      <div class="p-4 lg:p-6 border-b border-border">
        <h3 class="font-semibold text-foreground">Ranking de adherencia</h3>
        <p class="text-sm text-muted-foreground">
          Clientes ordenados por cumplimiento
        </p>
      </div>

      <div class="divide-y divide-border">
        <div
          v-for="(client, index) in clientStats"
          :key="client.id"
          class="p-4 lg:px-6 flex items-center gap-4"
        >
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              index === 0
                ? 'bg-accent text-accent-foreground'
                : index === 1
                  ? 'bg-muted text-foreground'
                  : index === 2
                    ? 'bg-chart-4/20 text-chart-4'
                    : 'bg-muted text-muted-foreground',
            ]"
          >
            {{ index + 1 }}
          </div>

          <div
            class="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <span class="text-sm font-semibold text-foreground">
              {{ (client.name ?? '?').charAt(0) }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-medium text-foreground truncate">
              {{ client.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ client.trainings }} entrenos, {{ client.meals }} comidas
              <span class="mx-2">•</span>
              asistencia {{ client.attendanceRate }}%
            </p>
          </div>

          <div class="text-right">
            <p class="text-lg font-bold text-foreground">
              {{ client.adherence }}%
            </p>
            <p class="text-xs text-muted-foreground">adherencia</p>
          </div>

          <div class="hidden sm:block w-24">
            <div class="h-2 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary rounded-full transition-all"
                :style="{ width: `${client.adherence}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div
          v-if="clientStats.length === 0"
          class="p-6 text-center text-muted-foreground"
        >
          No hay datos de clientes
        </div>
      </div>
    </div>
  </div>
</template>
