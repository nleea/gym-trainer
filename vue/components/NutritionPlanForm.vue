<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { NutritionDay, NutritionPlan, Meal, MealType } from '@/types';
import { useDataStore } from '../stores/data';
import { useClientsStore } from '../stores/clients.store';

const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const clientStore = useClientsStore();

const clientId = route.params.clientId as string | undefined;

const props = defineProps<{
  modelValue?: any | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: any): void;
  (e: 'saved', payload: { id: string }): void;
}>();

const planName = ref('');
const planDescription = ref('');

const targetCalories = ref<number | null>(null);
const targetProtein = ref<number | null>(null);
const targetCarbs = ref<number | null>(null);
const targetFat = ref<number | null>(null);

const recommendedFoods = ref<string[]>([]);
const forbiddenFoods = ref<string[]>([]);
const guidelines = ref<string[]>([]);

const days = ref<NutritionDay[]>([]);

const daysOfWeek = [
  { key: 'lunes',     label: 'Lunes',     short: 'Lun' },
  { key: 'martes',    label: 'Martes',    short: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié' },
  { key: 'jueves',    label: 'Jueves',    short: 'Jue' },
  { key: 'viernes',   label: 'Viernes',   short: 'Vie' },
  { key: 'sabado',    label: 'Sábado',    short: 'Sáb' },
  { key: 'domingo',   label: 'Domingo',   short: 'Dom' },
] as const;

type DayKey = (typeof daysOfWeek)[number]['key'];
const dayOrder: DayKey[] = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];

/** Active day tab */
const activeDay = ref<DayKey | null>(null);

const showMealModal = ref(false);
const currentDayIndex = ref(0);

const newRecommendedFood = ref('');
const newForbiddenFood = ref('');

