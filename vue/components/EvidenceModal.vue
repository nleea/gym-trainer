<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useEvidencesStore } from '../stores/evidences.store'
import EvidenceThreadCard from './EvidenceThreadCard.vue'
import { useAppToast } from '@/composables/useAppToast'

const props = defineProps<{
  open: boolean
  trainingLogId: string
  exerciseId: string
  exerciseName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted'): void
}>()

const store = useEvidencesStore()
const toast = useAppToast()

const note = ref('')
const files = ref<File[]>([])
const previews = ref<Array<{ file: File; url: string }>>([])
const sending = ref(false)

const existingEvidence = computed(() =>
  store.getEvidenceByLogExercise(props.trainingLogId, props.exerciseId),
)

watch(
  () => props.open,
  async (v) => {
    if (!v || !props.trainingLogId) return
    note.value = ''
    clearFiles()
    await store.loadEvidencesByLog(props.trainingLogId, true)
    const ev = store.getEvidenceByLogExercise(props.trainingLogId, props.exerciseId)
    if (ev?.respondedAt && !ev.clientViewedAt) {
      await store.markAsViewed(ev.id)
    }
  },
)

function clearFiles() {
  for (const p of previews.value) URL.revokeObjectURL(p.url)
  previews.value = []
  files.value = []
}

function appendFiles(inputFiles: File[]) {
  const allowed = [...files.value, ...inputFiles].slice(0, 5)
  clearFiles()
  files.value = allowed
  previews.value = allowed.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
}

function onPickCamera(ev: Event) {
  const input = ev.target as HTMLInputElement
  const arr = Array.from(input.files ?? [])
  appendFiles(arr)
  input.value = ''
}

function onPickGallery(ev: Event) {
  const input = ev.target as HTMLInputElement
  const arr = Array.from(input.files ?? [])
  appendFiles(arr)
  input.value = ''
}

function removeAt(i: number) {
  const next = files.value.filter((_, idx) => idx !== i)
  appendFiles(next)
}

const canSubmit = computed(() => {
  return !sending.value && (files.value.length > 0 || note.value.trim().length > 0)
})

async function submit() {
  try {
    sending.value = true
    await store.submitEvidence({
      trainingLogId: props.trainingLogId,
      exerciseId: props.exerciseId,
      exerciseName: props.exerciseName,
      clientNote: note.value,
      photos: files.value,
    })
    toast.success('Evidencia enviada')
    emit('submitted')
    emit('close')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'No se pudo enviar la evidencia')
  } finally {
    sending.value = false
  }
}

onBeforeUnmount(() => {
  clearFiles()
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center" @click.self="emit('close')">
    <div class="w-full sm:max-w-2xl bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[95vh] overflow-auto space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-foreground">📸 Evidencia — {{ exerciseName }}</h3>
        <button class="rounded p-2 hover:bg-muted" @click="emit('close')">✕</button>
      </div>

      <EvidenceThreadCard v-if="existingEvidence" :evidence="existingEvidence" />
      <template v-else>
        <div class="rounded-xl border border-border p-3 space-y-3">
          <div class="flex gap-2">
            <label class="flex-1 rounded-lg border px-3 py-2 text-sm text-center cursor-pointer hover:bg-muted">
              📷 Tomar foto
              <input type="file" class="hidden" accept="image/*" capture="environment" @change="onPickCamera" />
            </label>
            <label class="flex-1 rounded-lg border px-3 py-2 text-sm text-center cursor-pointer hover:bg-muted">
              🖼️ Galería
              <input type="file" class="hidden" accept="image/*" multiple @change="onPickGallery" />
            </label>
          </div>
          <div v-if="previews.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div v-for="(p, i) in previews" :key="`${p.file.name}-${i}`" class="relative rounded-lg border p-1 space-y-1">
              <img :src="p.url" class="aspect-square w-full object-cover rounded-md" />
              <p class="truncate text-[11px] text-muted-foreground px-1">{{ p.file.name }}</p>
              <button type="button" class="absolute right-1 top-1 bg-black/60 text-white rounded-full px-1.5 text-xs" @click="removeAt(i)">✕</button>
            </div>
          </div>
          <p class="text-xs text-muted-foreground">Máximo 5 fotos · seleccionadas: {{ files.length }}</p>
        </div>

        <div>
          <p class="text-sm font-medium mb-1">Nota para tu trainer (opcional)</p>
          <textarea
            v-model="note"
            rows="4"
            class="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="¿Cómo te sentiste? ¿Algo que quieras que revise...?"
          />
        </div>

        <div v-if="sending" class="h-1.5 rounded-full bg-muted overflow-hidden">
          <div class="h-full w-1/2 bg-primary animate-pulse" />
        </div>

        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border px-4 py-2" @click="emit('close')">Cancelar</button>
          <button type="button" class="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 disabled:opacity-60" :disabled="!canSubmit" @click="submit">
            Enviar evidencia →
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
