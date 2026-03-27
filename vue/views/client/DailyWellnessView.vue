<!-- vue/views/client/DailyWellnessView.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWellnessStore } from '../../stores/wellness.store'

const { t } = useI18n()
const router = useRouter()
const wellnessStore = useWellnessStore()

const energy = ref(3)
const sleepQuality = ref(3)
const muscleFatigue = ref(3)
const notes = ref('')
const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)

const sliders = computed(() => [
  {
    key: 'energy' as const,
    label: t('wellness.energy'),
    desc: t('wellness.energyDesc'),
    value: energy,
    emoji: ['😴', '😐', '🙂', '😊', '⚡'],
    low: t('wellness.low'),
    high: t('wellness.high'),
  },
  {
    key: 'sleepQuality' as const,
    label: t('wellness.sleep'),
    desc: t('wellness.sleepDesc'),
    value: sleepQuality,
    emoji: ['😵', '😪', '😐', '😌', '😴💤'],
    low: t('wellness.poor'),
    high: t('wellness.excellent'),
  },
  {
    key: 'muscleFatigue' as const,
    label: t('wellness.fatigue'),
    desc: t('wellness.fatigueDesc'),
    value: muscleFatigue,
    emoji: ['💪', '🙂', '😐', '😣', '🔥'],
    low: t('wellness.fresh'),
    high: t('wellness.veryFatigued'),
  },
])

async function submit() {
  if (saving.value) return
  saving.value = true
  error.value = null
  try {
    await wellnessStore.createEntry({
      energy: energy.value,
      sleepQuality: sleepQuality.value,
      muscleFatigue: muscleFatigue.value,
      notes: notes.value.trim() || null,
    })
    saved.value = true
    setTimeout(() => router.push('/client'), 1500)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[70vh] flex-col items-center justify-center px-4 py-8">
    <!-- Success -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="scale-90 opacity-0"
      enter-to-class="scale-100 opacity-100"
    >
      <div v-if="saved" class="flex flex-col items-center gap-3 text-center">
        <span class="text-6xl">✅</span>
        <h2 class="text-xl font-bold text-foreground">{{ t('wellness.savedTitle') }}</h2>
        <p class="text-sm text-muted-foreground">{{ t('wellness.savedDesc') }}</p>
      </div>
    </Transition>

    <!-- Form -->
    <div v-if="!saved" class="w-full max-w-md space-y-6">
      <!-- Header -->
      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-primary">{{ t('wellness.label') }}</p>
        <h1 class="mt-1 text-2xl font-black text-foreground">{{ t('wellness.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('wellness.subtitle') }}</p>
      </div>

      <!-- Sliders -->
      <div class="space-y-5">
        <div
          v-for="s in sliders"
          :key="s.key"
          class="rounded-2xl border bg-card p-4"
        >
          <div class="flex items-center justify-between mb-1">
            <p class="text-sm font-semibold text-foreground">{{ s.label }}</p>
            <span class="text-2xl">{{ s.emoji[s.value.value - 1] }}</span>
          </div>
          <p class="text-xs text-muted-foreground mb-3">{{ s.desc }}</p>

          <!-- Custom slider -->
          <div class="flex items-center gap-3">
            <span class="text-[10px] text-muted-foreground shrink-0 w-12 text-right">{{ s.low }}</span>
            <div class="flex-1 flex gap-1.5">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="flex-1 h-10 rounded-lg font-bold text-sm transition-all active:scale-95"
                :class="s.value.value === n
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'"
                @click="s.value.value = n"
              >
                {{ n }}
              </button>
            </div>
            <span class="text-[10px] text-muted-foreground shrink-0 w-12">{{ s.high }}</span>
          </div>
        </div>
      </div>

      <!-- Notes (optional) -->
      <div class="rounded-2xl border bg-card p-4">
        <p class="text-sm font-semibold text-foreground mb-2">{{ t('wellness.notes') }}</p>
        <textarea
          v-model="notes"
          :placeholder="t('wellness.notesPlaceholder')"
          rows="2"
          class="w-full rounded-lg border bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      <!-- Error -->
      <p v-if="error" class="text-sm text-destructive text-center">{{ error }}</p>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-xl border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          @click="router.push('/client')"
        >
          {{ t('wellness.skip') }}
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
          :disabled="saving"
          @click="submit"
        >
          {{ saving ? t('wellness.saving') : t('wellness.submit') }}
        </button>
      </div>
    </div>
  </div>
</template>
