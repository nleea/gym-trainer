<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { usePlansStore } from '../stores/plan.store';
import { useClientsStore } from '../stores/clients.store';
import { useAuthStore } from '@/stores/auth';

import type { TrainingWeek, TrainingDay, Exercise } from '../types';

import {
  useExerciseLibrary,
  type Exercise as LibraryExercise,
  type MuscleGroup as LibraryMuscleGroup,
} from '../repo/useExerciseLibrary';

import { useAppToast } from '@/composables/useAppToast'
import ExerciseSearchDrawer from '@/components/ExerciseSearchDrawer.vue'
import type { ExerciseItem } from '@/repo/exercisesRepo'
const toast = useAppToast()

type EditableTrainingPlan = {
  id?: string;
  name: string;
  description?: string;
  weeks: TrainingWeek[];
  isTemplate?: boolean;
  is_template?: boolean;
  sourceTemplateId?: string | null;
  source_template_id?: string | null;
};

const props = defineProps<{
  modelValue?: EditableTrainingPlan | null;
  save?: () => Promise<void>;
  action?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: EditableTrainingPlan): void;
  (e: 'saved', payload: { id: string }): void;
}>();

const route = useRoute();
const router = useRouter();
const plansStore = usePlansStore();
const clientStore = useClientsStore();

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const {
  addTrainingPlan,
  getTrainingPlanLocal: getTrainingPlan,
  loadTrainingPlans,
  assignTrainingPlan,
} = plansStore;

const { activeClients } = clientStore;

const clientId = route.params.clientId as string | undefined;

/** ---------- helpers ---------- */
const defaultPlan = (): EditableTrainingPlan => ({
  name: '',
  description: '',
  weeks: [{ weekNumber: 1, days: [] }],
});
const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** ---------- v-model plan ---------- */
const plan = computed<EditableTrainingPlan>({
  get() {
    return props.modelValue ? props.modelValue : defaultPlan();
  },
  set(v) {
    emit('update:modelValue', v);
  },
});

const isTemplateEditing = computed(
  () => Boolean(plan.value.isTemplate || plan.value.is_template),
);
const sourceTemplateLabel = computed(() => {
  const source = plan.value.sourceTemplateId || plan.value.source_template_id;
  return source ? String(source) : 'Sin origen';
});

/** ---------- init ---------- */
onMounted(async () => {
  await loadTrainingPlans();

  if (!props.modelValue) {
    plan.value = defaultPlan();
  }

  const idFromRoute = route.params.id as string | undefined;
  if (idFromRoute) {
    const p = getTrainingPlan(idFromRoute);
    if (p) plan.value = deepClone(p);
  }
});

/** ---------- UI state ---------- */
const showExerciseModal = ref(false);
const showExerciseSearchDrawer = ref(false);
const currentWeekIndex = ref(0);
const currentDayIndex = ref(0);

const showAssignModal = ref(false);
const selectedClientId = ref((route.params.clientId as string) || '');
const startDate = ref('');
const duration = ref(4);

/** active week tab */
const activeWeek = ref(0);
watch(() => plan.value.weeks.length, (n) => {
  if (activeWeek.value >= n) activeWeek.value = n - 1;
});

const daysOfWeek = [
  { key: 'lunes', label: 'Lunes', short: 'Lun', emoji: '1️⃣' },
  { key: 'martes', label: 'Martes', short: 'Mar', emoji: '2️⃣' },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié', emoji: '3️⃣' },
  { key: 'jueves', label: 'Jueves', short: 'Jue', emoji: '4️⃣' },
  { key: 'viernes', label: 'Viernes', short: 'Vie', emoji: '5️⃣' },
  { key: 'sabado', label: 'Sábado', short: 'Sáb', emoji: '6️⃣' },
  { key: 'domingo', label: 'Domingo', short: 'Dom', emoji: '7️⃣' },
] as const;

const planMuscleGroups = [
  'Piernas', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Full Body',
];

const muscleGroupStyle: Record<string, string> = {
  Piernas: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Pecho: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  Espalda: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  Hombros: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  Brazos: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  Core: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Cardio: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'Full Body': 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
};

function muscleStyle(group: string) {
  return muscleGroupStyle[group] ?? 'bg-muted text-muted-foreground';
}

