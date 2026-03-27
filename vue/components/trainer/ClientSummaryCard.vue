<template>
  <div
    class="client-card"
    :class="{ 'card-expanded': expanded, 'card-has-alerts': client.alerts.length > 0 }"
    @click.self="expanded = !expanded"
  >
    <!-- ── Card header ── -->
    <div class="card-top" @click="expanded = !expanded">
      <!-- Avatar + status dot -->
      <div class="relative flex-shrink-0">
        <div class="avatar">
          {{ initials }}
        </div>
        <span
          class="status-dot"
          :class="{
            'dot-green':  client.daysSinceLastWorkout != null && client.daysSinceLastWorkout < 3,
            'dot-yellow': client.daysSinceLastWorkout != null && client.daysSinceLastWorkout >= 3 && client.daysSinceLastWorkout < 7,
            'dot-red':    client.daysSinceLastWorkout == null || client.daysSinceLastWorkout >= 7,
          }"
        />
      </div>

      <!-- Name + plan -->
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold text-foreground truncate">{{ client.name }}</p>
        <p class="text-xs text-muted-foreground truncate">
          {{ client.currentPlan ?? 'Sin plan asignado' }}
        </p>
      </div>

      <!-- Expand chevron -->
      <svg
        class="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200"
        :class="{ 'rotate-180': expanded }"
        viewBox="0 0 20 20" fill="currentColor"
      >
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
      </svg>
    </div>

    <!-- ── Quick metrics row ── -->
    <div class="metrics-row">
      <div class="metric-item">
        <span class="metric-icon">🔥</span>
        <span class="metric-val">{{ client.streak }}</span>
        <span class="metric-unit">días</span>
      </div>
      <div class="metric-sep" />
      <div class="metric-item">
        <span class="metric-icon">⚡</span>
        <span class="metric-val">{{ client.weeklyWorkouts }}</span>
        <span class="metric-unit">entrenos</span>
      </div>
      <div class="metric-sep" />
      <div class="metric-item">
        <span class="metric-icon">⚖️</span>
        <span class="metric-val">{{ client.weightKg != null ? client.weightKg : '—' }}</span>
        <span class="metric-unit">kg</span>
        <span
          v-if="client.weightChange != null"
          class="text-[10px] font-semibold ml-0.5"
          :style="{ color: client.weightChange <= 0 ? 'var(--chart-2)' : 'var(--destructive)' }"
        >{{ client.weightChange > 0 ? '+' : '' }}{{ client.weightChange }}</span>
      </div>
    </div>

    <!-- ── 7-day activity bar ── -->
    <div class="week-bar">
      <div
        v-for="(day, i) in weekDays"
        :key="i"
        :class="['week-dot', day.trained ? 'dot-trained' : 'dot-rest']"
        :title="day.label"
      />
    </div>

    <!-- ── Engagement activity ── -->
    <div v-if="engagement" class="activity-summary">
      <span>{{ engagement.daysActive7d }}d/7 activo</span>
      <span class="metric-sep-inline">·</span>
      <span>{{ engagement.daysActive30d }}d/30 activo</span>
    </div>

    <!-- ── Check-in badge ── -->
    <div v-if="client.lastCheckin" class="checkin-badge">
      <span class="text-base">{{ moodEmoji(client.lastCheckin.mood) }}</span>
      <span class="text-xs text-muted-foreground">esta semana</span>
      <span v-if="client.lastCheckin.energy" class="badge-pill">
        ⚡ {{ client.lastCheckin.energy }}/10
      </span>
      <span v-if="client.lastCheckin.stress" class="badge-pill"
        :style="{ color: client.lastCheckin.stress >= 7 ? 'var(--destructive)' : 'inherit' }">
        💆 {{ client.lastCheckin.stress }}/10
      </span>
    </div>
    <div v-else class="text-xs text-muted-foreground px-1 pb-1">
      Sin check-in esta semana
    </div>

    <!-- ── Alert chips ── -->
    <div v-if="client.alerts.length > 0" class="alert-chips">
      <span
        v-for="alert in client.alerts"
        :key="alert"
        :class="['alert-chip', isCritical(alert) ? 'chip-red' : 'chip-yellow']"
      >
        {{ alertLabel(alert) }}
      </span>
    </div>

    <!-- ── Action buttons ── -->
    <div class="action-row" @click.stop>
      <router-link :to="`/trainer/clients/${client.id}`" class="btn-outline-sm">
        Ver perfil
      </router-link>
      <button @click.stop="emit('quickPlan', client.id)" class="btn-accent-sm">
        Plan rapido ⚡
      </button>
    </div>

    <!-- ── Expanded panel ── -->
    <div class="expanded-panel" :class="{ 'panel-open': expanded }">
      <div class="expanded-content">
        <div class="border-t border-border pt-4 mt-2 space-y-4">

          <!-- Mini weight chart -->
          <div v-if="chartData.labels.length >= 2">
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Peso (ultimas semanas)</p>
            <div class="h-24">
              <Line :data="chartData" :options="chartOptions" />
            </div>
          </div>

          <!-- Last check-in detail -->
          <div v-if="client.lastCheckin">
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ultimo check-in</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-if="client.lastCheckin.energy" class="checkin-pill">⚡ Energia: {{ client.lastCheckin.energy }}/10</span>
              <span v-if="client.lastCheckin.stress" class="checkin-pill">💆 Estres: {{ client.lastCheckin.stress }}/10</span>
              <span v-if="client.lastCheckin.mood" class="checkin-pill">{{ moodEmoji(client.lastCheckin.mood) }} {{ moodLabel(client.lastCheckin.mood) }}</span>
            </div>
          </div>

          <!-- Recent workouts -->
          <div v-if="client.recentWorkouts.length > 0">
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ultimos entrenamientos</p>
            <div class="space-y-1.5">
              <div
                v-for="wo in client.recentWorkouts"
                :key="wo.date"
                class="workout-row"
              >
                <span class="text-xs font-medium text-foreground">{{ formatDate(wo.date) }}</span>
                <span class="text-xs text-muted-foreground">{{ wo.exerciseCount }} ej · {{ Math.round(wo.volume / 1000) }}k vol</span>
                <span v-if="wo.duration" class="text-xs text-muted-foreground">{{ wo.duration }}min</span>
              </div>
            </div>
          </div>

          <router-link
            :to="`/trainer/clients/${client.id}`"
            class="text-xs font-semibold text-primary hover:underline block"
          >
            Ver perfil completo →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import type { TooltipItem } from 'chart.js'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'
