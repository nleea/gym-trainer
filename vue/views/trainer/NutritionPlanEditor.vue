<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button type="button" @click="$router.back()"
        class="rounded-lg border p-2 text-muted-foreground hover:bg-muted/40">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <div>
        <h1 class="text-xl font-bold text-foreground">{{ isEdit ? 'Editar plan' : 'Nuevo plan nutricional' }}</h1>
        <p class="text-sm text-muted-foreground">Define metas y comidas por día</p>
      </div>
    </div>

    <!-- Plan name + macro targets -->
    <div class="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <h3 class="text-sm font-semibold text-foreground">Información general</h3>

      <label class="block space-y-1">
        <span class="text-xs text-muted-foreground">Nombre del plan *</span>
        <input v-model="form.name" type="text" placeholder="Ej: Plan volumen verano"
          class="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </label>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label v-for="f in macroFields" :key="f.key" class="space-y-1">
          <span class="text-xs text-muted-foreground">{{ f.label }}</span>
          <input v-model.number="(form as Record<string, unknown>)[f.key]" type="number" :placeholder="f.placeholder"
            class="w-full rounded-lg border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-xs text-muted-foreground">Agua objetivo (ml)</span>
          <input v-model.number="form.water_ml" type="number" placeholder="2000"
            class="w-full rounded-lg border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </label>
        <label class="space-y-1">
          <span class="text-xs text-muted-foreground">Comidas/día</span>
          <input v-model.number="form.meals_per_day" type="number" placeholder="4"
            class="w-full rounded-lg border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </label>
      </div>

      <label class="block space-y-1">
        <span class="text-xs text-muted-foreground">Notas generales</span>
        <textarea v-model="form.notes" rows="2" placeholder="Indicaciones, restricciones..."
          class="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </label>
    </div>

    <!-- Day tabs -->
    <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div class="border-b bg-muted/20 px-4 pt-4">
        <div class="flex gap-1 overflow-x-auto pb-3">
          <button
            v-for="d in weekDays" :key="d.key"
            type="button"
            @click="activeDay = d.key"
            class="shrink-0 rounded-lg px-3 py-1.5 text-sm transition-all"
            :class="activeDay === d.key
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:bg-muted/40'"
          >
            {{ d.short }}
          </button>
        </div>
      </div>

      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-foreground">{{ activeDayLabel }}</h4>
          <button type="button" @click="addMeal"
            class="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-primary hover:bg-primary/5">
            + Añadir comida
          </button>
        </div>

        <div v-if="activeMeals.length === 0"
          class="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No hay comidas. Añade la primera.
        </div>

        <div v-for="(meal, idx) in activeMeals" :key="idx"
          class="rounded-xl border bg-muted/20 p-3 space-y-3">
          <div class="flex items-center justify-between">
            <select v-model="meal.type"
              class="rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none">
              <option value="desayuno">🌅 Desayuno</option>
              <option value="almuerzo">🍽️ Almuerzo</option>
              <option value="cena">🌙 Cena</option>
              <option value="snack">🍎 Snack</option>
            </select>
            <button type="button" @click="removeMeal(idx)"
              class="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950">✕</button>
          </div>

          <input v-model="meal.name" type="text" placeholder="Nombre de la comida"
            class="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label class="space-y-0.5">
              <span class="text-[10px] text-muted-foreground">Calorías</span>
              <input v-model.number="meal.calories" type="number" placeholder="0"
                class="w-full rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none" />
            </label>
            <label class="space-y-0.5">
              <span class="text-[10px] text-muted-foreground">Proteína (g)</span>
              <input v-model.number="meal.protein" type="number" placeholder="0"
                class="w-full rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none" />
            </label>
            <label class="space-y-0.5">
              <span class="text-[10px] text-muted-foreground">Carbs (g)</span>
              <input v-model.number="meal.carbs" type="number" placeholder="0"
                class="w-full rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none" />
            </label>
            <label class="space-y-0.5">
              <span class="text-[10px] text-muted-foreground">Grasas (g)</span>
              <input v-model.number="meal.fat" type="number" placeholder="0"
                class="w-full rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none" />
            </label>
          </div>

          <input v-model="meal.notes" type="text" placeholder="Notas (opcional)"
            class="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-sm text-rose-500">{{ error }}</p>

    <!-- Save -->
    <div class="flex gap-3 pb-6">
      <button type="button" @click="save" :disabled="saving"
        class="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan' }}
      </button>
      <button type="button" @click="$router.back()"
        class="rounded-xl border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted/40">
        Cancelar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../api'