/** ---------- actions weeks/days ---------- */
const addWeek = () => {
  if(plan.value.weeks.length >= 4) {
    toast.info('Solo puedes crear 4 semanas')
    return
  }
  plan.value = {
    ...plan.value,
    weeks: [
      ...plan.value.weeks,
      { weekNumber: plan.value.weeks.length + 1, days: [] },
    ],
  };
  activeWeek.value = plan.value.weeks.length - 1;
};

const removeWeek = (index: number) => {
  if (plan.value.weeks.length <= 1) return;
  const weeks = [...plan.value.weeks];
  weeks.splice(index, 1);
  weeks.forEach((w, i) => (w.weekNumber = i + 1));
  plan.value = { ...plan.value, weeks };
};

const addDay = (weekIndex: number, dayKey: TrainingDay['day']) => {
  const weeks = deepClone(plan.value.weeks);
  const week = weeks[weekIndex];

  if (!week.days.find((d) => d.day === dayKey)) {
    week.days.push({ day: dayKey, exercises: [] });
    const order = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
    week.days.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  }

  plan.value = { ...plan.value, weeks };
};

const removeDay = (weekIndex: number, dayIndex: number) => {
  const weeks = deepClone(plan.value.weeks);
  weeks[weekIndex].days.splice(dayIndex, 1);
  plan.value = { ...plan.value, weeks };
};

const removeExercise = (weekIndex: number, dayIndex: number, exerciseIndex: number) => {
  const weeks = deepClone(plan.value.weeks);
  weeks[weekIndex].days[dayIndex].exercises.splice(exerciseIndex, 1);
  plan.value = { ...plan.value, weeks };
};

/** Computed version tied to activeWeek — guarantees reactivity when plan loads async */
const availableDays = computed(() => {
  const week = plan.value.weeks[activeWeek.value];
  if (!week) return [...daysOfWeek];
  const used = new Set(week.days.map((d) => d.day.trim().toLowerCase()));
  return daysOfWeek.filter((d) => !used.has(d.key));
});

/** ======================================================================
 *  MODAL "AGREGAR EJERCICIO" (BIBLIOTECA + MANUAL)
 * ====================================================================== */
const exerciseModalTab = ref<'library' | 'manual'>('library');

const newExercise = ref<Partial<Exercise>>({
  name: '', muscleGroup: '', sets: 3, reps: '12', weight: 0, rest: '60s', notes: '',
});

const openExerciseModal = (weekIndex: number, dayIndex: number) => {
  currentWeekIndex.value = weekIndex;
  currentDayIndex.value = dayIndex;
  exerciseModalTab.value = 'library';
  newExercise.value = { name: '', muscleGroup: '', sets: 3, reps: '12', weight: 0, rest: '60s', notes: '' };
  libSearch.value = '';
  libGroup.value = 'Todos';
  selectedLibraryId.value = '';
  libSets.value = 3;
  libReps.value = '12';
  libWeight.value = 0;
  libRest.value = '60s';
  libNotes.value = '';
  showExerciseModal.value = true;
};

const applyExerciseFromLibrary = (exercise: ExerciseItem) => {
  newExercise.value.name = exercise.name
  newExercise.value.muscleGroup = exercise.bodyPart || ''
  exerciseModalTab.value = 'manual'
}

const addExerciseManualToPlan = () => {
  if (!newExercise.value.name || !newExercise.value.muscleGroup) return;

  const exercise: Exercise = {
    id: crypto.randomUUID(),
    name: String(newExercise.value.name),
    muscleGroup: String(newExercise.value.muscleGroup),
    sets: Number(newExercise.value.sets || 3),
    reps: String(newExercise.value.reps || '12'),
    weight: Number(newExercise.value.weight ?? 0),
    rest: String(newExercise.value.rest ?? ''),
    notes: String(newExercise.value.notes ?? ''),
  };

  const weeks = deepClone(plan.value.weeks);
  weeks[currentWeekIndex.value].days[currentDayIndex.value].exercises.push(exercise);
  plan.value = { ...plan.value, weeks };
  showExerciseModal.value = false;
};

/** ======================================================================
 *  BIBLIOTECA del entrenador
 * ====================================================================== */
