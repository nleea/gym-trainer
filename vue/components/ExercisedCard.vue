<template>
  <!-- Card wrapper — accent left bar + pulse animation when all sets done -->
  <div
    class="relative rounded-xl border bg-card shadow-sm overflow-hidden"
    :class="[
      cardPulse ? 'card-complete-pulse' : '',
      local.source === 'extra' ? 'border-dashed' : '',
    ]"
  >
    <!-- Left accent bar (deterministic hue per exercise name) -->
    <div
      class="absolute left-0 top-0 h-full w-[3px] rounded-l-xl"
      :style="{ background: `hsl(${exHue}deg, 60%, 55%)` }"
    />

    <div class="pl-4 pr-3 pt-3 pb-3">
      <!-- ── Header ── -->
      <div class="flex items-start justify-between mb-2 gap-2">
        <div class="flex-1 min-w-0">
          <!-- Source badge -->
          <span
            class="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            :class="
              local.source === 'plan'
                ? 'bg-primary/15 text-primary'
                : 'bg-amber-500/15 text-amber-500'
            "
          >{{ local.source === 'plan' ? 'Plan' : 'Extra' }}</span>

          <!-- Exercise name — styled as inline edit -->
          <input
            v-model="local.name"
            :disabled="disableName"
            type="text"
            placeholder="Nombre del ejercicio"
            class="w-full bg-transparent text-[15px] font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:cursor-default border-b border-transparent focus:border-primary pb-0.5 transition-colors leading-tight"
          />

          <!-- Last performance hint -->
          <p v-if="lastPerf" class="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
            <svg class="h-3 w-3 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Última vez: <strong class="text-foreground/80">{{ lastPerf.reps }}×{{ lastPerf.weight }}kg</strong> · {{ daysAgo(lastPerf.date) }}</span>
          </p>

          <div v-if="showEvidenceButton" class="mt-2 flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
              @click="$emit('evidence')"
            >
              📸 Subir evidencia
            </button>
            <span
              v-if="evidenceStatus === 'responded'"
              class="rounded-full bg-emerald-500/15 text-emerald-700 px-2 py-0.5 text-[11px]"
            >Respondida</span>
            <span
              v-else-if="evidenceStatus === 'pending'"
              class="rounded-full bg-amber-500/15 text-amber-700 px-2 py-0.5 text-[11px]"
            >Pendiente</span>
          </div>
        </div>

        <!-- Delete button -->
        <button
          type="button"
          @click="$emit('remove')"
          class="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Eliminar"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ── Controls: Series / Reps / Peso / Descanso ── -->
      <div class="grid grid-cols-4 gap-1.5 mb-3">
        <div v-for="ctrl in ctrlFields" :key="ctrl.label" class="flex flex-col gap-1">
          <label class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground text-center">
            {{ ctrl.label }}
          </label>
          <!-- setsCount uses special buffer input -->
          <input
            v-if="ctrl.key === 'setsCount'"
            v-model="setsCountInput"
            type="number" min="1" inputmode="numeric"
            @blur="normalizeSetsCountOnBlur"
            class="w-full rounded-lg border bg-muted/30 px-1 py-1.5 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            v-else-if="ctrl.key === 'reps'"
            v-model.number="local.reps"
            type="number" min="0"
            class="w-full rounded-lg border bg-muted/30 px-1 py-1.5 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            v-else-if="ctrl.key === 'weight'"
            v-model.number="local.weight"
            type="number" min="0" step="0.5"
            class="w-full rounded-lg border bg-muted/30 px-1 py-1.5 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            v-else-if="ctrl.key === 'rest'"
            v-model.number="local.rest"
            type="number" min="0"
            class="w-full rounded-lg border bg-muted/30 px-1 py-1.5 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <!-- ── Sets list ── -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Series</p>
          <button
            type="button"
            @click="applyGlobalToAllSets"
            class="rounded px-2 py-0.5 text-[10px] text-muted-foreground border border-transparent hover:border-border hover:bg-muted/30 transition-colors"
          >Aplicar a todas</button>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="(s, sidx) in local.sets"
            :key="sidx"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-300"
            :class="s.completed ? 'bg-primary/10' : 'bg-muted/20'"
          >
            <!-- Set number -->
            <span
              class="w-5 shrink-0 text-center text-[11px] font-bold tabular-nums"
              :class="s.completed ? 'text-primary' : 'text-muted-foreground'"
            >{{ String(Number(sidx) + 1).padStart(2, '0') }}</span>

            <!-- Reps -->
            <input
              type="number" min="0"
              :value="s.reps"
              @input="updateSet(Number(sidx), { reps: ($event.target as HTMLInputElement).value })"
              placeholder="—"
              class="w-14 rounded-md border bg-background/80 px-1.5 py-1 text-sm text-center font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-opacity"
              :class="s.completed ? 'opacity-60' : ''"
            />
            <span class="text-[10px] text-muted-foreground shrink-0">×</span>

            <!-- Weight -->
            <input
              type="number" min="0" step="0.5"
              :value="s.weight"
              @input="updateSet(Number(sidx), { weight: ($event.target as HTMLInputElement).value })"
              placeholder="—"
              class="w-14 rounded-md border bg-background/80 px-1.5 py-1 text-sm text-center font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-opacity"
              :class="s.completed ? 'opacity-60' : ''"
            />
            <span class="text-[10px] text-muted-foreground shrink-0">kg</span>

            <!-- Custom checkbox button -->
            <button
              type="button"
              class="ml-auto shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90"
              :class="
                s.completed
                  ? 'border-primary bg-primary text-primary-foreground scale-105'
                  : 'border-muted-foreground/40 hover:border-primary/60 bg-transparent'
              "
              @click="toggleCompleted(Number(sidx), !s.completed)"
            >
              <svg v-if="s.completed" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Rest timer ring ── -->
      <div
        v-if="timer.isRunning.value || timer.isDone.value"
        class="flex items-center gap-3 rounded-xl bg-muted/30 border border-border/50 px-3 py-2.5 mb-3"
      >
        <!-- SVG ring -->
        <div class="relative flex items-center justify-center shrink-0">
          <svg viewBox="0 0 44 44" class="h-14 w-14 -rotate-90">
            <!-- Track -->
            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" stroke-width="3" class="text-muted/40"/>
            <!-- Progress arc -->
            <circle
              cx="22" cy="22" r="18" fill="none" stroke="currentColor" stroke-width="3"
              class="text-primary"
              stroke-linecap="round"
              :stroke-dasharray="113.1"
              :stroke-dashoffset="timer.isDone.value ? 113.1 : 113.1 * (1 - timer.remaining.value / (timer.total.value || 60))"
              style="transition: stroke-dashoffset 0.9s linear"
            />
          </svg>
          <!-- Center number (counter-rotate so text is upright) -->
          <span class="absolute text-xs font-bold tabular-nums text-foreground" style="transform: rotate(90deg)">
            <template v-if="timer.isDone.value">✓</template>
            <template v-else>{{ timer.remaining.value }}</template>
          </span>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-foreground leading-tight">
            <template v-if="timer.isDone.value">¡Listo! 💪</template>
            <template v-else>Descansando</template>
          </p>
          <p v-if="!timer.isDone.value" class="text-xs text-muted-foreground tabular-nums">
            {{ Math.floor(timer.remaining.value / 60) }}:{{ String(timer.remaining.value % 60).padStart(2, '0') }} restantes
          </p>
        </div>

        <div class="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            @click="timer.skip()"
            class="rounded-lg border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >Saltar</button>
          <button
            type="button"
            @click="timer.reset(local.rest ?? 60)"
            class="rounded-lg border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >Reset</button>
        </div>
      </div>

      <!-- ── Notes ── -->
      <textarea
        v-model="local.notes"
        placeholder="Notas (opcional)..."
        rows="2"
        class="w-full rounded-lg border bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRestTimer } from '../composables/useRestTimer';

