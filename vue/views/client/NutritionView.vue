<template>
  <div class="space-y-4 sm:space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-foreground sm:text-2xl">{{ t('client.nutrition.title') }}</h1>
        <p class="text-sm text-muted-foreground">
          {{ t('client.nutrition.subtitle') }}
        </p>
      </div>
      <!-- Date nav -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          @click="shiftDate(-1)"
          class="rounded-lg border p-2 text-muted-foreground hover:bg-muted/40"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="goToday"
          class="rounded-lg border px-3 py-2 text-sm font-medium"
          :class="
            isToday
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-foreground hover:bg-muted/40'
          "
        >
          {{ dateLabel }}
        </button>
        <button
          type="button"
          @click="shiftDate(1)"
          :disabled="isToday"
          class="rounded-lg border p-2 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- No plan -->
    <div
      v-if="!nutritionPlan"
      class="flex flex-col items-center justify-center rounded-2xl border bg-card py-16 text-center shadow-sm"
    >
      <div
        class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-3xl"
      >
        🥗
      </div>
      <h3 class="text-lg font-medium text-foreground">{{ t('client.nutrition.noPlan') }}</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Contacta a tu entrenador para que te asigne uno
      </p>
    </div>

    <template v-else>
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        ></div>
      </div>

      <template v-else>
        <!-- Macro rings -->
        <MacroRingsCard v-if="summary" :macros="summary.today_macros" />

        <!-- Water tracker -->
        <WaterTracker
          :consumed="summary?.today_macros.water_ml.consumed ?? 0"
          :target="nutritionPlan.water_ml ?? 2000"
          @update="onWaterUpdate"
        />

        <!-- Day selector tabs -->
        <div class="rounded-2xl border bg-card p-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-foreground">
              {{ t('client.nutrition.dayPlan') }} — {{ selectedDayLabel }}
            </h3>
            <span class="text-xs text-muted-foreground"
              >{{ todayMeals.length }} comidas</span
            >
          </div>
          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="d in weekDays"
              :key="d.key"
              type="button"
              @click="selectedDay = d.key"
              class="shrink-0 rounded-xl border px-3 py-2 text-sm transition-all"
              :class="
                selectedDay === d.key
                  ? 'border-primary bg-primary/5 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-muted/30'
              "
            >
              {{ d.short }}
            </button>
          </div>
        </div>

        <!-- Meal cards -->
        <div v-if="todayMeals.length" class="space-y-3">
          <MealCard
            v-for="(meal, idx) in todayMeals"
            :key="mealKey(meal, idx)"
            :meal="meal"
            :meal-key="mealKey(meal, idx)"
            :today-logs="summary?.today_logs ?? []"
            :loading="savingKey === mealKey(meal, idx)"
            @register-plan="onRegisterPlan"
            @register-custom="onRegisterCustom"
            @delete="onDeleteLog"
          />
        </div>
        <div
          v-else
          class="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          {{ t('client.nutrition.noMeals') }}
        </div>

        <!-- Adherence chart -->
        <NutritionAdherenceChart
          v-if="summary"
          :history="summary.daily_history"
          :adherence="summary.adherence"
        />
      </template>
    </template>

    <section v-if="clientId" class="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-foreground">Food Evidence</h2>
        <p class="text-sm text-muted-foreground">{{ evidenceWeekLabel }}</p>
      </div>

      <div v-if="clientEvidenceDays.length === 0" class="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
        No food evidence this week
      </div>

      <div v-else class="space-y-5">
        <section v-for="day in clientEvidenceDays" :key="day.date" class="space-y-3">
          <h3 class="text-sm font-semibold text-foreground">{{ day.labelWithDate }}</h3>
          <div class="space-y-3">
            <EvidenceThreadCard
              v-for="ev in day.evidences"
              :key="ev.id"
              :evidence="ev"
            />
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { usePlansStore } from '../../stores/plan.store';
import { useNutritionStore } from '../../stores/nutrition.store';
import { useEvidencesStore } from '../../stores/evidences.store';
import { useI18n } from 'vue-i18n';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { useAppToast } from '@/composables/useAppToast';
import { createNutritionEvidence } from '../../repo/evidencesRepo';
import { toYmdLocal } from '../../../lib/utils';
const { t } = useI18n();
import MacroRingsCard from '../../components/MacroRingsCard.vue';
import WaterTracker from '../../components/WaterTracker.vue';
import MealCard from '../../components/MealCard.vue';
import NutritionAdherenceChart from '../../components/NutritionAdherenceChart.vue';
import EvidenceThreadCard from '../../components/EvidenceThreadCard.vue';

