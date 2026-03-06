<template>
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h3 class="text-lg font-semibold text-foreground">Progreso corporal</h3>
      <p class="text-sm text-muted-foreground">
        Registra medidas y mira la evolución del cliente.
      </p>
    </div>
  </div>

  <!-- Charts -->
  <div class="grid gap-6 lg">
    <bodyEvolutionChart
      :client-id="clientId"
      :show="['weight', 'fat', 'waist', 'abdomen']"
      :points="24"
    />
  </div>

  <!-- Latest metrics summary -->
  <div class="grid gap-4 md">
    <ClientMetricsView :client-id="clientId" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useLogsStore } from '@/stores/logs.store';
import bodyEvolutionChart from './bodyEvolutionChart.vue';
import ClientMetricsView from '../views/client/metrictsView.vue';
import { useMetricsStore } from '@/stores/metrics.store';
// vue-chartjs

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
);

// ✅ store
const logsStore = useLogsStore();
const metricsStore = useMetricsStore();

// ✅ tu clientId del entrenador (ajusta esta parte)
const props = defineProps<{ clientId: string }>();
const selectedClientId = computed(() => props.clientId);

watch(
  selectedClientId,
  async (cid) => {
    if (!cid) return;
    await Promise.all([
      logsStore.loadProgressEntries(cid),
      metricsStore.loadClientMetrics(cid)
    ]);
  },
  { immediate: true },
);
</script>
