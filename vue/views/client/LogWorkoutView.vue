<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import type { TrainingLog } from '../../types';
import type { UiExercise } from '../../components/ui-types';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

import { usePlansStore } from '../../stores/plan.store';
import { useLogsStore } from '../../stores/logs.store';
import { useClientsStore } from '../../stores/clients.store';

import ExercisedCard from '../../components/ExercisedCard.vue';
import PRCelebrationModal from '../../components/PRCelebrationModal.vue';
import type { PRItem } from '../../components/PRCelebrationModal.vue';
import { getLastPerformance } from '../../repo/trainingLogsrepo';

import {
  parseYmdLocal,
  isPastLocalDay,
  isSameLocalDay,
} from '../../../lib/utils';
import {
  appNow,
  getActiveWeekIndexFromAssignedAt,
} from '../../../lib/helpers';

const router = useRouter();
const authStore = useAuthStore();
const logs = useLogsStore();
const planStore = usePlansStore();
const clientStore = useClientsStore();



const { user } = storeToRefs(authStore);
const { getClientTrainingLogsCached } = storeToRefs(logs);

const clientId = computed(() => user.value?.client_id || user.value?.uid || '');
const trainingPlan = computed(() => user.value?.plan || user.value?.uid || '');

const trainerId = computed(
  () => user.value?.trainerId || user.value?.uid || '',
);

const workoutDate = ref(new Date().toISOString().split('T')[0]);
const workoutName = ref('');
const workoutDuration = ref(0);
const notes = ref('');
const workoutEffort = ref<number>(6);

const plannedExercises = ref<UiExercise[]>([]);
const extraExercises = ref<UiExercise[]>([]);

const saving = ref(false);
const formError = ref('');

const lastPerformance = ref<
  Record<string, { reps: number; weight: number; date: string }>
>({});
const showPRModal = ref(false);
const currentPRs = ref<PRItem[]>([]);

const weekDaysUi = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const;
type WeekDayUi = (typeof weekDaysUi)[number];

const CUTOFF_HOUR = 21;

const clock = ref(Date.now());
let t: any;

onMounted(() => {
  t = setInterval(() => (clock.value = Date.now()), 60_000);
});

onUnmounted(() => clearInterval(t));

/** ---------- day key from SELECTED date (important) ---------- */
const dayKeyForSelectedDate = computed(() => {
  const d = parseYmdLocal(workoutDate.value);
  const map = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
  ] as const;
  return map[d.getDay()];
});

/** ---------- helpers ---------- */

function dayDateFromUi(dayUi: WeekDayUi) {
  const base = appNow({ cutoffHour: CUTOFF_HOUR, now: new Date(clock.value) }); // ✅
  const currentIdx = weekDaysUi.indexOf(dayKeyForSelectedDate.value);
  const targetIdx = weekDaysUi.indexOf(dayUi);
  const diff = targetIdx - currentIdx;

  const d = new Date(base);
  d.setDate(base.getDate() + diff);
  return d;
}

