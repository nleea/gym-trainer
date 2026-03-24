<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppToast } from '../composables/useAppToast'
import { usePlansStore } from '../stores/plan.store'
import { parseAIPlan } from '../../lib/parseAIPlan'
import type { Client } from '../types'

const { t } = useI18n()
const toast = useAppToast()
const plansStore = usePlansStore()

const props = defineProps<{
  client: Client
  trainerId: string
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const step = ref<1 | 2>(1)
const copied = ref(false)
const aiResponse = ref('')
const parsing = ref(false)
const parseError = ref<string | null>(null)
const saving = ref(false)

const template = computed(() => {
  const c = props.client
  return `Eres un entrenador personal y nutricionista experto. Tu tarea es generar un plan de entrenamiento y nutrición personalizado para el cliente descrito abajo.

REGLA MÁS IMPORTANTE: Devuelve la respuesta EXACTAMENTE en el formato indicado al final de este prompt, sin agregar texto adicional antes ni después.

== PERFIL DEL CLIENTE ==
- Nombre: ${c.name || '[NOMBRE]'}
- Edad: ${c.age || '[EDAD]'}
- Sexo: [SEXO]
- Peso actual: ${c.weight ? c.weight + ' kg' : '[PESO]'}
- Altura: ${c.height ? c.height + ' cm' : '[ALTURA]'}
- Objetivo principal: ${c.goals || '[OBJETIVO]'}
- Nivel de experiencia: [NIVEL]
- Días disponibles para entrenar: [DIAS]
- Equipamiento disponible: [EQUIPAMIENTO]
- Restricciones o lesiones: [RESTRICCIONES]
- Restricciones alimentarias: [RESTRICCIONES_ALIMENTARIAS]
- Notas adicionales: ${c.notes || '[NOTAS]'}

== FORMATO DE RESPUESTA OBLIGATORIO ==

### PLAN_INICIO
**Cliente:** [Nombre]
**Objetivo:** [Objetivo]
**Duración del plan:** [ej: 8 semanas]
**Calorías diarias totales:** [número] kcal
**Macros diarios:** Proteína [g]g | Carbohidratos [g]g | Grasas [g]g
**Agua diaria:** [número] ml
### PLAN_FIN

### ENTRENAMIENTO_INICIO

#### DIA_1
**Nombre del día:** [ej: Empuje — Pecho, Hombros, Tríceps]
**Tipo:** [Fuerza / Hipertrofia / Cardio / Full Body]

| # | Ejercicio | Series | Reps | Descanso | Notas |
|---|-----------|--------|------|----------|-------|
| 1 | [Ejercicio] | [X] | [X] | [X seg] | [nota] |
| 2 | [Ejercicio] | [X] | [X] | [X seg] | |

#### DIA_2
[... repetir por cada día de entrenamiento ...]

### ENTRENAMIENTO_FIN

### NUTRICION_INICIO

#### COMIDA_1
**Nombre:** [ej: Desayuno]
**Hora sugerida:** [ej: 07:00]

| Alimento | Cantidad | Proteína | Carbos | Grasas | Kcal |
|----------|----------|----------|--------|--------|------|
| [Alimento] | [g] | [g] | [g] | [g] | [kcal] |
| **TOTAL** | | **[g]** | **[g]** | **[g]** | **[kcal]** |

#### COMIDA_2
[... repetir por cada comida del día ...]

### NUTRICION_FIN

### NOTAS_ENTRENADOR_INICIO
- [Recomendación 1]
- [Recomendación 2]
### NOTAS_ENTRENADOR_FIN`
})

async function copyTemplate() {
  try {
    await navigator.clipboard.writeText(template.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    toast.error('No se pudo copiar al portapapeles')
  }
}

// Progressive overload: vary exercises across weeks
function progressExercise(ex: { series: number; reps: string; descanso: string }, weekNum: number) {
  const baseSets = ex.series
  const baseReps = ex.reps
  const baseRest = ex.descanso

  // Parse base reps (handle "8-10", "12", etc.)
  const repsMatch = baseReps.match(/(\d+)/)
  const baseRepNum = repsMatch ? parseInt(repsMatch[1]) : 10
  const restMatch = baseRest.match(/(\d+)/)
  const baseRestSec = restMatch ? parseInt(restMatch[1]) : 90

  switch (weekNum) {
    case 1: // Adaptación: menos series, más reps
      return { sets: Math.max(baseSets - 1, 2), reps: `${baseRepNum + 2}`, rest: `${baseRestSec + 15} seg` }
    case 2: // Base: como lo generó la IA
      return { sets: baseSets, reps: baseReps, rest: baseRest }
    case 3: // Progresión: más series
      return { sets: baseSets + 1, reps: baseReps, rest: `${Math.max(baseRestSec - 10, 45)} seg` }
    case 4: // Intensificación: menos reps, más peso implícito
      return { sets: baseSets, reps: `${Math.max(baseRepNum - 2, 4)}`, rest: `${baseRestSec + 15} seg` }
    default:
      return { sets: baseSets, reps: baseReps, rest: baseRest }
  }
}

async function createPlan() {
  parseError.value = null
  const text = aiResponse.value.trim()
  if (!text) {
    parseError.value = 'Pega la respuesta de la IA antes de continuar.'
    return
  }

  parsing.value = true
  try {
    const parsed = parseAIPlan(text)
    const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
    const numWeeks = parsed.plan.semanas || 4

    saving.value = true

    // Create training plan with multiple weeks + progressive variation
    const trainingWeeks = Array.from({ length: numWeeks }, (_, weekIdx) => ({
      weekNumber: weekIdx + 1,
      days: parsed.entrenamiento.map((day, dayIdx) => {
        const dayKey = DAYS[dayIdx % 7] || 'lunes'
        return {
          day: dayKey as any,
          exercises: day.ejercicios.map(ex => {
            const prog = progressExercise(ex, weekIdx + 1)
            return {
              id: crypto.randomUUID(),
              name: ex.nombre,
              muscleGroup: day.tipo || '',
              sets: prog.sets,
              reps: prog.reps,
              rest: prog.rest,
              notes: weekIdx === 0 ? (ex.notas || undefined) : `Semana ${weekIdx + 1}${ex.notas ? ' — ' + ex.notas : ''}`,
            }
          }),
          notes: day.nombre,
        }
      }),
    }))

    const trainingPlan = {
      name: `${parsed.plan.objetivo} — ${props.client.name}`,
      description: `Plan IA: ${parsed.plan.duracion}. ${parsed.plan.calorias} kcal/día. Agua: ${parsed.plan.aguaMl} ml/día. Notas: ${parsed.notas.join('. ')}`,
      weeks: trainingWeeks,
      isTemplate: false,
      clientId: props.client.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await plansStore.addTrainingPlan(trainingPlan)

    // Create nutrition plan with water target
    const nutritionDays = parsed.nutricion.map((meal, i) => ({
      day: (DAYS[i % 7] || 'lunes') as any,
      meals: [{
        id: crypto.randomUUID(),
        type: (['desayuno', 'almuerzo', 'cena', 'snack'][i % 4] || 'snack') as any,
        name: meal.nombre,
        description: `Hora sugerida: ${meal.hora}`,
        calories: meal.totales.kcal,
        protein: meal.totales.proteina,
        carbs: meal.totales.carbos,
        fat: meal.totales.grasas,
        foods: meal.alimentos.map(f => ({
          name: f.nombre,
          quantity: f.cantidad,
          protein: f.proteina,
          carbs: f.carbos,
          fat: f.grasas,
          calories: f.kcal,
        })),
        date: new Date(),
      }],
    }))

    const nutritionPlan = {
      name: `Nutrición IA — ${props.client.name}`,
      description: `${parsed.plan.calorias} kcal | P:${parsed.plan.macros.proteina}g C:${parsed.plan.macros.carbohidratos}g G:${parsed.plan.macros.grasas}g | Agua: ${parsed.plan.aguaMl} ml`,
      targetCalories: parsed.plan.calorias,
      targetProtein: parsed.plan.macros.proteina,
      targetCarbs: parsed.plan.macros.carbohidratos,
      targetFat: parsed.plan.macros.grasas,
      water_ml: parsed.plan.aguaMl,
      days: nutritionDays,
      isTemplate: false,
      clientId: props.client.id,
      guidelines: parsed.notas,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await plansStore.addNutritionPlan(nutritionPlan)

    toast.success(`Plan creado: ${numWeeks} semanas de entrenamiento + nutrición`)
    emit('created')
    emit('close')
  } catch (e: unknown) {
    parseError.value = e instanceof Error ? e.message : 'Error al procesar el texto'
  } finally {
    parsing.value = false
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-panel">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h2 class="text-base font-bold text-foreground">Crear con IA</h2>
            <p class="text-xs text-muted-foreground mt-0.5">{{ client.name }}</p>
          </div>
          <button class="modal-close-btn" @click="emit('close')">
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>

        <!-- Steps indicator -->
        <div class="flex items-center gap-2 px-5 py-3 border-b border-border">
          <div :class="['step-dot', step >= 1 && 'step-active']">1</div>
          <div class="step-line" />
          <div :class="['step-dot', step >= 2 && 'step-active']">2</div>
          <span class="text-xs text-muted-foreground ml-2">
            {{ step === 1 ? 'Copiar template' : 'Pegar respuesta' }}
          </span>
        </div>

        <!-- Body -->
        <div class="modal-body">

          <!-- STEP 1: Copy template -->
          <template v-if="step === 1">
            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-semibold text-foreground">Genera el plan con ChatGPT o Claude</h3>
                <p class="text-xs text-muted-foreground mt-1">
                  Copia este template, pégalo en ChatGPT o Claude con los datos de tu cliente, y luego pega la respuesta en el siguiente paso.
                </p>
              </div>

              <div class="template-block">
                <pre class="text-xs text-foreground whitespace-pre-wrap break-words">{{ template }}</pre>
              </div>

              <button
                class="btn-copy"
                @click="copyTemplate"
              >
                {{ copied ? '✅ Copiado' : '📋 Copiar template' }}
              </button>
            </div>
          </template>

          <!-- STEP 2: Paste AI response -->
          <template v-if="step === 2">
            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-semibold text-foreground">Pega aquí la respuesta de la IA</h3>
                <p class="text-xs text-muted-foreground mt-1">
                  Pega el texto que te devolvió ChatGPT o Claude.
                </p>
              </div>

              <textarea
                v-model="aiResponse"
                class="ai-textarea"
                placeholder="Pega aquí la respuesta de ChatGPT o Claude..."
                rows="14"
              />

              <div v-if="parseError" class="parse-error">
                {{ parseError }}
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button v-if="step === 2" class="btn-cancel" @click="step = 1">
            ← Volver
          </button>
          <button v-else class="btn-cancel" @click="emit('close')">
            Cancelar
          </button>

          <button
            v-if="step === 1"
            class="btn-next"
            @click="step = 2"
          >
            Siguiente →
          </button>
          <button
            v-else
            class="btn-create"
            :disabled="saving || parsing || !aiResponse.trim()"
            @click="createPlan"
          >
            <span v-if="saving || parsing" class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            {{ saving ? 'Guardando...' : parsing ? 'Procesando...' : '⚡ Crear plan' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}
@media (min-width: 640px) {
  .modal-backdrop { align-items: center; }
}

.modal-panel {
  width: 100%;
  max-width: 680px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}
@media (min-width: 640px) {
  .modal-panel { border-radius: 1rem; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-close-btn {
  padding: 8px;
  border-radius: 8px;
  color: var(--muted-foreground);
  transition: background 0.15s;
}
.modal-close-btn:hover { background: var(--muted); }

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  border: 2px solid var(--border);
  color: var(--muted-foreground);
  transition: all 0.2s;
}
.step-active {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-foreground);
}
.step-line {
  flex: 0 0 24px;
  height: 2px;
  background: var(--border);
  border-radius: 1px;
}

.template-block {
  max-height: 320px;
  overflow-y: auto;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--muted);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.btn-copy {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-copy:hover { background: var(--muted); }

.ai-textarea {
  width: 100%;
  min-height: 300px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--foreground);
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  resize: vertical;
  transition: border-color 0.15s;
}
.ai-textarea:focus {
  outline: none;
  border-color: var(--primary);
}
.ai-textarea::placeholder {
  color: var(--muted-foreground);
}

.parse-error {
  padding: 10px 14px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--destructive) 10%, transparent);
  border: 1px solid color-mix(in oklch, var(--destructive) 30%, transparent);
  color: var(--destructive);
  font-size: 13px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cancel:hover { background: var(--muted); }

.btn-next, .btn-create {
  flex: 2;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: var(--primary);
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-foreground);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
}
.btn-next:hover, .btn-create:hover { opacity: 0.9; }
.btn-create:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