import type { DashboardClient } from '../../repo/trainerRepo'
import type { ClientEngagement } from '../../repo/engagement.repo'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps<{
  client: DashboardClient
  engagement?: ClientEngagement | null
}>()
const emit = defineEmits<{ (e: 'quickPlan', clientId: string): void }>()

const expanded = ref(false)

// ── Initials ─────────────────────────────────────────────────────
const initials = computed(() =>
  props.client.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
)

// ── 7-day activity dots (Mon → Sun of current week) ──────────────
const weekDays = computed(() => {
  const today = new Date()
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  const dayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const trainedSet = new Set(props.client.workoutDates7d)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i)
    const iso = format(d, 'yyyy-MM-dd')
    return { label: dayLabels[i], trained: trainedSet.has(iso) }
  })
})

// ── Mini weight chart ────────────────────────────────────────────
const chartData = computed(() => {
  const history = props.client.weightHistory
  return {
    labels: history.map((p) => format(parseISO(p.date), 'd MMM')),
    datasets: [
      {
        data: history.map((p) => p.weightKg),
        borderColor: 'var(--primary)',
        backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: TooltipItem<'line'>) => `${ctx.raw} kg` } } },
  scales: {
    x: { display: false },
    y: { display: false },
  },
}

// ── Mood ─────────────────────────────────────────────────────────
const MOOD_MAP: Record<string, { emoji: string; label: string }> = {
  bad:       { emoji: '😔', label: 'Mal' },
  regular:   { emoji: '😐', label: 'Regular' },
  good:      { emoji: '🙂', label: 'Bien' },
  very_good: { emoji: '😊', label: 'Muy bien' },
  excellent: { emoji: '🤩', label: 'Excelente' },
}
function moodEmoji(m: string | null) { return m ? (MOOD_MAP[m]?.emoji ?? '') : '' }
function moodLabel(m: string | null) { return m ? (MOOD_MAP[m]?.label ?? m) : '' }

