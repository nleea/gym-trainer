<template>
  <div v-if="alertedClients.length > 0" class="alerts-banner">
    <!-- Header -->
    <button class="alerts-header" @click="expanded = !expanded">
      <div class="flex items-center gap-2">
        <span class="alert-icon">⚠️</span>
        <span class="text-sm font-bold text-foreground">
          {{ alertedClients.length }} {{ alertedClients.length === 1 ? 'cliente necesita' : 'clientes necesitan' }} atención
        </span>
      </div>
      <svg
        class="w-4 h-4 text-muted-foreground transition-transform duration-200"
        :class="{ 'rotate-180': expanded }"
        viewBox="0 0 20 20" fill="currentColor"
      >
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
      </svg>
    </button>

    <!-- Alert list -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out overflow-hidden"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-96 opacity-100"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="max-h-96 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="expanded" class="border-t border-border">
        <router-link
          v-for="client in alertedClients"
          :key="client.id"
          :to="`/trainer/clients/${client.id}`"
          class="alert-row"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span :class="['alert-dot', isCritical(client.alerts) ? 'dot-red' : 'dot-yellow']" />
            <span class="text-sm font-medium text-foreground truncate">{{ client.name }}</span>
          </div>
          <span class="text-xs text-muted-foreground flex-shrink-0">
            {{ topAlertLabel(client.alerts) }}
          </span>
          <svg class="w-4 h-4 text-muted-foreground flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
          </svg>
        </router-link>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DashboardClient } from '../../repo/trainerRepo'

defineProps<{ alertedClients: DashboardClient[] }>()

const expanded = ref(true)

const ALERT_LABELS: Record<string, string> = {
  no_workout_7_days:   'Sin entrenar 7 dias',
  no_workout_3_days:   'Sin entrenar 3 dias',
  no_checkin:          'Sin check-in esta semana',
  no_metrics_2_weeks:  'Sin metricas 2 semanas',
}

const CRITICAL = new Set(['no_workout_7_days'])

function isCritical(alerts: string[]) {
  return alerts.some((a) => CRITICAL.has(a))
}

function topAlertLabel(alerts: string[]) {
  // Priority order
  const order = ['no_workout_7_days', 'no_workout_3_days', 'no_checkin', 'no_metrics_2_weeks']
  const top = order.find((a) => alerts.includes(a)) ?? alerts[0]
  return ALERT_LABELS[top] ?? top
}
</script>

<style scoped>
.alerts-banner {
  border-radius: 14px;
  border: 1.5px solid color-mix(in oklch, #eab308 35%, transparent);
  background: color-mix(in oklch, #eab308 5%, var(--card));
  overflow: hidden;
}
.alerts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}
.alert-icon { font-size: 16px; }
.alert-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  text-decoration: none;
  transition: background 0.1s;
}
.alert-row:hover { background: var(--muted); }
.alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-red    { background: #ef4444; }
.dot-yellow { background: #eab308; }
</style>