function clamp(n: any, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

/** Normaliza sets a un count */
function normalizeSets(ex: any, desiredCount: number) {
  const count = clamp(desiredCount, 1, 20);
  if (!Array.isArray(ex.sets)) ex.sets = [];
  ex.setsCount = count;

  const cur = ex.sets.length;
  if (cur < count) {
    const last = ex.sets[cur - 1] ?? { reps: 10, weight: 0, completed: true };
    for (let i = cur; i < count; i++) ex.sets.push({ ...last });
  } else if (cur > count) {
    ex.sets.splice(count);
  }
}

/** deterministic log id: 1 per day */
const workoutDocId = computed(() => {
  const cid = clientId.value;
  if (!cid || !workoutDate.value) return '';
  return `workout_${cid}_${workoutDate.value}`;
});

/** ---------- get log for selected date (busca por fecha) ---------- */
const todayLog = computed(() => {
  const cid = clientId.value;
  if (!cid) return null;

  const list = getClientTrainingLogsCached.value(cid) ?? [];

  const targetDate = workoutDate.value; // YYYY-MM-DD
  return (
    list.find((l: any) => {
      const d = l.date instanceof Date ? l.date : new Date(l.date);
      return d.toISOString().slice(0, 10) === targetDate;
    }) ?? null
  );
});

const isEditingExisting = computed(() => !!todayLog.value);
const allExercises = computed(() => [
  ...plannedExercises.value,
  ...extraExercises.value,
]);

/** ---------- resolve plan week robustly ---------- */
const activePlanWeek = computed(() => {
  const plan = clientStore.getClientPlanTraininggetter;
  if (!plan) return null;

  return (
    plan.weeks?.find(
      (w: any) =>
        Number(w.weekNumber) ===
        getActiveWeekIndexFromAssignedAt(
          new Date(),
          plan.startDate?.toDate() ?? new Date(),
          4,
        ),
    ) ??
    plan.weeks?.[0] ??
    null
  );
});

/** Training plan workout for selected date */
const todayPlanWorkout = computed(() => {
  const week = activePlanWeek.value;
  // console.log(week)
  if (!week) return null;

  const key = dayKeyForSelectedDate.value;
  return week.days?.find((d: any) => d.day === key) ?? null;
});

/** ---------- UI actions ---------- */
const addExtraExercise = () => {
  extraExercises.value.push({
    source: 'extra',
    exerciseId: crypto.randomUUID(),
    name: '',
    rest: 60,
    notes: '',
    setsCount: 3,
    sets: [
      { reps: 10, weight: 0, completed: true },
      { reps: 10, weight: 0, completed: true },
      { reps: 10, weight: 0, completed: true },
    ],
  } as any);
};

const removePlanned = (id: string) => {
  plannedExercises.value = plannedExercises.value.filter(
    (e: any) => e.exerciseId !== id,
  );
};
const removeExtra = (id: string) => {
  extraExercises.value = extraExercises.value.filter(
    (e: any) => e.exerciseId !== id,
  );
};

const isValidWorkout = computed(() => {
  return (
    !!clientId.value &&
    workoutName.value.trim() !== '' &&
    workoutDuration.value > 0 &&
    allExercises.value.length > 0 &&
    allExercises.value.every((e: any) => {
      const nameOk = String(e.name ?? '').trim() !== '';
      const setsOk = Array.isArray(e.sets) && e.sets.length > 0;
      return nameOk && setsOk;
    })
  );
});

/** ---------- merge: plan + log ---------- */
watch(
  [todayPlanWorkout, todayLog],
  ([planWorkout, log]) => {
    // ✅ no borres mientras el plan está cargando
    // console.log('here?')

    if (!planWorkout) return;

    // console.log('paso')

    // base desde plan con sets[] reales
    const base = (planWorkout.exercises ?? []).map((ex: any) => {
      const setsCount = clamp(ex.sets ?? 3, 1, 20);
      const reps = clamp(ex.reps ?? 10, 0, 200);
      const weight = clamp(ex.weight ?? 0, 0, 500);

      const row: any = {
        source: 'plan',
        planExerciseId: ex.id,
        exerciseId: ex.id,
        name: ex.name ?? '',
        rest: clamp(ex.rest ?? 60, 0, 600),
        notes: '',
        setsCount,
        sets: Array.from({ length: setsCount }, () => ({
          reps,
          weight,
          completed: true,
        })),
      };

      normalizeSets(row, setsCount);
      return row;
    });

    // si NO hay log: solo plan
    if (!log) {
      plannedExercises.value = base;
      extraExercises.value = [];

      if (!workoutName.value)
        workoutName.value = `Entrenamiento ${planWorkout.day}`;
      return;
    }

    // con log: campos base
    workoutName.value = String(
      (log as any).name ??
        workoutName.value ??
        `Entrenamiento ${planWorkout.day}`,
    );
    workoutDuration.value = Number((log as any).duration ?? 0);
    notes.value = String((log as any).notes ?? '');
    workoutEffort.value = Number((log as any).effort ?? 6);

    // index log exercises
    const logMap = new Map<string, any>();
    for (const e of (log as any).exercises ?? [])
      logMap.set(String(e.exerciseId), e);

    // merge planned
    plannedExercises.value = base.map((p: any) => {
      const le = logMap.get(String(p.planExerciseId));
      if (!le) return p;

      const savedSets = Array.isArray(le.sets) ? le.sets : [];
      const merged = { ...p };

      if (savedSets.length) {
        merged.sets = savedSets.map((s: any) => ({
          reps: clamp(s.reps, 0, 200),
          weight: clamp(s.weight, 0, 500),
          completed: s.completed ?? true,
        }));
        merged.setsCount = merged.sets.length;
        normalizeSets(merged, merged.setsCount);
      }

      return merged;
    });

    // extras: logs que NO están en el plan
    const planIds = new Set(base.map((x: any) => String(x.planExerciseId)));
    extraExercises.value = ((log as any).exercises ?? [])
      .filter((e: any) => !planIds.has(String(e.exerciseId)))
      .map((e: any) => {
        const savedSets = Array.isArray(e.sets) ? e.sets : [];
        const row: any = {
          source: 'extra',
          exerciseId: crypto.randomUUID(),
          planExerciseId: e.exerciseId,
          name: e.exerciseName ?? '',
          rest: 60,
          notes: '',
          setsCount: clamp(savedSets.length || 3, 1, 20),
          sets: (savedSets.length
            ? savedSets
            : Array.from({ length: 3 }, () => ({
                reps: 10,
                weight: 0,
                completed: true,
              }))
          ).map((s: any) => ({
            reps: clamp(s.reps ?? 10, 0, 200),
            weight: clamp(s.weight ?? 0, 0, 500),
            completed: s.completed ?? true,
          })),
        };
        normalizeSets(row, row.setsCount);
        return row;
      });

    // Fetch last performance for all exercises
    const allIds = [
      ...plannedExercises.value.map((e: any) =>
        String(e.planExerciseId ?? e.exerciseId),
      ),
      ...extraExercises.value.map((e: any) =>
        String(e.planExerciseId ?? e.exerciseId),
      ),
    ].filter(Boolean);
    if (allIds.length && clientId.value) {
      getLastPerformance(clientId.value, allIds)
        .then((res) => {
          lastPerformance.value = res;
        })
        .catch(() => {});
    }
  },
  { immediate: true },
);

/** ---------- load data when client/date changes ---------- */
watch(
  [clientId, workoutDate, trainingPlan],
  async ([cid, d, planTrainingId]) => {
    if (!cid) return;
    await clientStore.fetchPlanTrining(planTrainingId);
    await planStore.fetchClientTrainingPlan(cid, planTrainingId);

    await logs.loadTrainingLogWeek(cid, parseYmdLocal(d));
  },
  { immediate: true },
);

/** ---------- save (upsert) ---------- */
const saveWorkout = async () => {
  const targetDate = dayDateFromUi(dayKeyForSelectedDate.value);
  // ✅ BLOQUEA si el día ya pasó (ej: lunes y hoy es martes)
  if (isPastLocalDay(targetDate)) {
    // aquí puedes mostrar toast/alert como quieras
    alert('Este día ya pasó. Solo puedes registrar ejercisios del día de hoy.');
    return;
  }

  // ✅ opcional: si quieres permitir SOLO "hoy" (no futuro)
  if (!isSameLocalDay(targetDate, new Date())) {
    alert('Solo puedes registrar ejercisios del día de hoy.');
    return;
  }

  if (!isValidWorkout.value) return;
  if (saving.value) return;

  saving.value = true;
  formError.value = '';

  try {
    const cid = clientId.value;
    const id = workoutDocId.value;
    if (!cid || !id) throw new Error('ClientId o docId faltante');

    const payload: TrainingLog = {
      id,
      trainerId: trainerId.value,
      clientId: cid,
      name: workoutName.value,
      date: parseYmdLocal(workoutDate.value),
      duration: clamp(workoutDuration.value, 0, 600),
      notes: notes.value || undefined,
      effort: clamp(workoutEffort.value, 1, 10),
      exercises: allExercises.value.map((ex: any) => {
        normalizeSets(
          ex,
          ex.setsCount ?? (Array.isArray(ex.sets) ? ex.sets.length : 3),
        );
        return {
          exerciseId: ex.planExerciseId ?? ex.exerciseId,
          exerciseName: String(ex.name ?? '').trim(),
          sets: (ex.sets ?? []).map((s: any) => ({
            reps: clamp(s.reps, 0, 200),
            weight: clamp(s.weight, 0, 500),
            completed: s.completed ?? true,
          })),
        };
      }),
    };

    const { prs } = await logs.upsertTrainingLog(payload);

    if (prs.length > 0) {
      currentPRs.value = prs;
      showPRModal.value = true;
    } else {
      router.push('/client');
    }
  } catch (e: any) {
    formError.value = e?.message ?? 'No se pudo guardar el entrenamiento';
  } finally {
    saving.value = false;
  }
};

const cancelWorkout = () => router.push('/client');

// ── Display-only: session elapsed timer ────────────────────────────────────
const sessionStart = ref(Date.now());
const sessionTick = ref(Date.now());
let sessionIntervalId: any;
onMounted(() => {
  sessionIntervalId = setInterval(() => {
    sessionTick.value = Date.now();
  }, 1000);
});
onUnmounted(() => clearInterval(sessionIntervalId));
const sessionElapsed = computed(() => {
  const secs = Math.floor((sessionTick.value - sessionStart.value) / 1000);
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
});

// ── Display-only: real-time workout stats ──────────────────────────────────
const totalVolume = computed(() =>
  allExercises.value.reduce(
    (sum: number, ex: any) =>
      sum +
      (ex.sets ?? []).reduce(
        (s2: number, s: any) =>
          s2 + (s.completed ? Number(s.reps ?? 0) * Number(s.weight ?? 0) : 0),
        0,
      ),
    0,
  ),
);
const completedSetsCount = computed(() =>
  allExercises.value.reduce(
    (n: number, ex: any) =>
      n + (ex.sets ?? []).filter((s: any) => s.completed).length,
    0,
  ),
);
const totalSetsCount = computed(() =>
  allExercises.value.reduce(
    (n: number, ex: any) => n + (ex.sets ?? []).length,
    0,
  ),
);
const progressPct = computed(() =>
  totalSetsCount.value
    ? Math.round((completedSetsCount.value / totalSetsCount.value) * 100)
    : 0,
);

</script>

<template>
  <!-- ══════════════════════════════════════════════════════
       STICKY HEADER — name · timer · volume · progress
       ══════════════════════════════════════════════════════ -->
  <div
    class="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm"
  >
    <!-- Row 1: back · name · session timer · save -->
    <div class="flex items-center gap-2 px-4 py-2.5">
      <button
        type="button"
        @click="cancelWorkout"
        class="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 transition-colors"
        title="Volver"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <!-- Inline-editable workout name -->
      <input
        v-model="workoutName"
        type="text"
        :placeholder="$t('client.logWorkout.workoutName')"
        class="flex-1 min-w-0 bg-transparent text-base font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none border-b border-transparent focus:border-primary pb-0.5 transition-colors"
      />

      <!-- Session elapsed -->
      <span
        class="shrink-0 tabular-nums font-mono text-sm text-muted-foreground px-2 py-1 rounded bg-muted/40"
      >
        {{ sessionElapsed }}
      </span>

      <!-- Save button -->
      <button
        type="button"
        @click="saveWorkout"
        :disabled="!isValidWorkout || saving"
        class="shrink-0 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all"
        :class="
          isValidWorkout && !saving
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
        "
      >
        <span v-if="saving" class="flex items-center gap-1.5">
          <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {{ $t('client.logWorkout.saving') }}
        </span>
        <span v-else>{{ $t('client.logWorkout.save') }}</span>
      </button>
    </div>

    <!-- Row 2: total volume + progress bar -->
    <div class="flex items-center gap-4 px-4 pb-2.5">
      <!-- Volume stat -->
      <div class="flex items-baseline gap-1 shrink-0">
        <span class="text-xl font-black tabular-nums text-primary leading-none">
          {{
            totalVolume >= 1000
              ? (totalVolume / 1000).toFixed(1) + 'k'
              : Math.round(totalVolume).toLocaleString('es-ES')
          }}
        </span>
        <span class="text-[10px] text-muted-foreground font-medium"
          >kg vol.</span
        >
      </div>

      <!-- Progress bar + label -->
      <div class="flex-1 min-w-0">
        <div
          class="flex items-center justify-between text-[10px] text-muted-foreground mb-1"
        >
          <span>{{ completedSetsCount }}/{{ totalSetsCount }} sets</span>
          <span
            class="font-semibold"
            :class="progressPct === 100 ? 'text-primary' : ''"
            >{{ progressPct }}%</span
          >
        </div>
        <div class="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="progressPct === 100 ? 'bg-primary' : 'bg-primary/70'"
            :style="`width: ${progressPct}%`"
          />
        </div>
      </div>

      <!-- Sets done / total -->
      <div class="shrink-0 text-right">
        <span
          class="text-xl font-black tabular-nums text-foreground leading-none"
          >{{ allExercises.length }}</span
        >
        <span class="text-[10px] text-muted-foreground font-medium ml-0.5"
          >ejerc.</span
        >
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       MAIN CONTENT
       ══════════════════════════════════════════════════════ -->
  <div class="px-4 py-5 space-y-6">
    <!-- Alerts -->
    <div
      v-if="isEditingExisting"
      class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary"
    >
      <svg
        class="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
      Editando entrenamiento registrado para hoy.
    </div>
    <div
      v-if="formError"
      class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {{ formError }}
    </div>

    <!-- ── Meta card: date · duration · effort · notes ── -->
    <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div class="px-4 pt-3 pb-1 border-b border-border/50">
        <p
          class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          {{ $t('client.logWorkout.session') }}
        </p>
      </div>
      <div class="px-4 py-3 space-y-3">
        <!-- Date (read-only display) -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">Fecha</span>
          <span class="text-sm font-medium text-foreground tabular-nums">{{
            workoutDate
          }}</span>
        </div>

        <!-- Duration + Effort inline -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label
              class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >Duración</label
            >
            <div class="flex items-center gap-1 mt-1">
              <input
                v-model.number="workoutDuration"
                type="number"
                min="0"
                class="w-20 rounded-lg border bg-background px-2 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span class="text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <div>
            <label
              class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >Esfuerzo</label
            >
            <select
              v-model="workoutEffort"
              class="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option :value="3">🟢 Baja</option>
              <option :value="6">🟡 Media</option>
              <option :value="9">🔴 Alta</option>
            </select>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label
            class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >Notas</label
          >
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Observaciones de la sesión..."
            class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
      </div>
    </div>

    <!-- ── Plan exercises grid ── -->
    <div>
      <div class="flex items-center gap-3 mb-3">
        <p
          class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap"
        >
          Plan de hoy
        </p>
        <div class="flex-1 h-px bg-border" />
        <span class="text-[10px] text-muted-foreground"
          >{{ plannedExercises.length }} ejerc.</span
        >
      </div>

      <!-- Masonry-style columns grid -->
      <div
        v-if="plannedExercises.length > 0"
        class="columns-1 md:columns-2 gap-4"
      >
        <div
          v-for="(exercise, idx) in plannedExercises"
          :key="exercise.exerciseId"
          class="break-inside-avoid mb-4"
        >
          <ExercisedCard
            v-model:exercise="plannedExercises[idx]"
            :index="idx"
            :disableName="true"
            :last-perf="
              lastPerformance[exercise.planExerciseId ?? exercise.exerciseId] ??
              null
            "
            @remove="removePlanned(exercise.exerciseId)"
          />
        </div>
      </div>

      <div
        v-else
        class="rounded-xl border border-dashed border-border py-8 text-center"
      >
        <p class="text-sm text-muted-foreground">
          No hay ejercicios del plan para hoy.
        </p>
        <p class="text-xs text-muted-foreground/60 mt-1">
          ¿No tienes plan asignado? Agrega ejercicios extra abajo.
        </p>
      </div>
    </div>

    <!-- ── Extra exercises grid ── -->
    <div>
      <div class="flex items-center gap-3 mb-3">
        <p
          class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap"
        >
          Extras
        </p>
        <div class="flex-1 h-px bg-border" />
        <span class="text-[10px] text-muted-foreground"
          >{{ extraExercises.length }} ejerc.</span
        >
      </div>

      <div
        v-if="extraExercises.length > 0"
        class="columns-1 md:columns-2 gap-4 mb-4"
      >
        <div
          v-for="(exercise, idx) in extraExercises"
          :key="exercise.exerciseId"
          class="break-inside-avoid mb-4"
        >
          <ExercisedCard
            v-model:exercise="extraExercises[idx]"
            :index="idx"
            :last-perf="
              lastPerformance[exercise.planExerciseId ?? exercise.exerciseId] ??
              null
            "
            @remove="removeExtra(exercise.exerciseId)"
          />
        </div>
      </div>

      <!-- Add extra button -->
      <button
        type="button"
        @click="addExtraExercise"
        class="w-full flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border py-7 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 group"
      >
        <span
          class="text-3xl font-light leading-none group-hover:scale-110 transition-transform"
          >+</span
        >
        <p class="text-sm font-medium">Agregar ejercicio extra</p>
      </button>
    </div>

    <!-- ── Bottom save / cancel ── -->
    <div class="flex gap-3 pb-4">
      <button
        type="button"
        @click="saveWorkout"
        :disabled="!isValidWorkout || saving"
        class="flex-1 rounded-xl py-3.5 font-semibold text-sm transition-all"
        :class="
          isValidWorkout && !saving
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/20'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
        "
      >
        {{ saving ? 'Guardando...' : 'Guardar Entrenamiento' }}
      </button>
      <button
        type="button"
        @click="cancelWorkout"
        class="rounded-xl border bg-card px-5 py-3.5 font-medium text-sm text-foreground hover:bg-muted transition-colors"
      >
        Cancelar
      </button>
    </div>
  </div>

  <PRCelebrationModal
    v-if="showPRModal"
    :prs="currentPRs"
    @close="router.push('/client')"
  />
</template>
