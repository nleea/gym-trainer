<template>
  <div class="min-h-screen bg-background" ref="rootEl">

    <!-- ══════════════════════════════════════
         SUCCESS SCREEN
    ══════════════════════════════════════ -->
    <TransitionRoot as="template" :show="showSuccess" appear>
      <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 sm:px-6">
        <TransitionChild
          enter="transition-all duration-500 ease-out"
          enter-from="opacity-0 scale-90"
          enter-to="opacity-100 scale-100"
          leave="transition-opacity duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="flex flex-col items-center text-center max-w-sm w-full">
            <!-- Animated check icon -->
            <div class="success-check-wrap mb-6">
              <svg viewBox="0 0 64 64" fill="none" class="w-16 h-16">
                <circle cx="32" cy="32" r="30" stroke="var(--chart-2)" stroke-width="3" fill="color-mix(in oklch, var(--chart-2) 12%, transparent)" />
                <path d="M18 33l10 10 18-18" stroke="var(--chart-2)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="check-path" />
              </svg>
            </div>

            <h1 class="mb-2 text-2xl font-black text-foreground sm:text-3xl">Check-in completado!</h1>
            <p class="text-sm text-muted-foreground mb-8">
              Tu trainer puede ver como estas esta semana
            </p>

            <!-- Summary pills -->
            <div class="flex flex-wrap gap-2 justify-center mb-10">
              <div v-if="form.sleepHours != null" class="summary-pill">
                <span>Sueno</span>
                <span class="font-bold">{{ form.sleepHours === 10 ? '+9h' : `${form.sleepHours}h` }}</span>
              </div>
              <div v-if="form.stressLevel != null" class="summary-pill" :style="{ background: stressColorVal(form.stressLevel) + '22', borderColor: stressColorVal(form.stressLevel) + '44' }">
                <span>Estres</span>
                <span class="font-bold">{{ form.stressLevel }}/10</span>
              </div>
              <div v-if="form.energyLevel != null" class="summary-pill" :style="{ background: energyColorVal(form.energyLevel) + '22', borderColor: energyColorVal(form.energyLevel) + '44' }">
                <span>Energia</span>
                <span class="font-bold">{{ form.energyLevel }}/10</span>
              </div>
              <div v-if="form.mood" class="summary-pill">
                <span>{{ moodMap[form.mood]?.emoji }}</span>
                <span class="font-bold">{{ moodMap[form.mood]?.label }}</span>
              </div>
            </div>

            <button @click="goHome" class="btn-primary w-full">
              Volver al inicio
            </button>
          </div>
        </TransitionChild>
      </div>
    </TransitionRoot>

    <!-- ══════════════════════════════════════
         WIZARD
    ══════════════════════════════════════ -->
    <div v-if="!showSuccess" class="flex flex-col min-h-screen">

      <!-- Sticky header -->
      <header class="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3">
        <div class="flex items-center gap-3 mb-3">
          <!-- Back button -->
          <button
            v-if="currentStep > 1"
            @click="prevStep"
            class="back-btn flex-shrink-0"
            aria-label="Paso anterior"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
            </svg>
          </button>
          <div v-else class="w-9 flex-shrink-0" />

          <!-- Title block -->
          <div class="flex-1 text-center">
            <h1 class="text-base font-bold text-foreground leading-none">Check-in semanal</h1>
            <p class="text-xs text-muted-foreground mt-0.5">{{ weekRange }}</p>
          </div>

          <div class="w-9 flex-shrink-0" />
        </div>

        <!-- Progress -->
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <span class="text-xs font-semibold text-muted-foreground flex-shrink-0">
            {{ currentStep }}/6
          </span>
        </div>
      </header>

      <!-- Step content (swipe target) -->
      <div ref="stepContainer" class="flex-1 overflow-hidden relative">
        <Transition
          :enter-active-class="'transition-all duration-300 ease-out'"
          :enter-from-class="direction === 'forward' ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0'"
          enter-to-class="translate-x-0 opacity-100"
          :leave-active-class="'transition-all duration-200 ease-in absolute inset-0'"
          leave-from-class="translate-x-0 opacity-100"
          :leave-to-class="direction === 'forward' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0'"
          mode="out-in"
        >
          <div :key="currentStep" class="px-4 py-5 sm:py-6">

            <!-- ── Step 1: Sleep ── -->
            <div v-if="currentStep === 1">
              <p class="step-question">Cuantas horas dormiste en promedio?</p>
              <div class="flex flex-wrap gap-2 mt-5">
                <button
                  v-for="opt in sleepHoursOptions"
                  :key="opt.value"
                  @click="form.sleepHours = opt.value"
                  :class="['chip', form.sleepHours === opt.value ? 'chip-active' : '']"
                >
                  {{ opt.label }}
                </button>
              </div>

              <p class="step-subquestion mt-8">Como fue la calidad?</p>
              <div class="flex gap-2 mt-4 flex-wrap">
                <button
                  v-for="opt in sleepQualityOptions"
                  :key="opt.value"
                  @click="form.sleepQuality = opt.value"
                  :class="['quality-btn', form.sleepQuality === opt.value ? 'quality-active' : '']"
                >
                  <span class="text-2xl">{{ opt.emoji }}</span>
                  <span class="text-xs mt-1 leading-none">{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <!-- ── Step 2: Stress ── -->
            <div v-else-if="currentStep === 2">
              <p class="step-question">Como fue tu nivel de estres?</p>
              <div class="mt-8 px-2">
                <div class="slider-label-big" :style="{ color: stressColorVal(form.stressLevel) }">
                  {{ stressLabel(form.stressLevel) }}
                </div>
                <div class="relative mt-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    v-model.number="form.stressLevel"
                    class="slider-input"
                    :style="{ '--thumb-color': stressColorVal(form.stressLevel), '--fill-color': stressColorVal(form.stressLevel) }"
                  />
                  <div class="flex justify-between mt-1 px-0.5">
                    <span class="text-xs text-muted-foreground">1</span>
                    <span class="text-xs text-muted-foreground">10</span>
                  </div>
                </div>
                <div class="flex justify-between mt-3 text-[10px] text-muted-foreground">
                  <span class="text-chart-2">Relajado</span>
                  <span class="text-destructive">Muy estresado</span>
                </div>
              </div>
            </div>

            <!-- ── Step 3: Energy ── -->
            <div v-else-if="currentStep === 3">
              <p class="step-question">Como estuvo tu energia?</p>
              <div class="mt-8 px-2">
                <div class="slider-label-big" :style="{ color: energyColorVal(form.energyLevel) }">
                  {{ energyLabel(form.energyLevel) }}
                </div>
                <div class="relative mt-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    v-model.number="form.energyLevel"
                    class="slider-input"
                    :style="{ '--thumb-color': energyColorVal(form.energyLevel), '--fill-color': energyColorVal(form.energyLevel) }"
                  />
                  <div class="flex justify-between mt-1 px-0.5">
                    <span class="text-xs text-muted-foreground">1</span>
                    <span class="text-xs text-muted-foreground">10</span>
                  </div>
                </div>
                <div class="flex justify-between mt-3 text-[10px] text-muted-foreground">
                  <span>Sin energia</span>
                  <span>Con mucha energia</span>
                </div>
              </div>
            </div>

            <!-- ── Step 4: Muscle soreness ── -->
            <div v-else-if="currentStep === 4">
              <p class="step-question">Como estan tus musculos?</p>
              <div class="mt-5 space-y-2.5">
                <button
                  v-for="opt in sorenessOptions"
                  :key="opt.value"
                  @click="form.muscleSoreness = opt.value"
                  :class="['soreness-btn', form.muscleSoreness === opt.value ? 'soreness-active' : '']"
                >
                  <span class="text-2xl">{{ opt.emoji }}</span>
                  <span class="text-sm font-medium">{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <!-- ── Step 5: Mood ── -->
            <div v-else-if="currentStep === 5">
              <p class="step-question">Como te sentiste esta semana?</p>
              <div class="mt-8 flex justify-around gap-1">
                <button
                  v-for="opt in moodOptions"
                  :key="opt.value"
                  @click="form.mood = opt.value"
                  :class="['mood-btn', form.mood === opt.value ? 'mood-active' : '']"
                >
                  <span :class="['text-4xl transition-transform duration-200', form.mood === opt.value ? 'scale-125' : 'scale-100']">{{ opt.emoji }}</span>
                  <span class="text-[10px] mt-1 font-medium text-muted-foreground">{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <!-- ── Step 6: Notes ── -->
            <div v-else-if="currentStep === 6">
              <p class="step-question">Algo mas para tu trainer?</p>
              <p class="text-sm text-muted-foreground mt-1">(opcional)</p>
              <div class="mt-5 relative">
                <textarea
                  v-model="form.notes"
                  maxlength="500"
                  rows="6"
                  placeholder="Ej: tuve mucho trabajo, viaje, dormi mal por estres..."
                  class="notes-textarea"
                />
                <span class="text-xs text-muted-foreground absolute bottom-3 right-3">
                  {{ form.notes.length }}/500
                </span>
              </div>
              <button @click="skipNotes" class="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors block mx-auto">
                Saltar este paso
              </button>
            </div>

          </div>
        </Transition>
      </div>

      <!-- Footer CTA -->
      <div class="sticky bottom-0 bg-background border-t border-border px-4 py-4 safe-bottom">
        <button
          @click="nextOrSubmit"
          :disabled="saving"
          :class="['btn-primary w-full', !canAdvance ? 'opacity-50' : '', shakeCta ? 'shake-anim' : '']"
        >
          <span v-if="saving" class="loading-dots">Guardando</span>
          <span v-else>{{ currentStep < 6 ? 'Siguiente' : 'Guardar check-in' }}</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { TransitionRoot, TransitionChild } from '@headlessui/vue'
import { useSwipe } from '@vueuse/core'
import confetti from 'canvas-confetti'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { useCheckinStore } from '../../stores/checkin.store'
import { useAuthStore } from '../../stores/auth'
import { getWeekStartISO } from '../../repo/checkinRepo'

const router = useRouter()
const checkinStore = useCheckinStore()
const authStore = useAuthStore()

// ── State ────────────────────────────────────────────────────────
const currentStep = ref(1)
const direction = ref<'forward' | 'back'>('forward')
const showSuccess = ref(false)
const saving = ref(false)
const shakeCta = ref(false)
const stepContainer = ref<HTMLElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)

const form = reactive({
  sleepHours: null as number | null,
  sleepQuality: null as number | null,
  stressLevel: 5,
  energyLevel: 5,
  muscleSoreness: null as number | null,
  mood: null as string | null,
  notes: '',
})

// ── Swipe ─────────────────────────────────────────────────────────
useSwipe(stepContainer, {
  threshold: 50,
  onSwipeEnd(_, swipeDirection) {
    if (swipeDirection === 'left') nextOrSubmit()
    else if (swipeDirection === 'right') prevStep()
  },
})

// ── Week range ───────────────────────────────────────────────────
const weekRange = computed(() => {
  const ws = startOfWeek(new Date(), { weekStartsOn: 1 })
  const we = endOfWeek(new Date(), { weekStartsOn: 1 })
  return `${format(ws, 'd')} – ${format(we, 'd MMM')}`
})

const progressPercent = computed(() => (currentStep.value / 6) * 100)

// ── Options ──────────────────────────────────────────────────────
const sleepHoursOptions = [
  { value: 5, label: '5h' },
  { value: 6, label: '6h' },
  { value: 7, label: '7h' },
  { value: 8, label: '8h' },
  { value: 9, label: '9h' },
  { value: 10, label: '+9h' },
]

const sleepQualityOptions = [
  { value: 2,  emoji: '😴', label: 'Pesima' },
  { value: 4,  emoji: '😐', label: 'Regular' },
  { value: 6,  emoji: '🙂', label: 'Buena' },
  { value: 8,  emoji: '😊', label: 'Muy buena' },
  { value: 10, emoji: '🌟', label: 'Excelente' },
]

const sorenessOptions = [
  { value: 1, emoji: '😌', label: 'Sin dolor' },
  { value: 2, emoji: '😕', label: 'Leve agujetas' },
  { value: 3, emoji: '😣', label: 'Moderado' },
  { value: 4, emoji: '😫', label: 'Bastante dolor' },
  { value: 5, emoji: '🚨', label: 'No puedo entrenar' },
]

const moodOptions = [
  { value: 'bad',       emoji: '😔', label: 'Mal' },
  { value: 'regular',   emoji: '😐', label: 'Regular' },
  { value: 'good',      emoji: '🙂', label: 'Bien' },
  { value: 'very_good', emoji: '😊', label: 'Muy bien' },
  { value: 'excellent', emoji: '🤩', label: 'Excelente' },
]

const moodMap: Record<string, { emoji: string; label: string }> = Object.fromEntries(
  moodOptions.map((o) => [o.value, { emoji: o.emoji, label: o.label }])
)

// ── Color helpers ────────────────────────────────────────────────
function stressColorVal(val: number): string {
  if (val <= 3) return '#22c55e'
  if (val <= 6) return '#eab308'
  return '#ef4444'
}

function energyColorVal(val: number): string {
  if (val <= 3) return '#ef4444'
  if (val <= 6) return '#eab308'
  return '#22c55e'
}

function stressLabel(val: number): string {
  if (val <= 2) return 'Muy tranquilo 😌'
  if (val <= 4) return 'Bajo 🙂'
  if (val <= 6) return 'Moderado 😐'
  if (val <= 8) return 'Alto 😟'
  return 'Muy alto 😰'
}

function energyLabel(val: number): string {
  if (val <= 2) return 'Sin energia 😴'
  if (val <= 4) return 'Cansado 😕'
  if (val <= 6) return 'Normal 😐'
  if (val <= 8) return 'Activo 🙂'
  return 'Con mucha energia ⚡'
}

// ── Validation ───────────────────────────────────────────────────
const canAdvance = computed(() => {
  if (currentStep.value === 1) return form.sleepHours != null && form.sleepQuality != null
  if (currentStep.value === 4) return form.muscleSoreness != null
  if (currentStep.value === 5) return form.mood != null
  return true // sliders (2,3) always have value; notes (6) optional
})

// ── Navigation ───────────────────────────────────────────────────
function prevStep() {
  if (currentStep.value <= 1) {
    router.push('/client')
    return
  }
  direction.value = 'back'
  currentStep.value--
}

function triggerShake() {
  shakeCta.value = true
  setTimeout(() => { shakeCta.value = false }, 500)
}

async function nextOrSubmit() {
  if (!canAdvance.value) {
    triggerShake()
    return
  }
  if (currentStep.value < 6) {
    direction.value = 'forward'
    currentStep.value++
    return
  }
  await submitCheckin()
}

function skipNotes() {
  form.notes = ''
  submitCheckin()
}

async function submitCheckin() {
  saving.value = true
  try {
    await checkinStore.upsertCheckin({
      week_start: getWeekStartISO(),
      sleep_hours: form.sleepHours,
      sleep_quality: form.sleepQuality,
      stress_level: form.stressLevel,
      energy_level: form.energyLevel,
      muscle_soreness: form.muscleSoreness,
      mood: form.mood,
      notes: form.notes || null,
    })
    showSuccess.value = true
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#16a34a', '#4ade80'],
      })
    }, 300)
  } finally {
    saving.value = false
  }
}