const coachId = computed(() => user.value?.uid || '');
const libApi = ref<ReturnType<typeof useExerciseLibrary> | null>(null);

watch(coachId, (id) => {
  if (!id) return;
  libApi.value?.stop?.();
  libApi.value = useExerciseLibrary(id);
  libApi.value?.start?.();
}, { immediate: true });
onUnmounted(() => libApi.value?.stop?.());

const library = computed<LibraryExercise[]>(() => libApi.value?.library ?? []);
const loadingLibrary = computed(() => libApi.value?.loading ?? false);

const libSearch = ref('');
const libGroup = ref<LibraryMuscleGroup | 'Todos'>('Todos');
const selectedLibraryId = ref<string>('');

const libraryGroups: (LibraryMuscleGroup | 'Todos')[] = [
  'Todos', 'Piernas', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core', 'Cardio',
];

const filteredLibrary = computed(() => {
  const q = libSearch.value.trim().toLowerCase();
  return library.value.filter((ex) => {
    const matchGroup = libGroup.value === 'Todos' || ex.muscleGroup === libGroup.value;
    const matchSearch = !q || ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q) || (ex.equipment ?? '').toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });
});

const libSets = ref<number>(3);
const libReps = ref<string>('12');
const libWeight = ref<number>(0);
const libRest = ref<string>('60s');
const libNotes = ref<string>('');

const addExerciseFromLibraryToPlan = () => {
  if (!selectedLibraryId.value) return;
  const ex = library.value.find((x) => x.id === selectedLibraryId.value);
  if (!ex) return;

  const exercise: Exercise = {
    id: crypto.randomUUID(),
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    sets: libSets.value,
    reps: libReps.value,
    weight: Number(libWeight.value),
    rest: String(libRest.value),
    notes: String(libNotes.value),
  };

  const weeks = deepClone(plan.value.weeks);
  weeks[currentWeekIndex.value].days[currentDayIndex.value].exercises.push(exercise);
  plan.value = { ...plan.value, weeks };
  showExerciseModal.value = false;
};

/** biblioteca: crear / editar / eliminar */
const showCreateLibraryExerciseModal = ref(false);
const showEditLibraryExerciseModal = ref(false);

const creatingLib = ref(false);
const savingLibEdit = ref(false);
const deletingLib = ref(false);

const libNewName = ref('');
const libNewGroup = ref<LibraryMuscleGroup>('Piernas');
const libNewEquipment = ref('');
const libNewNotes = ref('');

const openCreateLibraryExercise = () => {
  libNewName.value = '';
  libNewGroup.value = 'Piernas';
  libNewEquipment.value = '';
  libNewNotes.value = '';
  showCreateLibraryExerciseModal.value = true;
};

const createLibraryExercise = async () => {
  if (!libApi.value) return;
  if (!libNewName.value.trim()) return;
  creatingLib.value = true;
  try {
    await libApi.value.createExercise({
      name: libNewName.value.trim(),
      muscleGroup: libNewGroup.value,
      equipment: libNewEquipment.value.trim() || undefined,
      notes: libNewNotes.value.trim() || undefined,
      active: true,
    });
    showCreateLibraryExerciseModal.value = false;
  } finally {
    creatingLib.value = false;
  }
};

const editingLibId = ref<string | null>(null);
const libEditName = ref('');
const libEditGroup = ref<LibraryMuscleGroup>('Piernas');
const libEditEquipment = ref('');
const libEditNotes = ref('');

const openEditLibraryExercise = (ex: LibraryExercise) => {
  editingLibId.value = ex.id;
  libEditName.value = ex.name ?? '';
  libEditGroup.value = ex.muscleGroup;
  libEditEquipment.value = ex.equipment ?? '';
  libEditNotes.value = ex.notes ?? '';
  showEditLibraryExerciseModal.value = true;
};

const saveEditLibraryExercise = async () => {
  if (!libApi.value) return;
  if (!editingLibId.value) return;
  if (!libEditName.value.trim()) return;
  savingLibEdit.value = true;
  try {
    await libApi.value.updateExercise(editingLibId.value, {
      name: libEditName.value.trim(),
      muscleGroup: libEditGroup.value,
      equipment: libEditEquipment.value.trim() || undefined,
      notes: libEditNotes.value.trim() || undefined,
    });
    showEditLibraryExerciseModal.value = false;
    editingLibId.value = null;
  } finally {
    savingLibEdit.value = false;
  }
};

