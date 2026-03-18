<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usePlansStore } from '../../stores/plan.store';
import type { TrainingWeek } from '../../types';

import TrainingTemplatePage from '../../components/TrainingTemplatePage.vue';

const route = useRoute();
const plansStore = usePlansStore();
const { getTrainingPlanLocal: getTrainingPlan, loadTrainingPlans } = plansStore;

const selectedPlanId = ref<string>('new');

const isEditing = computed(() => !!route.params.id);
const planId = computed(() => route.params.id as string);
const show = ref(true);

const planName = ref('');
const planDescription = ref('');
const weeks = ref<TrainingWeek[]>([
  {
    weekNumber: 1,
    days: [],
  },
]);

watch(selectedPlanId, (newId) => {
  if (newId === 'new') {
    resetForm();
  } else {
    loadPlanIntoForm(newId);
  }
});

function resetForm() {
  planName.value = '';
  planDescription.value = '';
  weeks.value = [{ weekNumber: 1, days: [] }];
}

function loadPlanIntoForm(id: string) {
  const plan = getTrainingPlan(id);
  if (!plan) return;

  planName.value = plan.name;
  planDescription.value = plan.description || '';
  weeks.value = JSON.parse(JSON.stringify(plan.weeks));
}

onMounted(async () => {
  await loadTrainingPlans();
  const idFromRoute = route.params.id as string | undefined;
  selectedPlanId.value = idFromRoute ? idFromRoute : 'new';

  if (selectedPlanId.value !== 'new') {
    show.value = true;
    loadPlanIntoForm(selectedPlanId.value);
  }

  if (isEditing.value) {
    const plan = getTrainingPlan(planId.value);
    if (plan) {
      planName.value = plan.name;
      planDescription.value = plan.description || '';
      weeks.value = JSON.parse(JSON.stringify(plan.weeks));
    }
  }
});
</script>

<template>
    <TrainingTemplatePage />
</template>