function goHome() {
  router.push('/client')
}

// ── Pre-fill if existing checkin ─────────────────────────────────
onMounted(async () => {
  const clientId = authStore.user?.client_id
  if (clientId) {
    await checkinStore.loadCurrentCheckin(clientId)
    const existing = checkinStore.currentCheckin
    if (existing) {
      if (existing.sleepHours != null)   form.sleepHours = existing.sleepHours
      if (existing.sleepQuality != null) form.sleepQuality = existing.sleepQuality
      if (existing.stressLevel != null)  form.stressLevel = existing.stressLevel
      if (existing.energyLevel != null)  form.energyLevel = existing.energyLevel
      if (existing.muscleSoreness != null) form.muscleSoreness = existing.muscleSoreness
      if (existing.mood)                 form.mood = existing.mood
      if (existing.notes)                form.notes = existing.notes
    }
  }
})
</script>

<style scoped>
/* ── Question titles ─────────────────────────────── */
.step-question {
  font-size: 22px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.25;
}
.step-subquestion {
  font-size: 16px;
  font-weight: 700;
  color: var(--foreground);
  margin-top: 32px;
}

/* ── Sleep hours chips ───────────────────────────── */
.chip {
  padding: 10px 18px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--card);
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground);
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, background 0.15s;
}
.chip:hover { background: var(--muted); }
.chip-active {
  border-color: var(--primary);
  background: color-mix(in oklch, var(--primary) 12%, transparent);
  color: var(--primary);
  transform: scale(1.05);
}

