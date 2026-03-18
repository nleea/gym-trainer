<!-- vue/components/WorkoutHeatmap.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { toYmdLocal } from '../../lib/utils'

const props = defineProps<{ clientId: string }>()

type HeatmapItem = { date: string; count: number; volume: number }
type Cell = { date: string; volume: number; count: number; future: boolean }

const data = ref<HeatmapItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (!props.clientId) return
  loading.value = true
  error.value = null
  try {
    data.value = await api.get<HeatmapItem[]>(`/clients/${props.clientId}/workout-heatmap`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar el heatmap'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Grid builder ───────────────────────────────────────────────────────────

/** Monday of the week containing `d` */
function mondayOf(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = x.getDay() // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow
  x.setDate(x.getDate() + offset)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function iso(d: Date) {
  return toYmdLocal(d)
}

/** weeks[col][row 0-6 Mon-Sun] */
const weeks = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = mondayOf(addDays(today, -364)) // ~12 months back
  const dayMap = new Map(data.value.map(d => [d.date, d]))

  const cols: Cell[][] = []
  let cur = new Date(start)

  while (cur <= today) {
    const col: Cell[] = []
    for (let r = 0; r < 7; r++) {
      const d = addDays(cur, r)
      const isoStr = iso(d)
      const hit = dayMap.get(isoStr)
      col.push({
        date: isoStr,
        volume: hit?.volume ?? 0,
        count: hit?.count ?? 0,
        future: d > today,
      })
    }
    cols.push(col)
    cur = addDays(cur, 7)
  }
  return cols
})

/** Month labels: track where each month first appears */
const monthLabels = computed(() => {
  const labels: { col: number; label: string }[] = []
  let lastMonth = -1
  weeks.value.forEach((col, idx) => {
    const firstValid = col.find(c => !c.future)
    if (!firstValid) return
    const m = new Date(firstValid.date + 'T00:00:00').getMonth()
    if (m !== lastMonth) {
      const label = new Date(firstValid.date + 'T00:00:00')
        .toLocaleDateString('es-ES', { month: 'short' })
      labels.push({ col: idx, label })
      lastMonth = m
    }
  })
  return labels
})

const monthLabelMap = computed(() => {
  const m = new Map<number, string>()
  monthLabels.value.forEach(l => m.set(l.col, l.label))
  return m
})

// ── Color scale (4 levels) ─────────────────────────────────────────────────

const maxVolume = computed(() =>
  data.value.reduce((m, d) => Math.max(m, d.volume), 0)
)

function cellClass(cell: Cell): string {
  if (cell.future) return 'bg-transparent'
  if (cell.volume === 0) return 'bg-muted'
  const ratio = cell.volume / (maxVolume.value || 1)
  if (ratio < 0.25) return 'bg-primary/25'
  if (ratio < 0.50) return 'bg-primary/50'
  if (ratio < 0.75) return 'bg-primary/75'
  return 'bg-primary'
}

// ── Tooltip ────────────────────────────────────────────────────────────────

type TooltipState = { cell: Cell; x: number; y: number } | null
const tooltip = ref<TooltipState>(null)

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
function fmtVol(v: number) {
  return v.toLocaleString('es-ES')
}

function onEnter(e: MouseEvent, cell: Cell) {
  if (cell.future) return
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  tooltip.value = { cell, x: rect.left + rect.width / 2, y: rect.top - 8 }
}
function onLeave() {
  tooltip.value = null
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="border-b px-6 py-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">Actividad</p>
          <h2 class="mt-1 text-xl font-bold text-foreground">Últimos 12 meses</h2>
        </div>
        <div v-if="!loading && !error" class="text-right">
          <p class="text-xs text-muted-foreground uppercase tracking-wider">Días activos</p>
          <p class="mt-0.5 text-2xl font-black tabular-nums text-primary">
            {{ data.filter(d => d.count > 0).length }}
          </p>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-center justify-center py-12">
        <p class="text-sm text-destructive">{{ error }}</p>
      </div>

      <!-- Heatmap -->
      <template v-else>
        <div class="overflow-x-auto">
          <div class="inline-flex gap-1 min-w-max">
            <!-- Day labels column -->
            <div class="flex flex-col gap-1 mr-1">
              <div class="h-5" />
              <div
                v-for="label in DAY_LABELS"
                :key="label"
                class="h-3.5 text-[10px] leading-3.5 text-muted-foreground font-medium flex items-center w-3"
              >{{ label }}</div>
            </div>

            <!-- Week columns -->
            <div
              v-for="(col, wIdx) in weeks"
              :key="wIdx"
              class="flex flex-col gap-1"
            >
              <!-- Month label -->
              <div class="h-5 text-[11px] leading-5 font-semibold text-foreground/70 whitespace-nowrap">
                {{ monthLabelMap.get(wIdx) ?? '' }}
              </div>

              <!-- Day cells -->
              <div
                v-for="(cell, dIdx) in col"
                :key="dIdx"
                class="h-3.5 w-3.5 rounded-[2px] transition-all duration-100 cursor-default hover:ring-1 hover:ring-primary/50"
                :class="cellClass(cell)"
                @mouseenter="onEnter($event, cell)"
                @mouseleave="onLeave"
              />
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <span class="font-medium">Menos</span>
          <span class="h-3.5 w-3.5 rounded-[2px] bg-muted border border-border/50" />
          <span class="h-3.5 w-3.5 rounded-[2px] bg-primary/20" />
          <span class="h-3.5 w-3.5 rounded-[2px] bg-primary/45" />
          <span class="h-3.5 w-3.5 rounded-[2px] bg-primary/70" />
          <span class="h-3.5 w-3.5 rounded-[2px] bg-primary" />
          <span class="font-medium">Más</span>
        </div>
      </template>
    </div>
  </div>

  <!-- Tooltip (fixed, outside card) -->
  <Teleport to="body">
    <div
      v-if="tooltip"
      class="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-xl border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <p class="font-semibold text-foreground">{{ fmtDate(tooltip.cell.date) }}</p>
      <p class="mt-1 text-muted-foreground">
        Vol: <span class="font-semibold text-foreground">{{ fmtVol(tooltip.cell.volume) }} kg</span>
        · Sesiones: <span class="font-semibold text-foreground">{{ tooltip.cell.count }}</span>
      </p>
    </div>
  </Teleport>
</template>
