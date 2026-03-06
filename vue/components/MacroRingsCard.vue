<template>
  <div class="rounded-2xl border bg-card p-5 shadow-sm">
    <h4 class="mb-4 text-sm font-semibold text-foreground">Macros de hoy</h4>
    <div class="flex flex-wrap items-center justify-around gap-4">
      <div v-for="ring in rings" :key="ring.label" class="flex flex-col items-center gap-1">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <!-- track -->
          <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor"
            class="text-muted/30" stroke-width="7" />
          <!-- progress -->
          <circle
            cx="36" cy="36" r="30" fill="none"
            :stroke="ring.color"
            stroke-width="7"
            stroke-linecap="round"
            :stroke-dasharray="CIRC"
            :stroke-dashoffset="dashOffset(ring.pct)"
            transform="rotate(-90 36 36)"
            style="transition: stroke-dashoffset 0.6s ease"
          />
          <text x="36" y="40" text-anchor="middle" class="text-[11px] font-bold"
            :fill="ring.color" font-size="13" font-weight="700">
            {{ ring.consumed }}
          </text>
        </svg>
        <span class="text-[11px] text-muted-foreground">{{ ring.label }}</span>
        <span class="text-[10px] text-muted-foreground/70">/ {{ ring.target }}{{ ring.unit }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodayMacros } from '../repo/nutritionRepo'

const props = defineProps<{ macros: TodayMacros }>()

const RADIUS = 30
const CIRC = 2 * Math.PI * RADIUS

function dashOffset(pct: number) {
  const clamped = Math.min(100, Math.max(0, pct))
  return CIRC * (1 - clamped / 100)
}

function pct(consumed: number, target: number) {
  if (!target) return consumed > 0 ? 100 : 0
  return Math.min(100, (consumed / target) * 100)
}

const rings = computed(() => [
  {
    label: 'Calorías',
    unit: 'kcal',
    consumed: Math.round(props.macros.calories.consumed),
    target: Math.round(props.macros.calories.target),
    pct: pct(props.macros.calories.consumed, props.macros.calories.target),
    color: 'var(--color-primary)',
  },
  {
    label: 'Proteína',
    unit: 'g',
    consumed: Math.round(props.macros.protein_g.consumed),
    target: Math.round(props.macros.protein_g.target),
    pct: pct(props.macros.protein_g.consumed, props.macros.protein_g.target),
    color: 'var(--color-accent)',
  },
  {
    label: 'Carbs',
    unit: 'g',
    consumed: Math.round(props.macros.carbs_g.consumed),
    target: Math.round(props.macros.carbs_g.target),
    pct: pct(props.macros.carbs_g.consumed, props.macros.carbs_g.target),
    color: 'oklch(0.65 0.15 150)',
  },
  {
    label: 'Grasas',
    unit: 'g',
    consumed: Math.round(props.macros.fat_g.consumed),
    target: Math.round(props.macros.fat_g.target),
    pct: pct(props.macros.fat_g.consumed, props.macros.fat_g.target),
    color: 'oklch(0.65 0.15 50)',
  },
  {
    label: 'Agua',
    unit: 'ml',
    consumed: Math.round(props.macros.water_ml.consumed),
    target: Math.round(props.macros.water_ml.target),
    pct: pct(props.macros.water_ml.consumed, props.macros.water_ml.target),
    color: 'oklch(0.65 0.15 230)',
  },
])
</script>
