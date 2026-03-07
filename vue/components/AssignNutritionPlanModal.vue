<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import type { NutritionPlan, NutritionDay } from '@/types';
import { usePlansStore } from '../stores/plan.store';
import { useClientsStore } from '../stores/clients.store';

const planStore = usePlansStore();
const clientStore = useClientsStore();

const { nutritionPlans } = storeToRefs(planStore);

const props = defineProps<{
  open: boolean;
  clientId: string;
  trainerId: string;
  showClientSelect?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'assigned', payload: { clientId: string; templatePlanId: string }): void;
}>();

onMounted(async () => {
  await planStore.loadNutritionPlans?.();
  // si tu store no tiene loadNutritionPlans y usa loadPlans general, cámbialo aquí
});

const selectedClientId = ref(props.clientId || '');
const selectedTemplateId = ref<string>('');
const startDate = ref<string>('');
const durationWeeks = ref<number>(4);

const isSubmitting = ref(false);
const expandAll = ref(false);

watch(
  () => props.open,
  (v) => {
    if (!v) return;
    selectedClientId.value = props.clientId || selectedClientId.value;

    if (!startDate.value) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    if (!selectedTemplateId.value && nutritionPlans.value?.length) {
      selectedTemplateId.value = nutritionPlans.value?.[0]?.id ?? '';
    }
  },
);

const templates = computed(() => (nutritionPlans.value || []).filter((p: any) => p.isTemplate !== false));

const selectedPlan = computed(() =>
  templates.value.find((p: NutritionPlan) => p.id === selectedTemplateId.value),
);

// -------- helpers counts --------
function countMeals(days: NutritionDay[]) {
  return (days || []).reduce((acc, d) => acc + (d.meals?.length || 0), 0);
}

const planSummary = computed(() => {
  const p = selectedPlan.value as NutritionPlan | undefined;
  if (!p) return null;

  const days = p.days || [];
  const meals = countMeals(days);

  return {
    days: days.length,
    meals,
    targets: [
      p.targetCalories,
      p.targetProtein,
      p.targetCarbs,
      p.targetFat,
    ].some((x) => x !== undefined && x !== null),
  };
});

const canAssign = computed(() => {
  return (
    !!selectedClientId.value &&
    !!selectedTemplateId.value &&
    !!startDate.value &&
    durationWeeks.value >= 1 &&
    !isSubmitting.value
  );
});

const close = () => emit('close');

