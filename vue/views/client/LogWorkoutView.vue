<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import type { TrainingLog, TrainingWeek, TrainingDay, Exercise, ExerciseLog, ExerciseEvidence } from '../../types';
import type { UiExercise, UiSet } from '../../components/ui-types';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

import { usePlansStore } from '../../stores/plan.store';
import { useLogsStore } from '../../stores/logs.store';
import { useClientsStore } from '../../stores/clients.store';

import ExercisedCard from '../../components/ExercisedCard.vue';
import ExerciseSearchDrawer from '../../components/ExerciseSearchDrawer.vue';
import PRCelebrationModal from '../../components/PRCelebrationModal.vue';
import EvidenceModal from '../../components/EvidenceModal.vue';
import EvidenceThreadCard from '../../components/EvidenceThreadCard.vue';
import type { PRItem } from '../../components/PRCelebrationModal.vue';
import { getLastPerformance } from '../../repo/trainingLogsRepo';
import type { ExerciseItem } from '../../repo/exercisesRepo';
import { useEvidencesStore } from '../../stores/evidences.store';
import { useAppToast } from '@/composables/useAppToast';

import {
  parseYmdLocal,
  isPastLocalDay,
  isSameLocalDay,
} from '../../../lib/utils';
import { getActiveWeekIndexFromAssignedAt } from '../../../lib/helpers';

const router = useRouter();
const authStore = useAuthStore();
const logs = useLogsStore();
const planStore = usePlansStore();
const clientStore = useClientsStore();
const evidencesStore = useEvidencesStore();
const toast = useAppToast();



const { user } = storeToRefs(authStore);
const { getClientTrainingLogsCached } = storeToRefs(logs);

const clientId = computed(() => user.value?.client_id || user.value?.uid || '');
const trainingPlan = computed(() => user.value?.plan || user.value?.uid || '');

const trainerId = computed(
  () => user.value?.trainerId || user.value?.uid || '',
);

const workoutDate = ref(toLocalYmd(new Date()));
const workoutName = ref('');
const workoutDuration = ref(0);
const notes = ref('');
const workoutEffort = ref<number>(6);

const plannedExercises = ref<UiExercise[]>([]);
const extraExercises = ref<UiExercise[]>([]);
const showExerciseDrawer = ref(false);

const saving = ref(false);
const formError = ref('');

const lastPerformance = ref<
  Record<string, { reps: number; weight: number; date: string }>
>({});
const showPRModal = ref(false);
const currentPRs = ref<PRItem[]>([]);
const showTrainingModeModal = ref(false);
const restoredFromDraft = ref(false);
const draftHydratedKey = ref('');
const suppressLeaveGuard = ref(false);
const showEvidenceModal = ref(false);
const selectedEvidence = ref<{ exerciseId: string; exerciseName: string } | null>(null);
const logViewMode = ref<'register' | 'evidences'>('register');
const loadingEvidencesList = ref(false);

type WorkoutDraft = {
  workoutName: string;
  workoutDuration: number;
  notes: string;
  workoutEffort: number;
  plannedExercises: UiExercise[];
  extraExercises: UiExercise[];
  sessionStart: number;
  savedAt: number;
};

const weekDaysUi = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const;

// ── Display-only: session elapsed timer ────────────────────────────────────
const sessionStart = ref(Date.now());
const sessionTick = ref(Date.now());
let sessionIntervalId: ReturnType<typeof setInterval>;
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

/** ---------- day key from SELECTED date (important) ---------- */
const dayKeyForSelectedDate = computed(() => {
  const d = parseYmdLocal(workoutDate.value);
  return weekDaysUi[d.getDay()];
});

/** ---------- helpers ---------- */

