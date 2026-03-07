<template>
  <div class="checkin-card">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Semana</p>
        <p class="text-base font-bold text-foreground">{{ weekLabel }}</p>
      </div>
      <div v-if="checkin.mood" class="mood-badge">
        <span class="text-2xl">{{ moodEmoji }}</span>
        <span class="text-xs font-medium text-muted-foreground ml-1">{{ moodLabel }}</span>
      </div>
    </div>

    <!-- Metrics bars -->
    <div class="space-y-2.5">
      <div v-for="metric in metrics" :key="metric.key" class="metric-row">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-muted-foreground">{{ metric.label }}</span>
          <span class="text-xs font-bold" :style="{ color: metric.color }">
            {{ metric.displayValue }}
          </span>
        </div>
        <div class="metric-track">
          <div
            class="metric-fill"
            :style="{
              width: `${metric.percent}%`,
              background: metric.color,
            }"
          />
        </div>
      </div>
    </div>

    <!-- Note -->
    <p v-if="checkin.notes" class="mt-3 text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
      "{{ checkin.notes }}"
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTransition, TransitionPresets } from '@vueuse/core'
import { parseISO, endOfWeek, format } from 'date-fns'
import type { WeeklyCheckin } from '../repo/checkinRepo'

const props = defineProps<{ checkin: WeeklyCheckin }>()

// ── Animated source refs ─────────────────────────────────────────
const sleepHoursSource = ref(0)
const sleepQualitySource = ref(0)
const stressSource = ref(0)
const energySource = ref(0)
const sorenessSource = ref(0)

const animOpts = { duration: 800, transition: TransitionPresets.easeOutCubic }

const animSleepHours  = useTransition(sleepHoursSource, animOpts)
const animSleepQuality = useTransition(sleepQualitySource, animOpts)
const animStress      = useTransition(stressSource, animOpts)
const animEnergy      = useTransition(energySource, animOpts)
const animSoreness    = useTransition(sorenessSource, animOpts)

onMounted(() => {
  sleepHoursSource.value  = props.checkin.sleepHours ?? 0
  sleepQualitySource.value = props.checkin.sleepQuality ?? 0
  stressSource.value      = props.checkin.stressLevel ?? 0
  energySource.value      = props.checkin.energyLevel ?? 0
  sorenessSource.value    = props.checkin.muscleSoreness ?? 0
})

// ── Helpers ──────────────────────────────────────────────────────
function valueColor(value: number, inverted = false): string {
  const v = inverted ? 11 - value : value
  if (v >= 7) return 'var(--chart-2)'
  if (v >= 4) return '#eab308'
  return 'var(--destructive)'
}

function sorenessColor(v: number): string {
  if (v <= 1) return 'var(--chart-2)'
  if (v <= 2) return '#84cc16'
  if (v <= 3) return '#eab308'
  return 'var(--destructive)'
}

// ── Week label ───────────────────────────────────────────────────
const weekLabel = computed(() => {
  const ws = parseISO(props.checkin.weekStart)
  const we = endOfWeek(ws, { weekStartsOn: 1 })
  return `${format(ws, 'd')} – ${format(we, 'd MMM')}`
})

// ── Mood ─────────────────────────────────────────────────────────
const moodMap: Record<string, { emoji: string; label: string }> = {
  bad:       { emoji: '😔', label: 'Mal' },
  regular:   { emoji: '😐', label: 'Regular' },
  good:      { emoji: '🙂', label: 'Bien' },
  very_good: { emoji: '😊', label: 'Muy bien' },
  excellent: { emoji: '🤩', label: 'Excelente' },
}

const moodEmoji = computed(() => moodMap[props.checkin.mood ?? '']?.emoji ?? '')
const moodLabel = computed(() => moodMap[props.checkin.mood ?? '']?.label ?? '')

// ── Metrics ──────────────────────────────────────────────────────
const metrics = computed(() => [
  {
    key: 'sleepHours',
    label: 'Horas de sueño',
    percent: Math.min(100, (animSleepHours.value / 10) * 100),
    displayValue: props.checkin.sleepHours != null ? `${props.checkin.sleepHours}h` : '—',
    color: valueColor(props.checkin.sleepHours ?? 0),
  },
  {
    key: 'sleepQuality',
    label: 'Calidad del sueño',
    percent: (animSleepQuality.value / 10) * 100,
    displayValue: props.checkin.sleepQuality != null ? `${props.checkin.sleepQuality}/10` : '—',
    color: valueColor(props.checkin.sleepQuality ?? 0),
  },
  {
    key: 'stress',
    label: 'Estrés',
    percent: (animStress.value / 10) * 100,
    displayValue: props.checkin.stressLevel != null ? `${props.checkin.stressLevel}/10` : '—',
    color: valueColor(props.checkin.stressLevel ?? 0, true), // inverted: high = red
  },
  {
    key: 'energy',
    label: 'Energía',
    percent: (animEnergy.value / 10) * 100,
    displayValue: props.checkin.energyLevel != null ? `${props.checkin.energyLevel}/10` : '—',
    color: valueColor(props.checkin.energyLevel ?? 0),
  },
  {
    key: 'soreness',
    label: 'Dolor muscular',
    percent: (animSoreness.value / 5) * 100,
    displayValue: props.checkin.muscleSoreness != null ? `${props.checkin.muscleSoreness}/5` : '—',
    color: sorenessColor(props.checkin.muscleSoreness ?? 0),
  },
])
</script>

<style scoped>
.checkin-card {
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--card);
  padding: 18px;
}

.mood-badge {
  display: flex;
  align-items: center;
  background: color-mix(in oklch, var(--muted) 60%, transparent);
  border-radius: 20px;
  padding: 6px 10px;
}

.metric-track {
  height: 6px;
  border-radius: 999px;
  background: var(--muted);
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
