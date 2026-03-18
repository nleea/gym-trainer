<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useClientsStore } from '../../stores/clients.store';
import { usePlansStore } from '../../stores/plan.store';

import NutritionTemplatePage from '../../components/NutritionTemplatePage.vue';

const route = useRoute();
const clientsStore = useClientsStore();
const plansStore = usePlansStore();

const clientId = computed(() => (route.params.clientId as string) || '');

const selectedPlanId = ref<string>('new');
const show = ref(true);


// ✅ cliente actual
const client = computed(() => {
  if (!clientId.value) return null;
  return clientsStore.getClientLocal(clientId.value) ?? null;
});


// Cuando cambia el clientId, si tiene plan asignado lo seleccionamos
watch(
  client,
  (c) => {
    if (!c) return;
    if (c.nutrition_plan_id) {
      selectedPlanId.value = c.nutrition_plan_id;
      show.value = true;
    } else {
      selectedPlanId.value = 'new';
      show.value = true;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await plansStore.loadNutritionPlans();

  // ✅ si venía un id por ruta, usarlo
  const idFromRoute = route.params.id as string | undefined;
  if (idFromRoute) {
    selectedPlanId.value = idFromRoute;
  } else {
    // ✅ si no hay id, intenta usar el plan del cliente si existe
    const c = client.value;
    if (c?.nutrition_plan_id) selectedPlanId.value = c.nutrition_plan_id;
  }
});
</script>

<template>
  <NutritionTemplatePage />
</template>
