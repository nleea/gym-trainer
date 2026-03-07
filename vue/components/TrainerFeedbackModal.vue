<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ExerciseEvidence } from '../types'

const props = defineProps<{
  open: boolean
  evidence: ExerciseEvidence | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { feedback: string; rating: 'correct' | 'improve'; photos: File[] }): void
}>()

const feedback = ref('')
const rating = ref<'correct' | 'improve'>('correct')
const files = ref<File[]>([])

watch(
  () => props.open,
  (v) => {
    if (!v) return
    feedback.value = ''
    rating.value = 'correct'
    files.value = []
  },
)

function onPick(ev: Event) {
  const input = ev.target as HTMLInputElement
  const selected = Array.from(input.files ?? [])
  files.value = [...files.value, ...selected].slice(0, 3)
}

function removeFile(i: number) {
  files.value.splice(i, 1)
}

function submit() {
  emit('submit', { feedback: feedback.value.trim(), rating: rating.value, photos: files.value })
}
</script>

<template>
  <div v-if="open && evidence" class="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center" @click.self="emit('close')">
    <div class="w-full sm:max-w-2xl bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[95vh] overflow-auto space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-foreground">Responder evidencia — {{ evidence.exerciseName }}</h3>
        <button class="rounded p-2 hover:bg-muted" @click="emit('close')">✕</button>
      </div>

      <div v-if="evidence.photoUrls?.length" class="grid grid-cols-3 gap-2">
        <img v-for="(u, i) in evidence.photoUrls" :key="i" :src="u" class="aspect-square rounded-lg border object-cover" />
      </div>

      <div>
        <p class="text-xs text-muted-foreground mb-1">Nota del cliente</p>
        <p class="text-sm">{{ evidence.clientNote || 'Sin nota' }}</p>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium">¿Cómo está la ejecución?</p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border px-3 py-2 text-sm" :class="rating === 'correct' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700' : 'hover:bg-muted'" @click="rating = 'correct'">✅ Correcto</button>
          <button type="button" class="flex-1 rounded-lg border px-3 py-2 text-sm" :class="rating === 'improve' ? 'bg-amber-500/15 border-amber-500/50 text-amber-700' : 'hover:bg-muted'" @click="rating = 'improve'">⚠️ A mejorar</button>
        </div>
      </div>

      <div>
        <p class="text-sm font-medium mb-1">Tu feedback</p>
        <textarea v-model="feedback" rows="4" class="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Escribe tu respuesta..." />
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium">Agregar fotos de referencia (opcional)</p>
        <label class="inline-flex items-center rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
          + Subir fotos
          <input type="file" class="hidden" accept="image/*" multiple @change="onPick" />
        </label>
        <div v-if="files.length" class="flex flex-wrap gap-2">
          <div v-for="(f, i) in files" :key="`${f.name}-${i}`" class="rounded border px-2 py-1 text-xs flex items-center gap-2">
            <span class="max-w-[150px] truncate">{{ f.name }}</span>
            <button type="button" @click="removeFile(i)">✕</button>
          </div>
        </div>
      </div>

      <div class="flex gap-2 pt-2">
        <button type="button" class="flex-1 rounded-lg border px-4 py-2" @click="emit('close')">Cancelar</button>
        <button type="button" class="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2" @click="submit">Enviar respuesta →</button>
      </div>
    </div>
  </div>
</template>
