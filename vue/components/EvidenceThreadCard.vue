<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExerciseEvidence } from '../types'

const props = defineProps<{
  evidence: ExerciseEvidence
  showRespond?: boolean
}>()

const emit = defineEmits<{
  (e: 'respond', evidence: ExerciseEvidence): void
}>()

const lightboxUrl = ref<string | null>(null)

const status = computed(() => {
  if (!props.evidence.respondedAt) return { label: '⏳ Pendiente', cls: 'bg-muted text-muted-foreground' }
  if (props.evidence.trainerRating === 'correct') return { label: '✅ Correcto', cls: 'bg-emerald-500/15 text-emerald-600' }
  if (props.evidence.trainerRating === 'improve') return { label: '⚠️ A mejorar', cls: 'bg-amber-500/15 text-amber-700' }
  return { label: 'Respondido', cls: 'bg-primary/15 text-primary' }
})

function relDate(d?: Date | null) {
  if (!d) return ''
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff <= 0) return 'hoy'
  if (diff === 1) return 'hace 1 día'
  return `hace ${diff} días`
}
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-4 space-y-4" :class="!evidence.respondedAt ? 'border-amber-400/40' : ''">
    <div class="flex items-center justify-between gap-2">
      <h3 class="font-semibold text-foreground truncate">
        {{ evidence.exerciseName }}
      </h3>
      <span class="rounded-full px-2 py-1 text-xs font-medium" :class="status.cls">{{ status.label }}</span>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="font-medium text-foreground">👤 Cliente</span>
        <span class="text-muted-foreground">{{ relDate(evidence.submittedAt) }}</span>
      </div>
      <div v-if="evidence.photoUrls?.length" class="grid grid-cols-3 gap-2">
        <button
          v-for="(u, idx) in evidence.photoUrls"
          :key="`${evidence.id}-c-${idx}`"
          type="button"
          class="aspect-square overflow-hidden rounded-lg border"
          @click="lightboxUrl = u"
        >
          <img :src="u" class="h-full w-full object-cover" />
        </button>
      </div>
      <p v-if="evidence.clientNote" class="text-sm text-foreground/90">"{{ evidence.clientNote }}"</p>
    </div>

    <div class="border-t border-border pt-3 space-y-2">
      <template v-if="evidence.respondedAt">
        <div class="flex items-center justify-between text-xs">
          <span class="font-medium text-foreground">🏋️ Trainer</span>
          <span class="text-muted-foreground">{{ relDate(evidence.respondedAt) }}</span>
        </div>
        <p v-if="evidence.trainerFeedback" class="text-sm text-foreground/90">{{ evidence.trainerFeedback }}</p>
        <div v-if="evidence.trainerPhotoUrls?.length" class="grid grid-cols-3 gap-2">
          <button
            v-for="(u, idx) in evidence.trainerPhotoUrls"
            :key="`${evidence.id}-t-${idx}`"
            type="button"
            class="aspect-square overflow-hidden rounded-lg border"
            @click="lightboxUrl = u"
          >
            <img :src="u" class="h-full w-full object-cover" />
          </button>
        </div>
      </template>
      <template v-else>
        <p class="text-sm text-muted-foreground">Tu trainer aún no ha respondido</p>
        <button
          v-if="showRespond"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          @click="emit('respond', evidence)"
        >
          Responder
        </button>
      </template>
    </div>
  </div>

  <div
    v-if="lightboxUrl"
    class="fixed inset-0 z-[80] bg-black/80 p-4 flex items-center justify-center"
    @click="lightboxUrl = null"
  >
    <img :src="lightboxUrl" class="max-h-full max-w-full rounded-lg" />
  </div>
</template>