function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clamp(n: number | string | null | undefined, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

/** Normaliza sets a un count */
function normalizeSets(ex: UiExercise, desiredCount: number) {
  const count = clamp(desiredCount, 1, 20);
  if (!Array.isArray(ex.sets)) ex.sets = [];
  ex.setsCount = count;

  const cur = ex.sets.length;
  if (cur < count) {
    const last = ex.sets[cur - 1] ?? { reps: 10, weight: 0, completed: false };
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
    list.find((l: TrainingLog) => {
      const d = l.date instanceof Date ? l.date : new Date(l.date);
      return toLocalYmd(d) === targetDate;
    }) ?? null
  );
});

const currentTrainingLogId = computed(() => String(todayLog.value?.id || ''));

const isEditingExisting = computed(() => !!todayLog.value);
const allExercises = computed(() => [
  ...plannedExercises.value,
  ...extraExercises.value,
]);
const draftStorageKey = computed(() => {
  if (!clientId.value) return '';
  return `workout_draft_${clientId.value}_${workoutDate.value}`;
});

/** ---------- resolve plan week robustly ---------- */
const activePlanWeek = computed(() => {
  const plan = clientStore.getClientPlanTraininggetter;
  if (!plan) return null;

  return (
    plan.weeks?.find(
      (w: TrainingWeek) =>
        Number(w.weekNumber) ===
        getActiveWeekIndexFromAssignedAt(
          new Date(),
          plan.startDate instanceof Date ? plan.startDate : new Date(plan.startDate ?? Date.now()),
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
  return week.days?.find((d: TrainingDay) => d.day === key) ?? null;
});

/** ---------- UI actions ---------- */
const addExtraExercise = () => {
  showExerciseDrawer.value = true;
};

const addExtraExerciseFromLibrary = (exercise: ExerciseItem) => {
  extraExercises.value.push({
    source: 'extra',
    exerciseId: crypto.randomUUID(),
    planExerciseId: exercise.id,
    name: exercise.name,
    rest: 60,
    notes: '',
    setsCount: 3,
    sets: [
      { reps: 10, weight: 0, completed: false },
      { reps: 10, weight: 0, completed: false },
      { reps: 10, weight: 0, completed: false },
    ],
  } as UiExercise);
};

const removePlanned = (id: string) => {
  plannedExercises.value = plannedExercises.value.filter(
    (e: UiExercise) => e.exerciseId !== id,
  );
};
const removeExtra = (id: string) => {
  extraExercises.value = extraExercises.value.filter(
    (e: UiExercise) => e.exerciseId !== id,
  );
};

const isValidWorkout = computed(() => {
  return (
    !!clientId.value &&
    workoutName.value.trim() !== '' &&
    workoutDuration.value > 0 &&
    allExercises.value.length > 0 &&
    allExercises.value.every((e: UiExercise) => {
      const nameOk = String(e.name ?? '').trim() !== '';
      const setsOk = Array.isArray(e.sets) && e.sets.length > 0;
      return nameOk && setsOk;
    })
  );
});

const isDraftMode = computed(
  () =>
    !isEditingExisting.value &&
    !!draftStorageKey.value &&
    draftHydratedKey.value === draftStorageKey.value,
);

function serializeExercises(list: UiExercise[]) {
  return JSON.parse(JSON.stringify(list ?? []));
}

function normalizeDraftExercise(ex: Record<string, unknown>, fallbackSource: 'plan' | 'extra'): UiExercise {
  const setsRaw = Array.isArray(ex?.sets) ? ex.sets as Record<string, unknown>[] : [];
  const row: UiExercise = {
    source: (ex?.source as UiExercise['source']) ?? fallbackSource,
    planExerciseId: String(ex?.planExerciseId ?? ex?.exerciseId ?? crypto.randomUUID()),
    exerciseId: String(ex?.exerciseId ?? ex?.planExerciseId ?? crypto.randomUUID()),
    name: String(ex?.name ?? ''),
    rest: clamp(ex?.rest as number ?? 60, 0, 600),
    notes: String(ex?.notes ?? ''),
    setsCount: clamp(ex?.setsCount as number ?? setsRaw.length ?? 3, 1, 20),
    reps: 0,
    weight: 0,
    sets: setsRaw.map((s: Record<string, unknown>) => ({
      reps: clamp(s?.reps as number ?? 10, 0, 200),
      weight: clamp(s?.weight as number ?? 0, 0, 500),
      completed: (s?.completed as boolean) ?? false,
    })),
  };
  normalizeSets(row, row.setsCount);
  return row;
}

function clearWorkoutDraft() {
  if (typeof window === 'undefined' || !draftStorageKey.value) return;
  localStorage.removeItem(draftStorageKey.value);
}

function saveWorkoutDraft() {
  if (typeof window === 'undefined') return;
  if (!isDraftMode.value || !draftStorageKey.value) return;

  const payload: WorkoutDraft = {
    workoutName: workoutName.value,
    workoutDuration: Number(workoutDuration.value || 0),
    notes: notes.value,
    workoutEffort: Number(workoutEffort.value || 6),
    plannedExercises: serializeExercises(plannedExercises.value),
    extraExercises: serializeExercises(extraExercises.value),
    sessionStart: sessionStart.value,
    savedAt: Date.now(),
  };
  localStorage.setItem(draftStorageKey.value, JSON.stringify(payload));
}

function restoreWorkoutDraft() {
  if (typeof window === 'undefined' || !draftStorageKey.value) return false;

  const raw = localStorage.getItem(draftStorageKey.value);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as WorkoutDraft;

    workoutName.value = String(parsed.workoutName ?? workoutName.value);
    workoutDuration.value = clamp(parsed.workoutDuration ?? 0, 0, 600);
    notes.value = String(parsed.notes ?? '');
    workoutEffort.value = clamp(parsed.workoutEffort ?? 6, 1, 10);

    plannedExercises.value = Array.isArray(parsed.plannedExercises)
      ? parsed.plannedExercises.map((ex: UiExercise) =>
          normalizeDraftExercise(ex as unknown as Record<string, unknown>, 'plan'),
        )
      : plannedExercises.value;
    extraExercises.value = Array.isArray(parsed.extraExercises)
      ? parsed.extraExercises.map((ex: UiExercise) =>
          normalizeDraftExercise(ex as unknown as Record<string, unknown>, 'extra'),
        )
      : extraExercises.value;

    if (
      Number.isFinite(parsed.sessionStart) &&
      Number(parsed.sessionStart) > 0
    ) {
      sessionStart.value = Number(parsed.sessionStart);
    }
    sessionTick.value = Date.now();

    return true;
  } catch {
    localStorage.removeItem(draftStorageKey.value);
    return false;
  }
}

function initializeDraftMode() {
  if (!draftStorageKey.value || isEditingExisting.value) return;
  if (draftHydratedKey.value === draftStorageKey.value) return;

  const recovered = restoreWorkoutDraft();
  restoredFromDraft.value = recovered;
  showTrainingModeModal.value = !recovered;
  draftHydratedKey.value = draftStorageKey.value;
}

function enterTrainingMode() {
  showTrainingModeModal.value = false;
  if (!restoredFromDraft.value) {
    sessionStart.value = Date.now();
    sessionTick.value = Date.now();
  }
}

function exitFromTrainingModeModal() {
  suppressLeaveGuard.value = true;
  clearWorkoutDraft();
  router.push('/client');
}

function shouldWarnLeave() {
  return isDraftMode.value && !showTrainingModeModal.value;
}

/** ---------- merge: plan + log ---------- */
watch(
  [todayPlanWorkout, todayLog],
  ([planWorkout, log]) => {
    // ✅ no borres mientras el plan está cargando
    // console.log('here?')

    if (!planWorkout) return;

    // console.log('paso')

    // base desde plan con sets[] reales
    const base = (planWorkout.exercises ?? []).map((ex: Exercise) => {
      const setsCount = clamp(ex.sets ?? 3, 1, 20);
      const reps = clamp(ex.reps ?? 10, 0, 200);
      const weight = clamp(ex.weight ?? 0, 0, 500);

      const row: UiExercise = {
        source: 'plan',
        planExerciseId: ex.id,
        exerciseId: ex.id,
        name: ex.name ?? '',
        rest: clamp(ex.rest ?? 60, 0, 600),
        notes: '',
        reps: 0,
        weight: 0,
        setsCount,
        sets: Array.from({ length: setsCount }, () => ({
          reps,
          weight,
          completed: false,
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

      initializeDraftMode();
      return;
    }

    showTrainingModeModal.value = false;
    restoredFromDraft.value = false;
    draftHydratedKey.value = '';
    clearWorkoutDraft();

    // con log: campos base
    workoutName.value = String(
      log.name ??
        workoutName.value ??
        `Entrenamiento ${planWorkout.day}`,
    );
    workoutDuration.value = Number(log.duration ?? 0);
    notes.value = String(log.notes ?? '');
    workoutEffort.value = Number(log.effort ?? 6);

    // index log exercises
    const logMap = new Map<string, ExerciseLog>();
    for (const e of log.exercises ?? [])
      logMap.set(String(e.exerciseId), e);

    // merge planned
    plannedExercises.value = base.map((p: UiExercise) => {
      const le = logMap.get(String(p.planExerciseId));
      if (!le) return p;

      const savedSets = Array.isArray(le.sets) ? le.sets : [];
      const merged = { ...p };

      if (savedSets.length) {
        merged.sets = savedSets.map((s: { reps: number; weight: number; rpe?: number; completed: boolean }) => ({
          reps: clamp(s.reps, 0, 200),
          weight: clamp(s.weight, 0, 500),
          completed: s.completed ?? false,
        }));
        merged.setsCount = merged.sets.length;
        normalizeSets(merged, merged.setsCount);
      }

      return merged;
    });

    // extras: logs que NO están en el plan
    const planIds = new Set(base.map((x: UiExercise) => String(x.planExerciseId)));
    extraExercises.value = (log.exercises ?? [])
      .filter((e: ExerciseLog) => !planIds.has(String(e.exerciseId)))
      .map((e: ExerciseLog) => {
        const savedSets = Array.isArray(e.sets) ? e.sets : [];
        const row: UiExercise = {
          source: 'extra',
          exerciseId: crypto.randomUUID(),
          planExerciseId: e.exerciseId,
          name: e.exerciseName ?? '',
          rest: 60,
          notes: '',
          reps: 0,
          weight: 0,
          setsCount: clamp(savedSets.length || 3, 1, 20),
          sets: (savedSets.length
            ? savedSets
            : Array.from({ length: 3 }, () => ({
                reps: 10,
                weight: 0,
                completed: false,
              }))
          ).map((s: { reps: number; weight: number; rpe?: number; completed: boolean }) => ({
            reps: clamp(s.reps ?? 10, 0, 200),
            weight: clamp(s.weight ?? 0, 0, 500),
            completed: s.completed ?? false,
          })),
        };
        normalizeSets(row, row.setsCount);
        return row;
      });

    // Fetch last performance for all exercises
    const allIds = [
      ...plannedExercises.value.map((e: UiExercise) =>
        String(e.planExerciseId ?? e.exerciseId),
      ),
      ...extraExercises.value.map((e: UiExercise) =>
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

watch(
  [workoutName, workoutDuration, notes, workoutEffort, plannedExercises, extraExercises],
  () => {
    saveWorkoutDraft();
  },
  { deep: true },
);

watch(
  currentTrainingLogId,
  async (logId) => {
    if (!logId) return;
    await evidencesStore.loadEvidencesByLog(logId, true);
  },
  { immediate: true },
);

const myEvidences = computed(() => {
  const cid = clientId.value;
  if (!cid) return [];
  return [...evidencesStore.getClientEvidences(cid)].sort(
    (a: ExerciseEvidence, b: ExerciseEvidence) =>
      new Date(b.submittedAt).getTime() -
      new Date(a.submittedAt).getTime(),
  );
});

async function loadMyEvidences() {
  const cid = clientId.value;
  if (!cid) return;
  loadingEvidencesList.value = true;
  try {
    await evidencesStore.loadClientEvidences(cid, 100, 0);
    await evidencesStore.loadPendingCount(cid);
  } finally {
    loadingEvidencesList.value = false;
  }
}

watch(
  logViewMode,
  async (mode) => {
    if (mode !== 'evidences') return;
    await loadMyEvidences();
  },
  { immediate: false },
);

function openEvidenceForExercise(ex: UiExercise) {
  if (!currentTrainingLogId.value || !todayLog.value) {
    toast.error('Primero guarda el entrenamiento para poder subir evidencia');
    return;
  }
  selectedEvidence.value = {
    exerciseId: String(ex.planExerciseId ?? ex.exerciseId),
    exerciseName: String(ex.name ?? 'Ejercicio'),
  };
  showEvidenceModal.value = true;
}

function evidenceStatusForExercise(ex: UiExercise): 'none' | 'pending' | 'responded' {
  const logId = currentTrainingLogId.value;
  if (!logId) return 'none';
  const evidence = evidencesStore.getEvidenceByLogExercise(
    logId,
    String(ex.planExerciseId ?? ex.exerciseId),
  );
  if (!evidence) return 'none';
  return evidence.respondedAt ? 'responded' : 'pending';
}

/** ---------- save (upsert) ---------- */
const saveWorkout = async () => {
  const targetDate = parseYmdLocal(workoutDate.value);
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
      exercises: allExercises.value.map((ex: UiExercise) => {
        normalizeSets(
          ex,
          ex.setsCount ?? (Array.isArray(ex.sets) ? ex.sets.length : 3),
        );
        return {
          exerciseId: ex.planExerciseId ?? ex.exerciseId,
          exerciseName: String(ex.name ?? '').trim(),
          sets: (ex.sets ?? []).map((s: UiSet) => ({
            reps: clamp(s.reps, 0, 200),
            weight: clamp(s.weight, 0, 500),
            completed: s.completed ?? false,
          })),
        };
      }),
    };

    const { prs } = await logs.upsertTrainingLog(payload);
    clearWorkoutDraft();

    if (prs.length > 0) {
      currentPRs.value = prs;
      showPRModal.value = true;
    } else {
      router.push('/client');
    }
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'No se pudo guardar el entrenamiento';
  } finally {
    saving.value = false;
  }
};

const cancelWorkout = () => router.push('/client');

onBeforeRouteLeave(() => {
  if (suppressLeaveGuard.value) {
    suppressLeaveGuard.value = false;
    return true;
  }
  if (!shouldWarnLeave()) return true;

  saveWorkoutDraft();
  return window.confirm(
    'Estás en modo entrenamiento. Si sales, se guardará tu progreso en borrador. ¿Quieres salir?',
  );
});

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!shouldWarnLeave()) return;
  saveWorkoutDraft();
  event.preventDefault();
  event.returnValue = '';
};

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload));
onUnmounted(() =>
  window.removeEventListener('beforeunload', handleBeforeUnload),
);

// ── Display-only: real-time workout stats ──────────────────────────────────
const totalVolume = computed(() =>
  allExercises.value.reduce(
    (sum: number, ex: UiExercise) =>
      sum +
      (ex.sets ?? []).reduce(
        (s2: number, s: UiSet) =>
          s2 + (s.completed ? Number(s.reps ?? 0) * Number(s.weight ?? 0) : 0),
        0,
      ),
    0,
  ),
);
const completedSetsCount = computed(() =>
  allExercises.value.reduce(
    (n: number, ex: UiExercise) =>
      n + (ex.sets ?? []).filter((s: UiSet) => s.completed).length,
    0,
  ),
);
const totalSetsCount = computed(() =>
  allExercises.value.reduce(
    (n: number, ex: UiExercise) => n + (ex.sets ?? []).length,
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
  <div
    v-if="showTrainingModeModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
  >
    <div class="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl">
      <p class="text-xs font-bold uppercase tracking-widest text-primary">
        Modo entrenamiento
      </p>
      <h2 class="mt-2 text-lg font-bold text-foreground">
        Vas a entrar al registro de entrenamiento
      </h2>
      <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
        Para medir tu sesión completa, procura no salir de esta vista hasta terminar.
        Si sales por cualquier razón, guardaremos un borrador automático y lo retomaremos al volver.
      </p>
      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          @click="enterTrainingMode"
        >
          Entrar al modo entrenamiento
        </button>
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          @click="exitFromTrainingModeModal"
        >
          Salir
        </button>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       STICKY HEADER — name · timer · volume · progress
       ══════════════════════════════════════════════════════ -->
  <div
    class="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm"
  >
    <!-- Row 1: back · name · session timer · save -->
    <div class="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap sm:px-4">
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
        class="order-3 tabular-nums rounded bg-muted/40 px-2 py-1 font-mono text-sm text-muted-foreground sm:order-none sm:shrink-0"
      >
        {{ sessionElapsed }}
      </span>

      <!-- Save button -->
      <button
        type="button"
        @click="saveWorkout"
        :disabled="!isValidWorkout || saving"
        class="order-2 ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold transition-all sm:order-none sm:shrink-0 sm:px-4"
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
    <div class="flex items-center gap-3 px-3 pb-2.5 sm:gap-4 sm:px-4">
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
    <div class="inline-flex rounded-xl border border-border overflow-hidden bg-card">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="logViewMode === 'register' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        @click="logViewMode = 'register'"
      >
        Registrar
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-l border-border transition-colors"
        :class="logViewMode === 'evidences' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        @click="logViewMode = 'evidences'"
      >
        Evidencias
      </button>
    </div>

    <template v-if="logViewMode === 'register'">
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
      v-if="restoredFromDraft && !isEditingExisting"
      class="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
    >
      Se recuperó tu borrador local para continuar donde ibas.
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
            :show-evidence-button="true"
            :evidence-status="evidenceStatusForExercise(exercise)"
            :last-perf="
              lastPerformance[exercise.planExerciseId ?? exercise.exerciseId] ??
              null
            "
            @remove="removePlanned(exercise.exerciseId)"
            @evidence="openEvidenceForExercise(exercise)"
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
            :show-evidence-button="true"
            :evidence-status="evidenceStatusForExercise(exercise)"
            :last-perf="
              lastPerformance[exercise.planExerciseId ?? exercise.exerciseId] ??
              null
            "
            @remove="removeExtra(exercise.exerciseId)"
            @evidence="openEvidenceForExercise(exercise)"
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
        <p class="text-sm font-medium">+ Añadir ejercicio extra</p>
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
    </template>

    <template v-else>
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">Historial de evidencias enviadas y respuestas del trainer.</p>
        <button
          type="button"
          class="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          @click="loadMyEvidences"
          :disabled="loadingEvidencesList"
        >
          {{ loadingEvidencesList ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>

      <div v-if="loadingEvidencesList" class="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Cargando evidencias...
      </div>

      <div v-else-if="myEvidences.length === 0" class="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Aún no has enviado evidencias.
      </div>

      <div v-else class="space-y-3">
        <EvidenceThreadCard
          v-for="ev in myEvidences"
          :key="ev.id"
          :evidence="ev"
        />
      </div>
    </template>
  </div>

  <PRCelebrationModal
    v-if="showPRModal"
    :prs="currentPRs"
    @close="router.push('/client')"
  />

  <ExerciseSearchDrawer
    v-model:open="showExerciseDrawer"
    mode="log"
    :on-select="addExtraExerciseFromLibrary"
  />

  <EvidenceModal
    :open="showEvidenceModal"
    :training-log-id="currentTrainingLogId"
    :exercise-id="selectedEvidence?.exerciseId || ''"
    :exercise-name="selectedEvidence?.exerciseName || ''"
    @close="showEvidenceModal = false"
    @submitted="currentTrainingLogId && evidencesStore.loadEvidencesByLog(currentTrainingLogId, true)"
  />
</template>