/* ── Sleep quality buttons ───────────────────────── */
.quality-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 56px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--card);
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, background 0.15s;
}
.quality-btn:hover { background: var(--muted); }
.quality-active {
  border-color: var(--primary);
  background: color-mix(in oklch, var(--primary) 10%, transparent);
}

/* ── Slider ──────────────────────────────────────── */
.slider-label-big {
  font-size: 28px;
  font-weight: 900;
  text-align: center;
  transition: color 0.3s;
  min-height: 40px;
}

.slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--muted);
  outline: none;
  cursor: pointer;
}
.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--thumb-color, var(--primary));
  border: 3px solid var(--background);
  box-shadow: 0 2px 8px color-mix(in oklch, var(--foreground) 20%, transparent);
  transition: background 0.3s, transform 0.1s;
  cursor: pointer;
}
.slider-input::-webkit-slider-thumb:active { transform: scale(1.15); }
.slider-input::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--thumb-color, var(--primary));
  border: 3px solid var(--background);
  cursor: pointer;
}

/* ── Soreness buttons ────────────────────────────── */
.soreness-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--card);
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, background 0.15s;
}
.soreness-btn:hover { background: var(--muted); }
.soreness-active {
  border-left: 4px solid var(--primary);
  background: color-mix(in oklch, var(--primary) 8%, transparent);
  transform: scale(1.02);
}