import { getNutritionPlanById } from '../../repo/nutritionPlan'
import type { MealFood } from '../../types'

const route = useRoute()
const router = useRouter()

type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

const weekDays: { key: DayKey; short: string; label: string }[] = [
  { key: 'lunes', short: 'Lun', label: 'Lunes' },
  { key: 'martes', short: 'Mar', label: 'Martes' },
  { key: 'miercoles', short: 'Mié', label: 'Miércoles' },
  { key: 'jueves', short: 'Jue', label: 'Jueves' },
  { key: 'viernes', short: 'Vie', label: 'Viernes' },
  { key: 'sabado', short: 'Sáb', label: 'Sábado' },
  { key: 'domingo', short: 'Dom', label: 'Domingo' },
]

const macroFields = [
  { key: 'target_calories', label: 'Calorías (kcal)', placeholder: '2000' },
  { key: 'target_protein', label: 'Proteína (g)', placeholder: '150' },
  { key: 'target_carbs', label: 'Carbs (g)', placeholder: '200' },
  { key: 'target_fat', label: 'Grasas (g)', placeholder: '70' },
]

const planId = computed(() => route.params.id as string | undefined)
const isEdit = computed(() => !!planId.value)

interface MealForm {
  type: string
  name: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  notes?: string
  foods?: MealFood[]
}

const emptyDays = () =>
  weekDays.map(d => ({ day: d.key, meals: [] as MealForm[] }))

const form = reactive({
  name: '',
  target_calories: undefined as number | undefined,
  target_protein: undefined as number | undefined,
  target_carbs: undefined as number | undefined,
  target_fat: undefined as number | undefined,
  water_ml: undefined as number | undefined,
  meals_per_day: undefined as number | undefined,
  notes: '',
  days: emptyDays(),
})

const activeDay = ref<DayKey>('lunes')
const activeDayLabel = computed(() => weekDays.find(d => d.key === activeDay.value)?.label ?? '')

const activeMeals = computed(() =>
  form.days.find(d => d.day === activeDay.value)?.meals ?? []
)

function addMeal() {
  const day = form.days.find(d => d.day === activeDay.value)
  if (day) day.meals.push({ type: 'desayuno', name: '' })
}

function removeMeal(idx: number) {
  const day = form.days.find(d => d.day === activeDay.value)
  if (day) day.meals.splice(idx, 1)
}

// Load existing plan for editing
onMounted(async () => {
  if (!isEdit.value || !planId.value) return
  const plan = await getNutritionPlanById(planId.value)
  if (!plan) return

  const raw = plan as unknown as Record<string, unknown>
  form.name = (raw.name as string) ?? ''
  form.target_calories = raw.target_calories as number | undefined
  form.target_protein = raw.target_protein as number | undefined
  form.target_carbs = raw.target_carbs as number | undefined
  form.target_fat = raw.target_fat as number | undefined
  form.water_ml = raw.water_ml as number | undefined
  form.meals_per_day = raw.meals_per_day as number | undefined
  form.notes = (raw.notes as string) ?? ''

  if (Array.isArray(raw.days)) {
    form.days = weekDays.map(wd => {
      const existing = (raw.days as Array<{ day: string; meals: MealForm[] }>).find(d => d.day === wd.key)
      return { day: wd.key, meals: existing?.meals ?? [] }
    })
  }
})

const saving = ref(false)
const error = ref<string | null>(null)

async function save() {
  if (!form.name.trim()) { error.value = 'El nombre es obligatorio'; return }
  error.value = null
  saving.value = true

  const payload = {
    name: form.name.trim(),
    target_calories: form.target_calories ?? null,
    target_protein: form.target_protein ?? null,
    target_carbs: form.target_carbs ?? null,
    target_fat: form.target_fat ?? null,
    water_ml: form.water_ml ?? null,
    meals_per_day: form.meals_per_day ?? null,
    notes: form.notes || null,
    days: form.days,
  }

  try {
    if (isEdit.value) {
      await api.put(`/nutrition-plans/${planId.value}`, payload)
    } else {
      await api.post('/nutrition-plans', payload)
    }
    router.back()
  } catch (e: unknown) {
    error.value = (e instanceof Error ? e.message : null) ?? 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>
