<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <!-- Header -->
    <button
      type="button"
      @click="open = !open"
      class="flex w-full items-center justify-between p-4 text-left"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full text-lg"
          :class="logged ? 'bg-emerald-500/10' : 'bg-accent/10'"
        >
          {{ mealIcon }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <p class="font-medium text-foreground">{{ meal.name }}</p>
            <span v-if="logged"
              class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
              ✓ Registrado
            </span>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ meal.calories ?? 0 }} kcal · P: {{ meal.protein ?? 0 }}g · C: {{ meal.carbs ?? 0 }}g · G: {{ meal.fat ?? 0 }}g
          </p>
        </div>
      </div>
      <svg :class="open ? 'rotate-180' : ''" class="h-4 w-4 text-muted-foreground transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    <!-- Expanded -->
    <div v-if="open" class="border-t px-4 pb-4 pt-3 space-y-4">
      <!-- Logged macros vs plan -->
      <div v-if="logged && logEntry" class="grid grid-cols-4 gap-2 text-center text-xs">
        <div class="rounded-lg bg-primary/5 p-2">
          <p class="font-semibold text-primary">{{ logEntry.calories ?? '—' }}</p>
          <p class="text-muted-foreground">kcal</p>
        </div>
        <div class="rounded-lg bg-accent/5 p-2">
          <p class="font-semibold text-accent">{{ logEntry.protein ?? '—' }}g</p>
          <p class="text-muted-foreground">prot</p>
        </div>
        <div class="rounded-lg p-2" style="background: oklch(0.65 0.15 150 / 0.07)">
          <p class="font-semibold" style="color: oklch(0.55 0.15 150)">{{ logEntry.carbs ?? '—' }}g</p>
          <p class="text-muted-foreground">carbs</p>
        </div>
        <div class="rounded-lg p-2" style="background: oklch(0.65 0.15 50 / 0.07)">
          <p class="font-semibold" style="color: oklch(0.55 0.15 50)">{{ logEntry.fat ?? '—' }}g</p>
          <p class="text-muted-foreground">grasas</p>
        </div>
      </div>

      <!-- Foods from plan -->
      <div v-if="meal.foods?.length" class="space-y-1">
        <p class="text-xs font-medium text-foreground">Alimentos del plan</p>
        <div v-for="f in meal.foods" :key="f.name"
          class="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
          <span class="text-foreground">{{ f.name }}</span>
          <span class="text-muted-foreground">{{ f.quantity }} · {{ f.calories }}kcal</span>
        </div>
      </div>

      <!-- Notes from plan -->
      <p v-if="meal.notes" class="text-xs text-muted-foreground italic">{{ meal.notes }}</p>

      <!-- Custom macros form (when editing) -->
      <div v-if="editing" class="space-y-3 rounded-xl border bg-muted/20 p-3">
        <p class="text-xs font-semibold text-foreground">Registrar macros reales</p>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1">
            <span class="text-xs text-muted-foreground">Calorías</span>
            <input v-model.number="form.calories" type="number" placeholder="kcal"
              class="w-full rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <label class="space-y-1">
            <span class="text-xs text-muted-foreground">Proteína (g)</span>
            <input v-model.number="form.protein" type="number" placeholder="0"
              class="w-full rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <label class="space-y-1">
            <span class="text-xs text-muted-foreground">Carbs (g)</span>
            <input v-model.number="form.carbs" type="number" placeholder="0"
              class="w-full rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
          <label class="space-y-1">
            <span class="text-xs text-muted-foreground">Grasas (g)</span>
            <input v-model.number="form.fat" type="number" placeholder="0"
              class="w-full rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </label>
        </div>
        <div class="flex gap-2">
          <button type="button" @click="submitCustom"
            class="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Guardar
          </button>
          <button type="button" @click="editing = false"
            class="rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40">
            Cancelar
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!editing" class="flex gap-2">
        <button
          v-if="!logged"
          type="button"
          :disabled="loading"
          @click="registerPlan"
          class="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {{ loading ? 'Guardando…' : 'Seguí el plan' }}
        </button>
        <button
          type="button"
          :disabled="loading"
          @click="editing = true"
          class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
        >
          {{ logged ? 'Editar' : 'Modificar macros' }}
        </button>
        <button
          v-if="logged && logEntry"
          type="button"
          :disabled="loading"
          @click="removeLog"
          class="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 disabled:opacity-50"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { MealLogFull } from '../repo/nutritionRepo'

const props = defineProps<{
  meal: any       // plan meal object
  mealKey: string
  todayLogs: MealLogFull[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'register-plan', mealKey: string): void
  (e: 'register-custom', mealKey: string, data: { calories?: number; protein?: number; carbs?: number; fat?: number }): void
  (e: 'delete', logId: string): void
}>()

const open = ref(false)
const editing = ref(false)

const MEAL_ICONS: Record<string, string> = {
  desayuno: '🌅',
  almuerzo: '🍽️',
  cena: '🌙',
  snack: '🍎',
}

const mealIcon = computed(() => MEAL_ICONS[props.meal?.type] ?? '🍴')

const logEntry = computed(() =>
  props.todayLogs.find(l => l.meal_key === props.mealKey) ?? null
)
const logged = computed(() => !!logEntry.value)

const form = reactive({
  calories: props.meal?.calories ?? 0,
  protein: props.meal?.protein ?? 0,
  carbs: props.meal?.carbs ?? 0,
  fat: props.meal?.fat ?? 0,
})

function registerPlan() {
  emit('register-plan', props.mealKey)
}

function submitCustom() {
  emit('register-custom', props.mealKey, { ...form })
  editing.value = false
}

function removeLog() {
  if (logEntry.value) emit('delete', logEntry.value.id)
}
</script>
