<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div
      v-for="stat in statCards"
      :key="stat.key"
      class="stat-card"
      :style="{ '--card-accent': stat.accent }"
    >
      <div class="stat-inner">
        <div class="flex items-start justify-between mb-2">
          <p class="stat-label">{{ stat.label }}</p>
          <div class="stat-icon-wrap" :style="{ background: stat.accent + '18' }">
            <svg class="w-4 h-4" :style="{ color: stat.accent }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path :d="stat.icon" />
            </svg>
          </div>
        </div>
        <p class="stat-number">{{ stat.value }}</p>
        <p class="stat-sub" :style="{ color: stat.subColor || 'var(--muted-foreground)' }">{{ stat.sub }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TrainerDashboardStats } from '../../repo/trainerRepo'

const props = defineProps<{ stats: TrainerDashboardStats }>()

const statCards = computed(() => [
  {
    key: 'total',
    label: 'Total clientes',
    value: props.stats.totalClients,
    sub: `${props.stats.inactiveClients} inactivos`,
    accent: 'var(--chart-3)',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    subColor: props.stats.inactiveClients > 0 ? '#eab308' : undefined,
  },
  {
    key: 'active',
    label: 'Activos esta semana',
    value: props.stats.activeThisWeek,
    sub: `${Math.round((props.stats.activeThisWeek / Math.max(props.stats.totalClients, 1)) * 100)}% adherencia`,
    accent: 'var(--chart-2)',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    key: 'inactive',
    label: 'Sin entrenar',
    value: props.stats.totalClients - props.stats.activeThisWeek,
    sub: 'esta semana',
    accent: props.stats.totalClients - props.stats.activeThisWeek > 0 ? 'var(--destructive)' : 'var(--chart-2)',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'prs',
    label: 'PRs esta semana',
    value: props.stats.prsThisWeek,
    sub: 'nuevos records',
    accent: 'var(--chart-4)',
    icon: 'M5 3l14 9-14 9V3z',
  },
])
</script>

<style scoped>
.stat-card {
  position: relative;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--card-accent, var(--primary));
}
.stat-inner { padding: 16px; }
.stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
}
.stat-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-number {
  font-size: 32px;
  font-weight: 900;
  color: var(--foreground);
  line-height: 1;
  margin: 6px 0 3px;
  font-variant-numeric: tabular-nums;
}
.stat-sub {
  font-size: 11px;
  color: var(--muted-foreground);
}
</style>