const authStore = useAuthStore();
const plansStore = usePlansStore();
const nutritionStore = useNutritionStore();
const evidencesStore = useEvidencesStore();
const toast = useAppToast();

const { user } = storeToRefs(authStore);
const clientId = computed(() => user.value?.client_id ?? '');
const nutritionPlanId = computed(
  () => user.value?.nutrition_plan ?? '',
);

// ── Helpers ───────────────────────────────────────────────────────────────────
type DayKey =
  | 'lunes' | 'martes' | 'miercoles' | 'jueves'
  | 'viernes' | 'sabado' | 'domingo';

const DAY_INDEX: Record<DayKey, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4,  viernes: 5, sabado: 6,
};

const DAY_KEY_MAP: DayKey[] = [
  'domingo', 'lunes', 'martes', 'miercoles',
  'jueves', 'viernes', 'sabado',
];

const weekDays = computed<{ key: DayKey; short: string; label: string }[]>(() => [
  { key: 'lunes',     short: t('client.nutrition.days.short.1'), label: t('client.nutrition.days.full.lunes')     },
  { key: 'martes',    short: t('client.nutrition.days.short.2'), label: t('client.nutrition.days.full.martes')    },
  { key: 'miercoles', short: t('client.nutrition.days.short.3'), label: t('client.nutrition.days.full.miercoles') },
  { key: 'jueves',    short: t('client.nutrition.days.short.4'), label: t('client.nutrition.days.full.jueves')    },
  { key: 'viernes',   short: t('client.nutrition.days.short.5'), label: t('client.nutrition.days.full.viernes')   },
  { key: 'sabado',    short: t('client.nutrition.days.short.6'), label: t('client.nutrition.days.full.sabado')    },
  { key: 'domingo',   short: t('client.nutrition.days.short.0'), label: t('client.nutrition.days.full.domingo')   },
]);

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function jsDateToDayKey(d: Date): DayKey {
  return DAY_KEY_MAP[d.getDay()];
}

// Obtiene la fecha de ese día en la semana de la fecha de referencia
function dayKeyToDate(key: DayKey, referenceDate: Date): Date {
  const target = DAY_INDEX[key];
  const base = new Date(referenceDate);
  base.setHours(0, 0, 0, 0);

  const currentDay = base.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);


  const offset = target === 0 ? 6 : target - 1;
  const result = new Date(monday);
  result.setDate(monday.getDate() + offset);
  return result;
}

// ── Date navigation ───────────────────────────────────────────────────────────
const selectedDate = ref(todayDate());

