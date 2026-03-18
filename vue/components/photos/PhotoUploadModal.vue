<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-4 opacity-0 sm:scale-95"
          enter-to-class="translate-y-0 opacity-100 sm:scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100 sm:scale-100"
          leave-to-class="translate-y-4 opacity-0 sm:scale-95"
        >
          <div
            v-if="modelValue"
            class="relative z-10 w-full rounded-t-2xl bg-card sm:max-w-md sm:rounded-2xl shadow-xl border"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b px-5 py-4">
              <h2 class="text-base font-semibold text-foreground">{{ title }}</h2>
              <button
                type="button"
                class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                @click="close"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form class="space-y-4 p-5" @submit.prevent="submit">
              <!-- File picker / preview -->
              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Foto</label>

                <div
                  v-if="!previewUrl"
                  class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  @click="fileInput?.click()"
                  @dragover.prevent
                  @drop.prevent="onDrop"
                >
                  <svg class="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p class="text-sm text-muted-foreground text-center">
                    <span class="text-primary font-medium">Seleccionar foto</span> o arrastrar aquí
                  </p>
                  <p class="text-xs text-muted-foreground">JPG, PNG, WebP · Máx 10 MB</p>
                </div>

                <div v-else class="relative">
                  <img
                    :src="previewUrl"
                    class="w-full max-h-56 rounded-xl object-cover border"
                    alt="preview"
                  />
                  <button
                    type="button"
                    class="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                    @click="clearFile"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="onFileChange"
                />
                <p v-if="fileError" class="mt-1.5 text-xs text-red-500">{{ fileError }}</p>
              </div>

              <!-- Date -->
              <div>
                <label for="taken-at" class="block text-sm font-medium text-foreground mb-1.5">
                  Fecha de la foto
                </label>
                <input
                  id="taken-at"
                  v-model="takenAt"
                  type="date"
                  required
                  class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <!-- Notes -->
              <div>
                <label for="notes" class="block text-sm font-medium text-foreground mb-1.5">
                  Notas <span class="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  id="notes"
                  v-model="notes"
                  rows="2"
                  placeholder="Ej: Día 30 de dieta, mañana en ayunas…"
                  class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <!-- Error -->
              <p v-if="uploadError" class="text-xs text-red-500">{{ uploadError }}</p>

              <!-- Actions -->
              <div class="flex gap-3 pt-1">
                <button
                  type="button"
                  class="flex-1 rounded-xl border py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  @click="close"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="!selectedFile || uploading"
                  class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <svg v-if="uploading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {{ uploading ? 'Subiendo…' : 'Subir foto' }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePhotoStore } from '../../stores/photo.store'
import type { Photo, PhotoType } from '../../types/photo.types'
import { toYmdLocal } from '../../../lib/utils'

const props = defineProps<{
  modelValue: boolean
  clientId:   string
  type:       PhotoType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  uploaded:           [photo: Photo]
}>()

const photoStore  = usePhotoStore()
const fileInput   = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl  = ref<string | null>(null)
const fileError   = ref<string | null>(null)
const uploadError = ref<string | null>(null)
const uploading   = ref(false)
const notes       = ref('')
const takenAt     = ref(toYmdLocal(new Date()))

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

const title = computed(() => {
  const labels: Record<PhotoType, string> = {
    progress:  'Subir foto de progreso',
    profile:   'Subir foto de perfil',
    nutrition: 'Subir foto de nutrición',
    training:  'Subir foto de entrenamiento',
  }
  return labels[props.type]
})

function validateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Solo se permiten JPG, PNG o WebP'
  if (file.size > MAX_BYTES)        return 'El archivo es demasiado grande (máx 10 MB)'
  return null
}

function setFile(file: File) {
  const err = validateFile(file)
  if (err) { fileError.value = err; return }
  fileError.value = null
  selectedFile.value = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setFile(file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) setFile(file)
}

function clearFile() {
  selectedFile.value = null
  if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = null }
  if (fileInput.value) fileInput.value.value = ''
}

function close() {
  if (uploading.value) return
  clearFile()
  notes.value = ''
  uploadError.value = null
  emit('update:modelValue', false)
}

async function submit() {
  if (!selectedFile.value) return
  uploading.value  = true
  uploadError.value = null
  try {
    const photo = await photoStore.uploadPhoto(
      props.clientId,
      selectedFile.value,
      props.type,
      takenAt.value,
      notes.value || undefined,
    )
    emit('uploaded', photo)
    close()
  } catch (e: unknown) {
    uploadError.value = e instanceof Error ? e.message : 'Error al subir la foto'
  } finally {
    uploading.value = false
  }
}
</script>