interface ExerciseSet {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ExerciseData {
  name: string;
  source: 'plan' | 'extra';
  setsCount: number;
  sets: ExerciseSet[];
  reps: number;
  weight: number;
  rest: number;
  notes: string;
}

const props = defineProps<{
  exercise: ExerciseData;
  index: number;
  disableName?: boolean;
  lastPerf?: { reps: number; weight: number; date: string } | null;
  showEvidenceButton?: boolean;
  evidenceStatus?: 'none' | 'pending' | 'responded';
}>();

const emit = defineEmits(['update:exercise', 'remove', 'evidence']);

const timer = useRestTimer()

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86_400_000
  )
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'hace 1 día'
  return `hace ${diff} días`
}

/** local computed para que v-model="local.xxx" funcione */
const local = computed({
  get: () => props.exercise,
  set: (v) => emit('update:exercise', v),
});

function clamp(n: unknown, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

/** ✅ buffer string para setsCount */
const setsCountInput = ref('');

/** cuando llega exercise nuevo o cambia setsCount desde afuera, reflejar */
watch(
  () => local.value.setsCount,
  (v) => {
    const inputStr = String(setsCountInput.value ?? '');

    // si el usuario está escribiendo (input vacío), no lo pises
    if (inputStr.trim() === '') {
      setsCountInput.value = String(v ?? '');
      return;
    }

    setsCountInput.value = String(v ?? '');
  },
  { immediate: true },
);

function syncSetsToCount(count: number) {
  if (!Array.isArray(local.value.sets)) local.value.sets = [];

  const cur = local.value.sets.length;
  if (cur < count) {
    const last = local.value.sets[cur - 1] ?? {
      reps: clamp(local.value.reps ?? 10, 0, 200),
      weight: clamp(local.value.weight ?? 0, 0, 500),
      completed: false,
    };
    for (let i = cur; i < count; i++) local.value.sets.push({ ...last });
  } else if (cur > count) {
    local.value.sets.splice(count);
  }
}

/** ✅ cuando el usuario escribe setsCount */
watch(
  setsCountInput,
  (raw) => {
    const str = String(raw ?? '');

    // permite vacío mientras escribe
    if (str.trim() === '') return;

    const n = Number(str);
    if (!Number.isFinite(n)) return;

    const count = clamp(Math.trunc(n), 1, 20);
    local.value.setsCount = count;
    syncSetsToCount(count);
  },
  { immediate: true },
);

/** ✅ si se va del input y quedó vacío, vuelve al valor actual */
function normalizeSetsCountOnBlur() {
  const str = String(setsCountInput.value ?? '');
  if (str.trim() === '') {
    setsCountInput.value = String(local.value.setsCount ?? 1);
  }
}

/** Si quieres que al cambiar reps/weight global, se refleje en sets vacíos */
watch(
  () => local.value.reps,
  (r) => {
    if (!Array.isArray(local.value.sets)) return;
    for (const s of local.value.sets) {
      if (s.reps == null) s.reps = clamp(r, 0, 200);
    }
  },
);

watch(
  () => local.value.weight,
  (w) => {
    if (!Array.isArray(local.value.sets)) return;
    for (const s of local.value.sets) {
      if (s.weight == null) s.weight = clamp(w, 0, 500);
    }
  },
);

/** Edita un set específico */
function updateSet(i: number, patch: { reps?: string | number; weight?: string | number }) {
  if (!Array.isArray(local.value.sets)) local.value.sets = [];

  const s = local.value.sets[i] ?? { reps: 10, weight: 0, completed: false };
  local.value.sets[i] = {
    ...s,
    reps: patch.reps != null ? clamp(patch.reps, 0, 200) : s.reps,
    weight: patch.weight != null ? clamp(patch.weight, 0, 500) : s.weight,
  };
}

function toggleCompleted(i: number, v: boolean) {
  if (!Array.isArray(local.value.sets)) local.value.sets = [];
  const s = local.value.sets[i] ?? { reps: 10, weight: 0, completed: false };
  local.value.sets[i] = { ...s, completed: v };
  if (v) timer.start(local.value.rest ?? 60)
}

function applyGlobalToAllSets() {
  if (!Array.isArray(local.value.sets)) local.value.sets = [];

  const reps = clamp(local.value.reps ?? 10, 0, 200);
  const weight = clamp(local.value.weight ?? 0, 0, 500);

  local.value.sets = local.value.sets.map((s) => ({
    ...s,
    reps,
    weight,
  }));
}

// ── Display-only: deterministic accent hue from exercise name ───────────────
const exHue = computed(() => {
  const name = String(local.value.name || '')
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
})

// ── Display-only: card pulse when all sets completed ────────────────────────
const isAllCompleted = computed(() => {
  const sets = local.value.sets ?? []
  return sets.length > 0 && sets.every((s) => s.completed)
})

const cardPulse = ref(false)
watch(isAllCompleted, (v) => {
  if (v) {
    cardPulse.value = true
    setTimeout(() => { cardPulse.value = false }, 700)
  }
})

// ── Template helper: control fields definition ──────────────────────────────
const ctrlFields = [
  { label: 'Series', key: 'setsCount' },
  { label: 'Reps',   key: 'reps'      },
  { label: 'Peso',   key: 'weight'    },
  { label: 'Desc.',  key: 'rest'      },
]
</script>

<style scoped>
@keyframes card-complete-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary) 0%, transparent); }
  30%  { box-shadow: 0 0 0 8px color-mix(in oklch, var(--primary) 25%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--primary) 0%, transparent); }
}
.card-complete-pulse {
  animation: card-complete-pulse 0.7s ease-out;
}
</style>