const handleAssign = async () => {
  if (!canAssign.value) return;
  try {
    isSubmitting.value = true;

    const newNutritiondata = await planStore.assignNutritionTemplateToClient(
      selectedTemplateId.value,
      selectedClientId.value,
      startDate.value,
      durationWeeks.value,
      props.trainerId,
    );

    if (newNutritiondata) clientStore.syncNutritionData(newNutritiondata);

    emit('assigned', {
      clientId: selectedClientId.value,
      templatePlanId: selectedTemplateId.value,
    });
    close();
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
  >
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
      @click="close"
    ></div>

    <!-- Modal -->
    <div
      class="relative w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5"
      >
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-foreground">
            Asignar plan de nutrición
          </h2>
          <p class="text-sm text-muted-foreground">
            Selecciona una plantilla y revisa el contenido antes de asignarla.
          </p>
        </div>

        <button
          @click="close"
          class="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Cerrar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Body (scroll interno) -->
      <div
        class="h-[calc(92vh-120px)] sm:h-auto sm:max-h-[calc(90vh-120px)] overflow-auto"
      >
        <div class="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-2">
          <!-- Left -->
          <div class="space-y-4">
            <!-- Template -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground"
                >Plantilla *</label
              >
              <select
                v-model="selectedTemplateId"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>Seleccionar plan...</option>
                <option v-for="p in templates" :key="p.id" :value="p.id">
                  {{ p.name }} · Plantilla
                </option>
              </select>

              <p class="text-xs text-muted-foreground">
                Esto crea una copia editable para el cliente (no modifica la
                plantilla).
              </p>
            </div>

            <!-- Start + Duration -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground"
                  >Inicio *</label
                >
                <input
                  v-model="startDate"
                  type="date"
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground"
                  >Duración</label
                >
                <input
                  v-model.number="durationWeeks"
                  type="number"
                  min="1"
                  max="52"
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p class="text-xs text-muted-foreground">Semanas</p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-1 sticky bottom-0 bg-card pb-2">
              <button
                type="button"
                @click="close"
                class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                :disabled="!canAssign"
                @click="handleAssign"
                class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <span v-if="isSubmitting">Asignando...</span>
                <span v-else>Asignar</span>
              </button>
            </div>
          </div>

          <!-- Right: Preview -->
          <div
            class="rounded-xl border border-border bg-background p-4 min-h-0"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1 min-w-0">
                <p class="text-xs font-medium text-muted-foreground">Preview</p>
                <h3 class="text-base font-semibold text-foreground truncate">
                  {{ selectedPlan?.name || 'Selecciona una plantilla' }}
                </h3>
                <p class="text-sm text-muted-foreground line-clamp-2">
                  {{
                    selectedPlan?.description ||
                    'Aquí verás los detalles del plan.'
                  }}
                </p>
              </div>

              <button
                v-if="selectedPlan"
                type="button"
                @click="expandAll = !expandAll"
                class="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition shrink-0"
              >
                {{ expandAll ? 'Colapsar' : 'Expandir' }}
              </button>
            </div>

            <!-- Targets -->
            <div
              v-if="selectedPlan"
              class="mt-4 rounded-lg border border-border bg-card p-3"
            >
              <p class="text-xs font-medium text-muted-foreground">
                Objetivos (opcional)
              </p>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div
                  class="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span class="text-muted-foreground">Calorías</span>
                  <span class="text-foreground font-medium">{{
                    selectedPlan.targetCalories ?? '—'
                  }}</span>
                </div>
                <div
                  class="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span class="text-muted-foreground">Proteína</span>
                  <span class="text-foreground font-medium">{{
                    selectedPlan.targetProtein ?? '—'
                  }}</span>
                </div>
                <div
                  class="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span class="text-muted-foreground">Carbs</span>
                  <span class="text-foreground font-medium">{{
                    selectedPlan.targetCarbs ?? '—'
                  }}</span>
                </div>
                <div
                  class="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span class="text-muted-foreground">Grasas</span>
                  <span class="text-foreground font-medium">{{
                    selectedPlan.targetFat ?? '—'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Detail -->
            <div
              v-if="selectedPlan"
              class="mt-4 max-h-[38vh] sm:max-h-[320px] overflow-auto pr-1"
            >
              <!-- (tu contenido igual) -->
              <div
                v-for="(day, di) in selectedPlan.days"
                :key="day.day + di"
                class="mb-3 rounded-lg border border-border bg-card"
              >
                <details :open="expandAll" class="group">
                  <summary
                    class="cursor-pointer list-none p-3 flex items-center justify-between gap-3"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-foreground capitalize">
                        {{ day.day }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ day.meals?.length || 0 }} comidas
                      </p>
                    </div>
                    <span
                      class="text-muted-foreground group-open:rotate-180 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </summary>

                  <div class="border-t border-border p-3 space-y-2">
                    <div
                      v-for="meal in day.meals"
                      :key="meal.id ?? meal.name"
                      class="rounded-lg border border-border bg-background p-3"
                    >
                      <!-- (tu contenido igual) -->
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p
                            class="text-sm font-medium text-foreground capitalize"
                          >
                            {{ meal.type }} · {{ meal.name }}
                          </p>
                          <p
                            v-if="meal.description"
                            class="mt-1 text-sm text-muted-foreground line-clamp-2"
                          >
                            {{ meal.description }}
                          </p>
                        </div>

                        <div
                          class="text-right text-xs text-muted-foreground whitespace-nowrap"
                        >
                          <div v-if="meal.calories">
                            🔥 {{ meal.calories }} kcal
                          </div>
                          <div v-if="meal.protein">P {{ meal.protein }}</div>
                          <div v-if="meal.carbs">C {{ meal.carbs }}</div>
                          <div v-if="meal.fat">G {{ meal.fat }}</div>
                        </div>
                      </div>

                      <div
                        v-if="meal.ingredients?.length"
                        class="mt-2 flex flex-wrap gap-1"
                      >
                        <span
                          v-for="(ing, i) in meal.ingredients"
                          :key="ing + i"
                          class="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {{ ing }}
                        </span>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <p v-else class="mt-4 text-sm text-muted-foreground">
              Selecciona una plantilla para ver el contenido aquí.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="border-t border-border px-5 py-3 text-xs text-muted-foreground hidden sm:block"
      >
        Tip: después de asignar, podrás editar el plan del cliente sin afectar
        la plantilla.
      </div>
    </div>
  </div>
</template>