const evidenceWeekStart = computed(() =>
  format(startOfWeek(selectedDate.value, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
);
const evidenceWeekEnd = computed(() =>
  format(endOfWeek(selectedDate.value, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
);
const evidenceWeekLabel = computed(() => {
  const start = startOfWeek(selectedDate.value, { weekStartsOn: 1 });
  const end = endOfWeek(selectedDate.value, { weekStartsOn: 1 });
  return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`;
});
const evidenceWeekKey = computed(
  () => `${clientId.value}:nutrition:${evidenceWeekStart.value}:${evidenceWeekEnd.value}`,
);
const clientEvidenceDays = computed(() => {
  const week = evidencesStore.getClientEvidencesByWeek(evidenceWeekKey.value);
  if (!week) return [];
  return week.days.map((day) => ({
    ...day,
    labelWithDate: `${day.label}, ${format(new Date(`${day.date}T00:00:00`), 'MMMM d')}`,
  }));
});

const isToday = computed(
  () => selectedDate.value.toDateString() === todayDate().toDateString(),
);

const dateLabel = computed(() => {
  if (isToday.value) return 'Hoy';
  return selectedDate.value.toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
});

function shiftDate(delta: number) {
  const d = new Date(selectedDate.value);
  d.setDate(d.getDate() + delta);
  if (d <= todayDate()) selectedDate.value = d;
}

function goToday() {
  selectedDate.value = todayDate();
}

// ── Week day selector ─────────────────────────────────────────────────────────
const selectedDay = ref<DayKey>(jsDateToDayKey(selectedDate.value));

watch(selectedDate, (d) => {
  const key = jsDateToDayKey(d);
  if (key !== selectedDay.value) selectedDay.value = key;
});

watch(selectedDay, (day) => {
  const date = dayKeyToDate(day, selectedDate.value);
  if (date.toDateString() !== selectedDate.value.toDateString()) {
    selectedDate.value = date;
  }
});

const selectedDayLabel = computed(
  () => weekDays.value.find((d) => d.key === selectedDay.value)?.label ?? '',
);

// ── Plan ──────────────────────────────────────────────────────────────────────
const nutritionPlan = computed(() =>
  clientId.value ? plansStore.getClientNutritionPlan(clientId.value) : null,
);

const todayMeals = computed(() => {
  const plan = nutritionPlan.value;
  if (!plan) return [];
  return plan.days?.find((d) => d.day === selectedDay.value)?.meals ?? [];
});

function mealKey(meal: { type?: string }, idx: number) {
  return `${selectedDay.value}_${meal.type ?? 'meal'}_${idx}`;
}

// ── Nutrition summary ─────────────────────────────────────────────────────────
const loading = computed(() =>
  clientId.value
    ? nutritionStore.isLoading(clientId.value, selectedDate.value)
    : false,
);

const summary = computed(() =>
  clientId.value
    ? nutritionStore.getSummary(clientId.value, selectedDate.value)
    : null,
);

async function loadData() {
  if (!clientId.value) return;
  await plansStore.fetchClientNutritionPlan(clientId.value, nutritionPlanId.value);
}

async function loadSummaryByDate() {
  if (!clientId.value) return;
  await nutritionStore.loadSummary(clientId.value, selectedDate.value);
}

async function loadEvidenceWeek() {
  if (!clientId.value) return;
  try {
    await evidencesStore.loadClientEvidencesByWeek({
      clientId: clientId.value,
      type: 'nutrition',
      weekStart: evidenceWeekStart.value,
      weekEnd: evidenceWeekEnd.value,
    });
  } catch (e) {
    console.warn('No se pudo cargar evidencia semanal de nutricion:', e);
    evidencesStore.clientEvidencesByWeek[evidenceWeekKey.value] = {
      weekStart: evidenceWeekStart.value,
      weekEnd: evidenceWeekEnd.value,
      days: [],
    };
  }
}

watch(clientId, async () => {
  await loadData();
  await loadSummaryByDate();
  await loadEvidenceWeek();
}, { immediate: true });

watch(selectedDate, loadSummaryByDate, { immediate: true });
watch(selectedDate, loadEvidenceWeek, { immediate: true });

// ── Actions ───────────────────────────────────────────────────────────────────
const savingKey = ref<string | null>(null);

async function uploadMealEvidence(photo: File, mealName?: string) {
  await createNutritionEvidence({
    takenAt: toYmdLocal(selectedDate.value),
    photo,
    mealName,
  });
  await loadEvidenceWeek();
}

async function onRegisterPlan(payload: { mealKey: string; photo?: File }) {
  if (!clientId.value) return;
  const idx = parseInt(payload.mealKey.split('_').at(-1) ?? '0');
  const meal = todayMeals.value[idx];
  if (!meal) return;

  savingKey.value = payload.mealKey;
  try {
    await nutritionStore.upsertLog(clientId.value, selectedDate.value, {
      date: toYmdLocal(selectedDate.value),
      type: meal.type ?? 'snack',
      meal_name: meal.name,
      meal_key: payload.mealKey,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      foods: meal.foods ?? undefined,
      notes: meal.notes ?? undefined,
    });
    if (payload.photo) {
      await uploadMealEvidence(payload.photo, meal.name);
    }
    toast.success(payload.photo ? 'Comida y evidencia registradas' : 'Comida registrada');
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'No se pudo registrar la comida');
  } finally {
    savingKey.value = null;
  }
}

async function onRegisterCustom(
  payload: {
    mealKey: string;
    data: { calories?: number; protein?: number; carbs?: number; fat?: number };
    photo?: File;
  },
) {
  if (!clientId.value) return;
  const idx = parseInt(payload.mealKey.split('_').at(-1) ?? '0');
  const meal = todayMeals.value[idx];
  if (!meal) return;

  savingKey.value = payload.mealKey;
  try {
    await nutritionStore.upsertLog(clientId.value, selectedDate.value, {
      date: toYmdLocal(selectedDate.value),
      type: meal.type ?? 'snack',
      meal_name: meal.name,
      meal_key: payload.mealKey,
      ...payload.data,
    });
    if (payload.photo) {
      await uploadMealEvidence(payload.photo, meal.name);
    }
    toast.success(payload.photo ? 'Comida y evidencia registradas' : 'Comida registrada');
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'No se pudo registrar la comida');
  } finally {
    savingKey.value = null;
  }
}

async function onDeleteLog(logId: string) {
  if (!clientId.value) return;
  await nutritionStore.deleteLog(clientId.value, selectedDate.value, logId);
}

async function onWaterUpdate(ml: number) {
  if (!clientId.value) return;
  await nutritionStore.upsertLog(clientId.value, selectedDate.value, {
    date: toYmdLocal(selectedDate.value),
    type: 'water',
    meal_key: 'daily_water',
    meal_name: 'Agua',
    water_ml: ml,
  });
}

</script>