const deleteLibraryExercise = async (ex: LibraryExercise) => {
  if (!libApi.value) return;
  const ok = confirm(`¿Eliminar "${ex.name}"?`);
  if (!ok) return;
  deletingLib.value = true;
  try {
    await libApi.value.updateExercise(ex.id, { active: false });
    if (selectedLibraryId.value === ex.id) selectedLibraryId.value = '';
  } finally {
    deletingLib.value = false;
  }
};

/** ---------- save plan ---------- */
const saving = ref(false);

const handleSave = async () => {
  if (!plan.value.name) return;

  const payload = {
    name: plan.value.name,
    description: plan.value.description,
    weeks: plan.value.weeks,
  };

  saving.value = true;
  try {
    if (props.save && props.action) {
      await props.save();
      toast.success('Plan guardado');
      return;
    }

    if (plan.value.id && clientId) {
      await clientStore.updatePlanTraining(clientId, plan.value.id, payload);
      emit('saved', { id: plan.value.id });
    } else {
      const newId = await addTrainingPlan(payload);
      plan.value = { ...plan.value, id: newId.id! };
      emit('saved', { id: newId.id ?? '' });
    }
    toast.success('Plan guardado');
  } finally {
    saving.value = false;
  }
};

/** ---------- assign ---------- */
const handleAssign = () => {
  if (!selectedClientId.value || !startDate.value) return;
  if (!plan.value.id) return;

  const start = new Date(startDate.value);
  const end = new Date(start);
  end.setDate(end.getDate() + duration.value * 7);

  assignTrainingPlan(plan.value.id, selectedClientId.value, start, end);
  showAssignModal.value = false;
  toast.success('Plan asignado');
};

/** ---------- helpers counts ---------- */
function totalExercises(week: TrainingWeek) {
  return week.days.reduce((s, d) => s + d.exercises.length, 0);
}

function dayLabel(key: string) {
  return daysOfWeek.find(d => d.key === key)?.label ?? key;
}
</script>