const defaultPlan = (): NutritionPlan => ({
  id: '',
  name: '',
  description: '',
  targetCalories: 0,
  targetProtein: 0,
  targetCarbs: 0,
  targetFat: 0,
  water_ml: 2000,
  recommendedFoods: [],
  forbiddenFoods: [],
  guidelines: [],
  days: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- v-model plan ----------
const plan = computed<NutritionPlan>({
  get() { return props.modelValue ? props.modelValue : defaultPlan(); },
  set(v) { emit('update:modelValue', v); },
});

const isTemplateEditing = computed(
  () => Boolean((plan.value as any).isTemplate || (plan.value as any).is_template),
);
const sourceTemplateLabel = computed(() => {
  const source = (plan.value as any).sourceTemplateId || (plan.value as any).source_template_id;
  return source ? String(source) : 'Sin origen';
});

const ingredientText = ref('');
const guidelinesText = ref('');

const mealTypes: { value: MealType; label: string; emoji: string; color: string }[] = [
  { value: 'desayuno', label: 'Desayuno', emoji: '🌅', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  { value: 'almuerzo', label: 'Almuerzo', emoji: '🍽️', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  { value: 'cena',     label: 'Cena',     emoji: '🌙', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' },
  { value: 'snack',    label: 'Snack',    emoji: '🍎', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
];

function mealStyle(type: MealType) {
  return mealTypes.find(m => m.value === type)?.color ?? 'bg-muted text-muted-foreground';
}
function mealEmoji(type: MealType) {
  return mealTypes.find(m => m.value === type)?.emoji ?? '🍴';
}

onMounted(async () => {
  await dataStore.loadNutritionsPlans();

  if (!props.modelValue) {
    plan.value = defaultPlan();
  }

  const idFromRoute = route.params.id as string | undefined;
  if (idFromRoute) {
    const p = dataStore.getNutritionPlan(idFromRoute);
    if (p) plan.value = deepClone(p);
  }

  // Set active day to first added day if plan has days
  if (plan.value.days?.length) {
    activeDay.value = plan.value.days[0].day as DayKey;
  }
});

const newMeal = ref<Partial<Meal>>({
  type: 'desayuno', name: '', description: '',
  calories: undefined, protein: undefined, carbs: undefined, fat: undefined,
  ingredients: [],
});

function sortDays() {
  plan.value.days.sort(
    (a, b) => dayOrder.indexOf(a.day as DayKey) - dayOrder.indexOf(b.day as DayKey),
  );
}

/** Computed — reactive when plan loads async */
const availableDays = computed(() => {
  const used = new Set(plan.value.days.map((d) => d.day.trim().toLowerCase()));
  return daysOfWeek.filter((d) => !used.has(d.key));
});

const activeDayData = computed(() => {
  if (!activeDay.value) return null;
  return plan.value.days.find(d => d.day === activeDay.value) ?? null;
});

const activeDayIndex = computed(() => {
  if (!activeDay.value) return -1;
  return plan.value.days.findIndex(d => d.day === activeDay.value);
});

function addDay(dayKey: NutritionDay['day']) {
  if (plan.value.days.find((d) => d.day === dayKey)) return;
  plan.value.days.push({ day: dayKey, meals: [] });
  sortDays();
  activeDay.value = dayKey as DayKey;
}

function removeDay(dayIndex: number) {
  const removed = plan.value.days[dayIndex].day as DayKey;
  plan.value.days.splice(dayIndex, 1);
  if (activeDay.value === removed) {
    activeDay.value = plan.value.days[0]?.day as DayKey ?? null;
  }
}

function openMealModal(dayIndex: number) {
  currentDayIndex.value = dayIndex;
  ingredientText.value = '';
  newMeal.value = {
    type: 'desayuno', name: '', description: '',
    calories: undefined, protein: undefined, carbs: undefined, fat: undefined,
    ingredients: [],
  };
  showMealModal.value = true;
}

function addIngredient() {
  const text = ingredientText.value.trim();
  if (!text) return;
  const list = (newMeal.value.ingredients || []) as string[];
  list.push(text);
  newMeal.value.ingredients = list;
  ingredientText.value = '';
}

function removeIngredient(idx: number) {
  const list = (newMeal.value.ingredients || []) as string[];
  list.splice(idx, 1);
  newMeal.value.ingredients = list;
}

function addMeal() {
  if (!newMeal.value.name || !newMeal.value.type) return;

  const meal: Meal = {
    id: crypto.randomUUID(),
    type: newMeal.value.type as MealType,
    name: newMeal.value.name,
    description: newMeal.value.description || '',
    calories: newMeal.value.calories,
    protein: newMeal.value.protein,
    carbs: newMeal.value.carbs,
    fat: newMeal.value.fat,
    ingredients: (newMeal.value.ingredients as string[]) || [],
    date: null as any,
    createdAt: null as any,
  };

  plan.value.days[currentDayIndex.value].meals.push(meal);
  showMealModal.value = false;
}

function removeMeal(dayIndex: number, mealIndex: number) {
  plan.value.days[dayIndex].meals.splice(mealIndex, 1);
}

const addRecommendedFood = () => {
  const v = newRecommendedFood.value.trim();
  if (!v) return;
  if (!plan.value.recommendedFoods?.includes(v)) plan.value.recommendedFoods?.push(v);
  newRecommendedFood.value = '';
};

const removeRecommendedFood = (index: number) => {
  plan.value.recommendedFoods?.splice(index, 1);
};

const addForbiddenFood = () => {
  const v = newForbiddenFood.value.trim();
  if (!v) return;
  if (!plan.value.forbiddenFoods?.includes(v)) plan.value.forbiddenFoods?.push(v);
  newForbiddenFood.value = '';
};

const removeForbiddenFood = (index: number) => {
  plan.value.forbiddenFoods?.splice(index, 1);
};

const saving = ref(false);

const handleSave = async () => {
  if (!plan.value.name?.trim()) return;
  saving.value = true;
  try {
    const payload: Partial<NutritionPlan> = {
      name: plan.value.name.trim(),
      description: plan.value.description?.trim() || '',
      targetCalories: plan.value.targetCalories ?? undefined,
      targetProtein: plan.value.targetProtein ?? undefined,
      targetCarbs: plan.value.targetCarbs ?? undefined,
      targetFat: plan.value.targetFat ?? undefined,
      water_ml: plan.value.water_ml ?? undefined,
      recommendedFoods: plan.value.recommendedFoods,
      forbiddenFoods: plan.value.forbiddenFoods,
      guidelines: plan.value.guidelines as any,
      days: plan.value.days ?? [],
    };

    if (plan.value.id && clientId) {
      await clientStore.updateNutritionPlan(clientId, plan.value.id, payload);
      emit('saved', { id: plan.value.id });
    } else {
      const newId = await dataStore.addnutritionPlan(payload);
      plan.value = { ...plan.value, id: newId.id! };
      emit('saved', { id: newId.id ?? '' });
    }
  } finally {
    saving.value = false;
  }
};

function dayLabel(key: string) {
  return daysOfWeek.find(d => d.key === key)?.label ?? key;
}

function totalCalories(day: NutritionDay) {
  return day.meals.reduce((s, m) => s + (m.calories ?? 0), 0);
}
</script>

<template>
  <div class="flex flex-col min-h-0">

    <!-- ══════════════════════════════════════════
         STICKY HEADER
         ══════════════════════════════════════════ -->
    <div class="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4 py-3">
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
        placeholder="Nombre del plan nutricional…"
        class="min-w-0 flex-1 bg-transparent text-lg font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />

      <!-- Macro summary pills (desktop) -->
      <div class="hidden md:flex items-center gap-2 text-xs font-medium">
        <span v-if="plan.targetCalories" class="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
          {{ plan.targetCalories }} kcal
        </span>
        <span v-if="plan.targetProtein" class="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">
          P: {{ plan.targetProtein }}g
        </span>
        <span v-if="plan.targetCarbs" class="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-400">
          C: {{ plan.targetCarbs }}g
        </span>
        <span v-if="plan.targetFat" class="rounded-full bg-orange-500/10 px-2.5 py-1 text-orange-700 dark:text-orange-400">
          G: {{ plan.targetFat }}g
        </span>
        <span v-if="plan.water_ml" class="rounded-full bg-cyan-500/10 px-2.5 py-1 text-cyan-700 dark:text-cyan-400">
          Agua: {{ plan.water_ml }} ml
        </span>
      </div>

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

      <!-- ── Info card ── -->
      <div class="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</span>
          <textarea
            v-model="plan.description"
            rows="2"
            class="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            placeholder="Objetivo y características del plan…"
          />
        </label>

        <!-- Macro targets -->
        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metas diarias</p>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label class="group space-y-1">
              <span class="text-xs text-muted-foreground">Calorías (kcal)</span>
              <div class="flex items-center gap-1.5 rounded-xl border bg-primary/5 px-3 py-2 ring-0 focus-within:ring-1 focus-within:ring-primary transition">
                <span class="text-sm text-primary">🔥</span>
                <input v-model.number="plan.targetCalories" type="number" placeholder="2000"
                  class="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none" />
              </div>
            </label>
            <label class="space-y-1">
              <span class="text-xs text-muted-foreground">Proteína (g)</span>
              <div class="flex items-center gap-1.5 rounded-xl border bg-amber-500/5 px-3 py-2 focus-within:ring-1 focus-within:ring-amber-400 transition">
                <span class="text-sm">💪</span>
                <input v-model.number="plan.targetProtein" type="number" placeholder="150"
                  class="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none" />
              </div>
            </label>
            <label class="space-y-1">
              <span class="text-xs text-muted-foreground">Carbs (g)</span>
              <div class="flex items-center gap-1.5 rounded-xl border bg-blue-500/5 px-3 py-2 focus-within:ring-1 focus-within:ring-blue-400 transition">
                <span class="text-sm">🌾</span>
                <input v-model.number="plan.targetCarbs" type="number" placeholder="200"
                  class="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none" />
              </div>
            </label>
            <label class="space-y-1">
              <span class="text-xs text-muted-foreground">Grasas (g)</span>
              <div class="flex items-center gap-1.5 rounded-xl border bg-orange-500/5 px-3 py-2 focus-within:ring-1 focus-within:ring-orange-400 transition">
                <span class="text-sm">🥑</span>
                <input v-model.number="plan.targetFat" type="number" placeholder="70"
                  class="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none" />
              </div>
            </label>
            <label class="space-y-1">
              <span class="text-xs text-muted-foreground">Agua (ml)</span>
              <div class="flex items-center gap-1.5 rounded-xl border bg-cyan-500/5 px-3 py-2 focus-within:ring-1 focus-within:ring-cyan-400 transition">
                <span class="text-sm">💧</span>
                <input v-model.number="plan.water_ml" type="number" placeholder="2000"
                  class="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none" />
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- ── Day tabs ── -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          v-for="day in plan.days"
          :key="day.day"
          @click="activeDay = day.day as DayKey"
          class="group relative flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-5 py-3 transition-all"
          :class="activeDay === day.day
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-transparent bg-card hover:border-border hover:bg-muted/30'"
        >
          <span class="text-xs font-semibold uppercase tracking-wide"
            :class="activeDay === day.day ? 'text-primary' : 'text-muted-foreground'">
            {{ daysOfWeek.find(d => d.key === day.day)?.short }}
          </span>
          <span class="text-[10px]"
            :class="activeDay === day.day ? 'text-primary/70' : 'text-muted-foreground/60'">
            {{ day.meals.length }} comidas
          </span>

          <!-- Remove btn on hover -->
          <button
            @click.stop="removeDay(plan.days.findIndex(d => d.day === day.day))"
            class="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border bg-card text-muted-foreground hover:border-rose-300 hover:text-rose-500 group-hover:flex"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </button>

        <!-- Available days as chips -->
        <button
          v-for="day in availableDays"
          :key="day.key"
          @click="addDay(day.key)"
          class="flex shrink-0 items-center gap-1 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          {{ day.short }}
        </button>
      </div>

      <!-- ── No days ── -->
      <div
        v-if="plan.days.length === 0"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-16 text-center"
      >
        <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">🥗</div>
        <p class="text-sm font-medium text-muted-foreground">Sin días configurados</p>
        <p class="mt-1 text-xs text-muted-foreground/70">Añade días usando los botones de arriba</p>
      </div>

      <!-- ── Active day meals ── -->
      <div v-if="activeDayData" class="space-y-3">
        <!-- Day header -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-foreground">{{ dayLabel(activeDayData.day) }}</h3>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ activeDayData.meals.length }} comidas ·
              {{ totalCalories(activeDayData) > 0 ? totalCalories(activeDayData) + ' kcal' : 'sin calorías' }}
            </p>
          </div>
          <button
            @click="openMealModal(activeDayIndex)"
            class="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Añadir comida
          </button>
        </div>

        <!-- Empty day -->
        <div
          v-if="activeDayData.meals.length === 0"
          class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-10 text-center"
        >
          <p class="text-sm text-muted-foreground/70">Sin comidas · Pulsa Añadir comida</p>
        </div>

        <!-- Meal cards grid -->
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(meal, mealIndex) in activeDayData.meals"
            :key="meal.id || mealIndex"
            class="group relative flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <!-- Meal type strip -->
            <div class="flex items-center gap-2 border-b px-4 py-2.5"
              :class="mealStyle(meal.type)">
              <span class="text-base">{{ mealEmoji(meal.type) }}</span>
              <span class="text-xs font-semibold uppercase tracking-wide">
                {{ mealTypes.find(m => m.value === meal.type)?.label }}
              </span>
              <button
                @click="removeMeal(activeDayIndex, mealIndex)"
                class="ml-auto hidden rounded-lg p-1 hover:bg-black/10 group-hover:block transition-colors"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Meal content -->
            <div class="flex-1 p-4 space-y-2">
              <p class="font-medium text-foreground truncate">{{ meal.name }}</p>
              <p v-if="meal.description" class="text-xs text-muted-foreground line-clamp-2">{{ meal.description }}</p>

              <!-- Macros row -->
              <div v-if="meal.calories || meal.protein || meal.carbs || meal.fat"
                class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span v-if="meal.calories" class="font-semibold text-primary">{{ meal.calories }} kcal</span>
                <span v-if="meal.protein" class="text-amber-700 dark:text-amber-400">P {{ meal.protein }}g</span>
                <span v-if="meal.carbs" class="text-blue-700 dark:text-blue-400">C {{ meal.carbs }}g</span>
                <span v-if="meal.fat" class="text-orange-700 dark:text-orange-400">G {{ meal.fat }}g</span>
              </div>

              <!-- Ingredients -->
              <div v-if="meal.ingredients?.length" class="flex flex-wrap gap-1.5 pt-1">
                <span
                  v-for="(ing, i) in meal.ingredients" :key="ing + i"
                  class="rounded-full border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {{ ing }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Foods & Guidelines ── -->
      <div class="grid gap-4 lg:grid-cols-3">
        <!-- Recommended foods -->
        <div class="rounded-2xl border bg-card p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-foreground">✅ Recomendados</h4>
            <span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              {{ plan.recommendedFoods?.length ?? 0 }}
            </span>
          </div>
          <div class="flex gap-2 mb-3">
            <input
              v-model="newRecommendedFood"
              type="text"
              @keyup.enter="addRecommendedFood"
              placeholder="Añadir alimento…"
              class="flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <button @click="addRecommendedFood"
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>
          <div v-if="plan.recommendedFoods?.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="(food, i) in plan.recommendedFoods" :key="food + i"
              class="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
            >
              {{ food }}
              <button @click="removeRecommendedFood(i)" class="hover:opacity-60">✕</button>
            </span>
          </div>
          <p v-else class="text-xs text-muted-foreground/70">Sin alimentos aún</p>
        </div>

        <!-- Forbidden foods -->
        <div class="rounded-2xl border bg-card p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-foreground">🚫 A evitar</h4>
            <span class="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              {{ plan.forbiddenFoods?.length ?? 0 }}
            </span>
          </div>
          <div class="flex gap-2 mb-3">
            <input
              v-model="newForbiddenFood"
              type="text"
              @keyup.enter="addForbiddenFood"
              placeholder="Añadir alimento…"
              class="flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
            <button @click="addForbiddenFood"
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>
          <div v-if="plan.forbiddenFoods?.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="(food, i) in plan.forbiddenFoods" :key="food + i"
              class="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-400"
            >
              {{ food }}
              <button @click="removeForbiddenFood(i)" class="hover:opacity-60">✕</button>
            </span>
          </div>
          <p v-else class="text-xs text-muted-foreground/70">Sin alimentos aún</p>
        </div>

        <!-- Guidelines -->
        <div class="rounded-2xl border bg-card p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-foreground">📋 Guías</h4>
            <span class="text-[10px] text-muted-foreground">una por línea</span>
          </div>
          <textarea
            v-model="guidelinesText"
            rows="5"
            class="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="- Tomar 2L de agua&#10;- Comer verduras en 2 comidas…"
          />
        </div>
      </div>

    </div>

    <!-- ══════════════════════════════════════════
         MODAL: AÑADIR COMIDA
         ══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showMealModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showMealModal = false"/>

        <div class="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border bg-card overflow-hidden" style="max-height: 90vh">
          <!-- Handle bar (mobile) -->
          <div class="flex justify-center pt-3 pb-1 sm:hidden">
            <div class="h-1 w-10 rounded-full bg-border"/>
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 class="text-base font-semibold text-foreground">Añadir comida</h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ activeDayData ? dayLabel(activeDayData.day) : '' }}
              </p>
            </div>
            <button @click="showMealModal = false"
              class="flex h-8 w-8 items-center justify-center rounded-xl border text-muted-foreground hover:bg-muted transition-colors">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="addMeal" class="overflow-auto p-5 space-y-4" style="max-height: calc(90vh - 80px)">

            <!-- Meal type pills -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-muted-foreground">Tipo de comida *</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="t in mealTypes" :key="t.value"
                  type="button"
                  @click="newMeal.type = t.value"
                  class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all"
                  :class="newMeal.type === t.value
                    ? t.color + ' ring-2 ring-offset-1 ring-current'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'"
                >
                  {{ t.emoji }} {{ t.label }}
                </button>
              </div>
            </div>

            <!-- Name -->
            <label class="block space-y-1.5">
              <span class="text-xs font-medium text-muted-foreground">Nombre *</span>
              <input
                v-model="newMeal.name"
                type="text"
                required
                placeholder="Ej: Avena con frutas"
                class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <!-- Description -->
            <label class="block space-y-1.5">
              <span class="text-xs font-medium text-muted-foreground">Descripción (opcional)</span>
              <textarea
                v-model="newMeal.description"
                rows="2"
                placeholder="Preparación, sustituciones…"
                class="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <!-- Macros -->
            <div class="grid grid-cols-2 gap-3">
              <label class="space-y-1.5">
                <span class="text-xs font-medium text-muted-foreground">🔥 Calorías</span>
                <input v-model.number="newMeal.calories" type="number" placeholder="350"
                  class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
              </label>
              <label class="space-y-1.5">
                <span class="text-xs font-medium text-muted-foreground">💪 Proteína (g)</span>
                <input v-model.number="newMeal.protein" type="number" placeholder="25"
                  class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"/>
              </label>
              <label class="space-y-1.5">
                <span class="text-xs font-medium text-muted-foreground">🌾 Carbs (g)</span>
                <input v-model.number="newMeal.carbs" type="number" placeholder="45"
                  class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"/>
              </label>
              <label class="space-y-1.5">
                <span class="text-xs font-medium text-muted-foreground">🥑 Grasas (g)</span>
                <input v-model.number="newMeal.fat" type="number" placeholder="10"
                  class="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"/>
              </label>
            </div>

            <!-- Ingredients -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-muted-foreground">Ingredientes</label>
              <div class="flex gap-2">
                <input
                  v-model="ingredientText"
                  type="text"
                  placeholder="Ej: 60g avena"
                  @keyup.enter.prevent="addIngredient"
                  class="flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="button" @click="addIngredient"
                  class="rounded-xl border px-3 py-2 text-sm text-primary hover:bg-primary/5">
                  + Añadir
                </button>
              </div>
              <div v-if="(newMeal.ingredients?.length || 0) > 0" class="flex flex-wrap gap-1.5">
                <span
                  v-for="(ing, i) in newMeal.ingredients" :key="ing + i"
                  class="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  {{ ing }}
                  <button type="button" @click="removeIngredient(i)" class="hover:text-rose-500">✕</button>
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-1 pb-2">
              <button type="button" @click="showMealModal = false"
                class="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="submit" :disabled="!newMeal.name || !newMeal.type"
                class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-40">
                Añadir al plan
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

  </div>
</template>
