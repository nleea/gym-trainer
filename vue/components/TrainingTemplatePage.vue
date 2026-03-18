<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlansStore } from '@/stores/plan.store';
import { useClientsStore } from '../stores/clients.store';

import TrainingPlanForm from '@/components/TrainingPlanForm.vue';

const route = useRoute();
const router = useRouter();
const plansStore = usePlansStore();
const clientStore = useClientsStore();

const action = ref(false);

const plan = ref({
  name: '',
  description: '',
  weeks: [{ weekNumber: 1, days: [] }],
});

const planId = route.params.id as string | undefined;

const clientId = computed(() => (route.params.clientId as string) ?? '');

watch(
  clientId,
  async (c) => {
    if (c) {
      const data = await clientStore.fetchPlanTrining(c);
      if (!data) return;
      plan.value = JSON.parse(JSON.stringify(data));
    }else {
      action.value = true
    }
  },
  { immediate: true },
);

const save = async () => {
  if (planId) {
    await plansStore.updateTrainingPlan(planId, plan.value);
  } else {
    await plansStore.addTrainingPlan(plan.value);
  }
  router.back()
};
</script>

<template>
  <TrainingPlanForm v-model="plan" :save="save" :action="action" />
</template>