// ── Alerts ────────────────────────────────────────────────────────
const CRITICAL = new Set(['no_workout_7_days', 'at_risk'])
function isCritical(a: string) { return CRITICAL.has(a) }
const ALERT_LABELS: Record<string, string> = {
  no_workout_7_days:  '7 dias sin entrenar',
  no_workout_3_days:  '3 dias sin entrenar',
  no_checkin:         'Sin check-in',
  no_metrics_2_weeks: 'Sin metricas',
  at_risk:            'En riesgo',
}
function alertLabel(a: string) { return ALERT_LABELS[a] ?? a }

// ── Date formatting ───────────────────────────────────────────────
function formatDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM') } catch { return iso }
}
</script>

<style scoped>
.client-card {
  border-radius: 16px;
  border: 1.5px solid var(--border);
  background: var(--card);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
}
.client-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px color-mix(in oklch, var(--foreground) 8%, transparent);
  border-color: color-mix(in oklch, var(--primary) 30%, var(--border));
}
.card-has-alerts {
  border-color: color-mix(in oklch, #eab308 30%, var(--border));
}

.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 10px;
  cursor: pointer;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--foreground);
  color: var(--background);
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}
.status-dot {
  position: absolute;
  bottom: 0; right: 0;
  width: 10px; height: 10px;
  border-radius: 50%;
  border: 2px solid var(--card);
}
.dot-green  { background: #22c55e; }
.dot-yellow { background: #eab308; }
.dot-red    { background: #ef4444; }

.metrics-row {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8px 14px;
  border-top: 1px solid var(--border);
}
.metric-item {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex: 1;
  justify-content: center;
}
.metric-icon { font-size: 12px; }
.metric-val { font-size: 16px; font-weight: 800; color: var(--foreground); }
.metric-unit { font-size: 10px; color: var(--muted-foreground); }
.metric-sep {
  width: 1px;
  height: 24px;
  background: var(--border);
  flex-shrink: 0;
}

.week-bar {
  display: flex;
  gap: 3px;
  padding: 8px 14px 6px;
  justify-content: space-between;
}
.week-dot {
  flex: 1;
  height: 5px;
  border-radius: 999px;
}
.dot-trained { background: var(--primary); }
.dot-rest    { background: var(--muted); }

.activity-summary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 14px 6px;
  font-size: 11px;
  color: var(--muted-foreground);
}
.metric-sep-inline {
  color: var(--border);
}

.checkin-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 6px;
}
.badge-pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 20px;
  background: var(--muted);
  color: var(--muted-foreground);
}

.alert-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 14px 6px;
}
.alert-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 20px;
}
.chip-red    { background: #ef444422; color: #ef4444; border: 1px solid #ef444440; }
.chip-yellow { background: #eab30822; color: #a16207; border: 1px solid #eab30840; }

.action-row {
  display: flex;
  gap: 6px;
  padding: 8px 14px 12px;
}
.btn-outline-sm {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--foreground);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: background 0.15s;
  cursor: pointer;
}
.btn-outline-sm:hover { background: var(--muted); }
.btn-accent-sm {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-accent-sm:hover { opacity: 0.85; }

/* Expanded panel */
.expanded-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-open { max-height: 600px; }
.expanded-content { padding: 0 14px 14px; }

.checkin-pill {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 20px;
  background: var(--muted);
  color: var(--foreground);
}
.workout-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: color-mix(in oklch, var(--muted) 40%, transparent);
}
</style>