<template>
  <div class="flex flex-col min-h-0">

    <!-- ══════════════════════════════════════════
         STICKY HEADER
         ══════════════════════════════════════════ -->
    <div class="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4 py-3">
      <!-- Back -->
      <button
        @click="router.back()"
        class="flex h-9 w-9 items-center justify-center rounded-xl border bg-card text-muted-foreground hover:bg-muted transition-colors shrink-0"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      <!-- Plan name inline -->
      <input
        v-model="plan.name"
        type="text"
        placeholder="Nombre del plan..."
        class="min-w-0 flex-1 bg-transparent text-lg font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />

      <!-- Assign (only after save) -->
      <button
        v-if="plan.id"
        @click="showAssignModal = true"
        class="hidden sm:flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/>
        </svg>
        Asignar
      </button>

      <!-- Save -->
      <button
        @click="handleSave"
        :disabled="saving || !plan.name"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shrink-0"
      >
        <svg v-if="!saving" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <svg v-else class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        {{ saving ? 'Guardando…' : (isTemplateEditing ? 'Guardar plantilla' : 'Guardar cambios') }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════
         BODY
         ══════════════════════════════════════════ -->
    <div class="flex-1 space-y-5 p-4 lg:p-6">

      <div
        v-if="isTemplateEditing"
        class="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        ⚠️ Estás editando una plantilla global. Los cambios aplicarán a futuras asignaciones. Los clientes que ya tienen esta plantilla NO se ven afectados.
      </div>
      <div
        v-else-if="plan.id"
        class="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
      >
        <strong class="text-foreground">Plan personalizado</strong> · origen: {{ sourceTemplateLabel }}
      </div>

      <!-- Description -->
      <div class="rounded-2xl border bg-card p-4 shadow-sm">
        <label class="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</label>
        <textarea
          v-model="plan.description"
          rows="2"
          class="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          placeholder="Objetivo y características del plan…"
        />
      </div>

      <!-- ══════════ WEEK TABS ══════════ -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          v-for="(week, wi) in plan.weeks"
          :key="wi"
          @click="activeWeek = wi"
          class="group relative flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-5 py-3 transition-all"
          :class="activeWeek === wi
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-transparent bg-card hover:border-border hover:bg-muted/30'"
        >
          <span class="text-xs font-medium uppercase tracking-wide"
            :class="activeWeek === wi ? 'text-primary' : 'text-muted-foreground'">
            S{{ week.weekNumber }}
          </span>
          <span class="text-[10px]"
            :class="activeWeek === wi ? 'text-primary/70' : 'text-muted-foreground/60'">
            {{ week.days.length }}d · {{ totalExercises(week) }}ej
          </span>

          <!-- Remove week btn -->
          <button
            v-if="plan.weeks.length > 1"
            @click.stop="removeWeek(wi)"
            class="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border bg-card text-muted-foreground hover:border-rose-300 hover:text-rose-500 group-hover:flex"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </button>

        <!-- Add week -->
        <button
          @click="addWeek"
          :disabled="plan.weeks.length >= 4"
          class="flex shrink-0 items-center gap-1 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Semana
        </button>
      </div>

      <!-- ══════════ ACTIVE WEEK VIEW ══════════ -->
      <div v-if="plan.weeks[activeWeek]" class="space-y-4">

        <!-- Available days to add -->
        <div v-if="availableDays.length > 0" class="flex flex-wrap gap-2">
          <button
            v-for="day in availableDays"
            :key="day.key"
            @click="addDay(activeWeek, day.key)"
            class="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-95"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            {{ day.label }}
          </button>
        </div>

        <!-- Empty week -->
        <div
          v-if="plan.weeks[activeWeek].days.length === 0"
          class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-14 text-center"
        >
          <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">🏋️</div>
          <p class="text-sm font-medium text-muted-foreground">Sin días configurados</p>
          <p class="mt-1 text-xs text-muted-foreground/70">Añade días usando los botones de arriba</p>
        </div>

        <!-- Day cards -->
        <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="(day, dayIndex) in plan.weeks[activeWeek].days"
            :key="day.day"
            class="flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden"
          >
            <!-- Day header -->
            <div class="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {{ dayLabel(day.day).charAt(0) }}
                </span>
                <span class="font-semibold text-foreground capitalize">{{ dayLabel(day.day) }}</span>
                <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {{ day.exercises.length }} ej
                </span>
              </div>

              <div class="flex items-center gap-1">
                <button
                  @click="openExerciseModal(activeWeek, dayIndex)"
                  class="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                  </svg>
                  Añadir
                </button>
                <button
                  @click="removeDay(activeWeek, dayIndex)"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950 transition-colors"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Exercise list -->
            <div class="flex-1 divide-y divide-border/60">
              <div
                v-for="(exercise, exIdx) in day.exercises"
                :key="exercise.id"
                class="group flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <!-- Index bubble -->
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {{ exIdx + 1 }}
                </span>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-foreground">{{ exercise.name }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span class="font-medium text-foreground/80">{{ exercise.sets }}×{{ exercise.reps }}</span>
                    <span v-if="exercise.weight">{{ exercise.weight }}kg</span>
                    <span v-if="exercise.rest">⏱ {{ exercise.rest }}</span>
                  </div>
                  <p v-if="exercise.notes" class="mt-1 truncate text-[11px] text-muted-foreground/70 italic">{{ exercise.notes }}</p>
                </div>

                <div class="flex shrink-0 flex-col items-end gap-1.5">
                  <span class="rounded-lg px-2 py-0.5 text-[10px] font-semibold" :class="muscleStyle(exercise.muscleGroup)">
                    {{ exercise.muscleGroup }}
                  </span>
                  <button
                    @click="removeExercise(activeWeek, dayIndex, exIdx)"
                    class="hidden rounded p-0.5 text-muted-foreground hover:text-rose-500 group-hover:block transition-colors"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Empty day -->
              <div v-if="day.exercises.length === 0" class="px-4 py-8 text-center">
                <p class="text-xs text-muted-foreground/70">Sin ejercicios · Pulsa Añadir</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         MODAL: AGREGAR EJERCICIO
         ══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showExerciseModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showExerciseModal = false"/>

        <div class="relative flex w-full flex-col rounded-t-3xl sm:rounded-2xl border bg-card sm:max-w-5xl overflow-hidden" style="max-height: 92vh">
          <!-- Modal header -->
          <div class="flex items-center justify-between border-b px-5 py-4 shrink-0">
            <div>
              <h2 class="text-base font-semibold text-foreground">Agregar ejercicio</h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ dayLabel(plan.weeks[currentWeekIndex]?.days[currentDayIndex]?.day ?? '') }} · Semana {{ currentWeekIndex + 1 }}
              </p>
            </div>
            <button @click="showExerciseModal = false" class="flex h-8 w-8 items-center justify-center rounded-xl border text-muted-foreground hover:bg-muted transition-colors">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex border-b px-5 shrink-0">
            <button
              v-for="tab in [{ key: 'library', label: 'Biblioteca' }, { key: 'manual', label: 'Manual' }]"
              :key="tab.key"
              type="button"
              @click="exerciseModalTab = tab.key as 'library' | 'manual'"
              class="mr-4 border-b-2 py-3 text-sm font-medium transition-colors"
              :class="exerciseModalTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-auto">

            <!-- ── TAB: BIBLIOTECA ── -->
            <div v-if="exerciseModalTab === 'library'" class="flex flex-col lg:flex-row h-full min-h-0">

              <!-- Left: exercise list -->
              <div class="flex flex-col border-b lg:border-b-0 lg:border-r lg:w-3/5 min-h-0">
                <!-- Search + filter -->
                <div class="flex items-center gap-2 p-4 border-b shrink-0">
                  <div class="relative flex-1">
                    <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
                    </svg>
                    <input v-model="libSearch" type="text" placeholder="Buscar ejercicio…"
                      class="w-full rounded-xl border bg-muted/30 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <button type="button" @click="openCreateLibraryExercise"
                    class="flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors shrink-0">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                    </svg>
                    Nuevo
                  </button>
                </div>

                <!-- Group filter pills -->
                <div class="flex gap-1.5 overflow-x-auto px-4 py-2 border-b shrink-0">
                  <button
                    v-for="g in libraryGroups" :key="g"
                    type="button"
                    @click="libGroup = g"
                    class="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    :class="libGroup === g
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'"
                  >
                    {{ g }}
                  </button>
                </div>

                <!-- Exercise list -->
                <div class="flex-1 overflow-auto divide-y divide-border/50">
                  <div v-if="loadingLibrary" class="flex items-center justify-center py-10">
                    <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/>
                  </div>

                  <label
                    v-for="ex in filteredLibrary"
                    :key="ex.id"
                    class="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    :class="selectedLibraryId === ex.id ? 'bg-primary/5' : ''"
                  >
                    <!-- Radio -->
                    <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                      :class="selectedLibraryId === ex.id ? 'border-primary bg-primary' : 'border-border'">
                      <div v-if="selectedLibraryId === ex.id" class="h-2 w-2 rounded-full bg-white"/>
                      <input type="radio" name="libPick" :value="ex.id" v-model="selectedLibraryId" class="sr-only"/>
                    </div>

                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-foreground">{{ ex.name }}</p>
                      <div class="mt-1 flex flex-wrap gap-1.5">
                        <span class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" :class="muscleStyle(ex.muscleGroup)">
                          {{ ex.muscleGroup }}
                        </span>
                        <span v-if="ex.equipment" class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {{ ex.equipment }}
                        </span>
                      </div>
                    </div>

                    <div class="flex gap-1 shrink-0">
                      <button type="button" @click.prevent="openEditLibraryExercise(ex)"
                        class="rounded-lg border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors">
                        Editar
                      </button>
                      <button type="button" @click.prevent="deleteLibraryExercise(ex)" :disabled="deletingLib"
                        class="rounded-lg border px-2 py-1 text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors disabled:opacity-50">
                        ✕
                      </button>
                    </div>
                  </label>

                  <div v-if="!loadingLibrary && filteredLibrary.length === 0"
                    class="flex flex-col items-center justify-center py-12 text-center">
                    <p class="text-sm text-muted-foreground">Sin ejercicios</p>
                    <button type="button" @click="openCreateLibraryExercise"
                      class="mt-3 rounded-xl border px-4 py-2 text-sm text-primary hover:bg-primary/5">
                      + Crear primero
                    </button>
                  </div>
                </div>
              </div>

              <!-- Right: params -->
              <div class="shrink-0 lg:w-2/5 p-5 space-y-4">
                <h4 class="text-sm font-semibold text-foreground">
                  {{ selectedLibraryId ? library.find(x => x.id === selectedLibraryId)?.name : 'Selecciona un ejercicio' }}
                </h4>

                <div v-if="!selectedLibraryId" class="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <div class="mb-3 text-4xl">👈</div>
                  <p class="text-sm">Elige un ejercicio de la lista</p>
                </div>

                <template v-else>
                  <div class="grid grid-cols-2 gap-3">
                    <label class="space-y-1">
                      <span class="text-xs font-medium text-muted-foreground">Series</span>
                      <input v-model.number="libSets" type="number" min="1"
                        class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </label>
                    <label class="space-y-1">
                      <span class="text-xs font-medium text-muted-foreground">Repeticiones</span>
                      <input v-model="libReps" type="text" placeholder="12"
                        class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </label>
                    <label class="space-y-1">
                      <span class="text-xs font-medium text-muted-foreground">Peso (kg)</span>
                      <input v-model.number="libWeight" type="number"
                        class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </label>
                    <label class="space-y-1">
                      <span class="text-xs font-medium text-muted-foreground">Descanso</span>
                      <input v-model="libRest" type="text" placeholder="60s"
                        class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </label>
                  </div>

                  <label class="block space-y-1">
                    <span class="text-xs font-medium text-muted-foreground">Notas (opcional)</span>
                    <textarea v-model="libNotes" rows="2" placeholder="Técnica, variantes…"
                      class="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                  </label>

                  <button type="button" @click="addExerciseFromLibraryToPlan"
                    class="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all">
                    Añadir al plan
                  </button>
                </template>
              </div>
            </div>

            <!-- ── TAB: MANUAL ── -->
            <div v-else class="p-5">
              <p class="mb-4 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                No se guarda en la biblioteca del entrenador.
              </p>

              <form @submit.prevent="addExerciseManualToPlan" class="space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="space-y-1 sm:col-span-2">
                    <span class="text-xs font-medium text-muted-foreground">Nombre *</span>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        @click="showExerciseSearchDrawer = true"
                        class="rounded-xl border px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Buscar ejercicio
                      </button>
                      <input
                        v-model="newExercise.name"
                        type="text"
                        required
                        placeholder="Ejercicio seleccionado..."
                        class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        readonly
                      />
                    </div>
                  </label>

                  <label class="space-y-1 sm:col-span-2">
                    <span class="text-xs font-medium text-muted-foreground">Grupo muscular *</span>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="g in planMuscleGroups" :key="g"
                        type="button"
                        @click="newExercise.muscleGroup = g"
                        class="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                        :class="newExercise.muscleGroup === g
                          ? muscleStyle(g) + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'"
                      >
                        {{ g }}
                      </button>
                    </div>
                  </label>

                  <label class="space-y-1">
                    <span class="text-xs font-medium text-muted-foreground">Series</span>
                    <input v-model.number="newExercise.sets" type="number" min="1"
                      class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                  </label>
                  <label class="space-y-1">
                    <span class="text-xs font-medium text-muted-foreground">Reps</span>
                    <input v-model="newExercise.reps" type="text" placeholder="10-12"
                      class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                  </label>
                  <label class="space-y-1">
                    <span class="text-xs font-medium text-muted-foreground">Peso (kg)</span>
                    <input v-model.number="newExercise.weight" type="number"
                      class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                  </label>
                  <label class="space-y-1">
                    <span class="text-xs font-medium text-muted-foreground">Descanso</span>
                    <input v-model="newExercise.rest" type="text" placeholder="60s"
                      class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                  </label>
                  <label class="space-y-1 sm:col-span-2">
                    <span class="text-xs font-medium text-muted-foreground">Notas</span>
                    <textarea v-model="newExercise.notes" rows="2" placeholder="Opcional…"
                      class="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                  </label>
                </div>

                <div class="flex gap-3 pt-1">
                  <button type="button" @click="showExerciseModal = false"
                    class="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" :disabled="!newExercise.name || !newExercise.muscleGroup"
                    class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40">
                    Añadir al plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════
         MODAL: CREAR EJERCICIO EN BIBLIOTECA
         ══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showCreateLibraryExerciseModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showCreateLibraryExerciseModal = false"/>
        <div class="relative w-full max-w-md rounded-2xl border bg-card shadow-xl overflow-hidden">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <h2 class="text-base font-semibold">Nuevo ejercicio (Biblioteca)</h2>
            <button @click="showCreateLibraryExerciseModal = false" class="flex h-8 w-8 items-center justify-center rounded-xl border hover:bg-muted">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="createLibraryExercise" class="space-y-4 p-5">
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Nombre *</span>
              <input v-model="libNewName" type="text" required class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Grupo muscular *</span>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="g in libraryGroups.filter(g => g !== 'Todos')" :key="g" type="button"
                  @click="libNewGroup = g as LibraryMuscleGroup"
                  class="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                  :class="libNewGroup === g ? muscleStyle(g) + ' ring-1 ring-current' : 'bg-muted text-muted-foreground'">
                  {{ g }}
                </button>
              </div>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Equipo (opcional)</span>
              <input v-model="libNewEquipment" type="text" class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Notas (opcional)</span>
              <textarea v-model="libNewNotes" rows="2" class="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <div class="flex gap-3 pt-1">
              <button type="button" @click="showCreateLibraryExerciseModal = false"
                class="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button type="submit" :disabled="creatingLib"
                class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {{ creatingLib ? 'Creando…' : 'Crear' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════
         MODAL: EDITAR EJERCICIO EN BIBLIOTECA
         ══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showEditLibraryExerciseModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showEditLibraryExerciseModal = false"/>
        <div class="relative w-full max-w-md rounded-2xl border bg-card shadow-xl overflow-hidden">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <h2 class="text-base font-semibold">Editar ejercicio</h2>
            <button @click="showEditLibraryExerciseModal = false" class="flex h-8 w-8 items-center justify-center rounded-xl border hover:bg-muted">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="saveEditLibraryExercise" class="space-y-4 p-5">
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Nombre *</span>
              <input v-model="libEditName" type="text" required class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Grupo muscular *</span>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="g in libraryGroups.filter(g => g !== 'Todos')" :key="g" type="button"
                  @click="libEditGroup = g as LibraryMuscleGroup"
                  class="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                  :class="libEditGroup === g ? muscleStyle(g) + ' ring-1 ring-current' : 'bg-muted text-muted-foreground'">
                  {{ g }}
                </button>
              </div>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Equipo (opcional)</span>
              <input v-model="libEditEquipment" type="text" class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Notas (opcional)</span>
              <textarea v-model="libEditNotes" rows="2" class="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <div class="flex gap-3 pt-1">
              <button type="button" @click="showEditLibraryExerciseModal = false"
                class="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button type="submit" :disabled="savingLibEdit"
                class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {{ savingLibEdit ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════
         MODAL: ASIGNAR PLAN
         ══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showAssignModal = false"/>
        <div class="relative w-full max-w-sm rounded-2xl border bg-card shadow-xl overflow-hidden">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <h2 class="text-base font-semibold">Asignar plan a cliente</h2>
            <button @click="showAssignModal = false" class="flex h-8 w-8 items-center justify-center rounded-xl border hover:bg-muted">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="handleAssign" class="space-y-4 p-5">
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Cliente *</span>
              <select v-model="selectedClientId" required class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Seleccionar cliente…</option>
                <option v-for="c in activeClients" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Fecha de inicio *</span>
              <input v-model="startDate" type="date" required class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-muted-foreground">Duración (semanas)</span>
              <input v-model.number="duration" type="number" min="1" max="52" class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
            </label>
            <div class="flex gap-3 pt-1">
              <button type="button" @click="showAssignModal = false"
                class="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button type="submit" :disabled="!plan.id"
                class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40">
                Asignar
              </button>
            </div>
            <p v-if="!plan.id" class="text-xs text-center text-muted-foreground">Guarda el plan primero.</p>
          </form>
        </div>
      </div>
    </Teleport>

    <ExerciseSearchDrawer
      v-model:open="showExerciseSearchDrawer"
      mode="plan"
      :on-select="applyExerciseFromLibrary"
    />

  </div>
</template>
