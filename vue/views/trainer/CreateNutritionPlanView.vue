<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDataStore } from '../../stores/data';
import type { NutritionPlan } from '../../types';
import NutritionTemplatePage from '../../components/NutritionTemplatePage.vue';

const route = useRoute();
const dataStore = useDataStore();

const clientId = computed(() => (route.params.clientId as string) || '');

const selectedPlanId = ref<string>('new');
const show = ref(true);

// ✅ lista de templates
const nutritionPlans = computed(() => dataStore.nutritionPlans || []);

// ✅ cliente actual
const client = computed(() => {
  if (!clientId.value) return null;
  return dataStore.getClient?.(clientId.value) ?? null;
});

// ✅ plan seleccionado (template o el asignado)
const selectedPlan = computed<NutritionPlan | null>(() => {
  if (!selectedPlanId.value || selectedPlanId.value === 'new') return null;
  return dataStore.getNutritionPlan?.(selectedPlanId.value) ?? null;
});

// Cuando cambia el clientId, si tiene plan asignado lo seleccionamos
watch(
  client,
  (c) => {
    if (!c) return;
    if (c.nutritionplanId) {
      selectedPlanId.value = c.nutritionplanId;
      show.value = true;
    } else {
      selectedPlanId.value = 'new';
      show.value = true;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  // ✅ cargar planes
  if (typeof (dataStore as any).loadNutritionsPlans === 'function') {
    await (dataStore as any).loadNutritionsPlans();
  } else if (typeof (dataStore as any).loadNutritionPlans === 'function') {
    await (dataStore as any).loadNutritionPlans();
  }

  // ✅ si venía un id por ruta, usarlo
  const idFromRoute = route.params.id as string | undefined;
  if (idFromRoute) {
    selectedPlanId.value = idFromRoute;
  } else {
    // ✅ si no hay id, intenta usar el plan del cliente si existe
    const c = client.value;
    if (c?.nutritionplanId) selectedPlanId.value = c.nutritionplanId;
  }
});
</script>

<template>
  <NutritionTemplatePage />
</template>