/* ── Mood buttons ────────────────────────────────── */
.mood-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: transform 0.2s, background 0.15s;
  flex: 1;
}
.mood-active {
  background: color-mix(in oklch, var(--primary) 8%, transparent);
  border-color: color-mix(in oklch, var(--primary) 40%, transparent);
}

/* ── Notes textarea ──────────────────────────────── */
.notes-textarea {
  width: 100%;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  padding: 14px 16px;
  padding-bottom: 28px;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}
.notes-textarea:focus { border-color: var(--primary); }
.notes-textarea::placeholder { color: var(--muted-foreground); }

/* ── Back button ─────────────────────────────────── */
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  color: var(--foreground);
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.back-btn:hover { background: color-mix(in oklch, var(--muted) 70%, var(--foreground)); }

/* ── Primary button ──────────────────────────────── */
.btn-primary {
  padding: 14px 20px;
  border-radius: 12px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 15px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  text-align: center;
}
.btn-primary:hover:not(:disabled) { opacity: 0.88; }
.btn-primary:active:not(:disabled) { transform: scale(0.98); }
.btn-primary:disabled { cursor: not-allowed; }

/* ── Summary pills ───────────────────────────────── */
.summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: color-mix(in oklch, var(--muted) 50%, transparent);
  font-size: 12px;
  color: var(--muted-foreground);
}

/* ── Success check animation ─────────────────────── */
.success-check-wrap {
  animation: spring-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes spring-in {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.check-path {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: draw-check 0.4s ease-out 0.3s forwards;
}
@keyframes draw-check {
  to { stroke-dashoffset: 0; }
}

/* ── CTA shake ───────────────────────────────────── */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
.shake-anim { animation: shake 0.4s ease; }

/* ── Loading dots ────────────────────────────────── */
.loading-dots::after {
  content: '';
  animation: dots 1s steps(3) infinite;
}
@keyframes dots {
  0%   { content: ''; }
  33%  { content: '.'; }
  66%  { content: '..'; }
  100% { content: '...'; }
}

.safe-bottom {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
</style>
