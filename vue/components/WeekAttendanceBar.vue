<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

type DayItem = {
  date: Date;
  dayName: string;
  total: number;
  attended: number;
};

const props = defineProps<{
  weekDays: DayItem[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const labels = computed(() => props.weekDays.map((d) => d.dayName));
const attendedData = computed(() => props.weekDays.map((d) => d.attended));
const missedData = computed(() =>
  props.weekDays.map((d) => Math.max(0, d.total - d.attended)),
);

function render() {
  if (!canvasRef.value) return;

  // destruir para evitar duplicados al re-render
  if (chart) {
    chart.destroy();
    chart = null;
  }

  chart = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: labels.value,
      datasets: [
        {
          label: 'Asistió',
          data: attendedData.value,
          // sin colores fijos; Chart.js aplica default
          borderWidth: 1,
          stack: 'attendance',
        },
        {
          label: 'No asistió',
          data: missedData.value,
          borderWidth: 1,
          stack: 'attendance',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

onMounted(render);

watch(
  () => props.weekDays,
  () => render(),
  { deep: true },
);

onBeforeUnmount(() => {
  if (chart) chart.destroy();
});
</script>

<template>
  <div class="h-48 w-full">
    <canvas ref="canvasRef" />
  </div>
</template>
