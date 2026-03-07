<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-foreground">{{ typeLabel }}</h2>
      <button
        v-if="canUpload"
        type="button"
        class="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        @click="showUpload = true"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Subir foto
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-6">
      <div v-for="i in 2" :key="i" class="space-y-3">
        <div class="h-4 w-32 rounded bg-muted animate-pulse" />
        <div class="flex gap-3">
          <div v-for="j in 3" :key="j" class="h-28 w-28 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && monthGroups.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-12 text-center"
    >
      <svg class="h-12 w-12 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <div>
        <p class="text-sm font-medium text-foreground">Aún no hay fotos</p>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ canUpload ? 'Sube tu primera foto con el botón de arriba' : 'Todavía no se han subido fotos de este tipo' }}
        </p>
      </div>
    </div>

    <!-- Timeline -->
    <div v-else class="space-y-8">
      <div v-for="group in monthGroups" :key="group.month" class="relative pl-5">
        <!-- Vertical line -->
        <div class="absolute left-0 top-3 bottom-0 w-px bg-border" />
        <!-- Dot -->
        <div class="absolute left-[-4px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />

        <!-- Month label -->
        <p class="mb-3 text-sm font-semibold text-foreground capitalize">{{ group.month }}</p>

        <!-- Photos grid -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="photo in group.photos"
            :key="photo.id"
            type="button"
            class="group relative h-28 w-28 overflow-hidden rounded-xl border shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/50"
            @click="openLightbox(photo)"
          >
            <img
              :src="photo.url"
              :alt="photo.notes || typeLabel"
              class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
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
          v-if="lightboxPhoto"
          class="fixed inset-0 z-50 flex flex-col bg-black/95"
          @click.self="closeLightbox"
        >
          <!-- Top bar -->
          <div class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="text-sm font-medium text-white">{{ formatDate(lightboxPhoto.takenAt) }}</p>
              <p v-if="lightboxPhoto.notes" class="text-xs text-white/60 mt-0.5">{{ lightboxPhoto.notes }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="canUpload"
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-red-500/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                :disabled="deleting"
                @click="confirmDelete"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {{ deleting ? 'Eliminando…' : 'Eliminar' }}
              </button>
              <button
                type="button"
                class="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                @click="closeLightbox"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Image -->
          <div class="flex flex-1 items-center justify-center p-4" @click="closeLightbox">
            <img
              :src="lightboxPhoto.url"
              class="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              :alt="lightboxPhoto.notes || typeLabel"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Upload modal -->
    <PhotoUploadModal
      v-model="showUpload"
      :client-id="clientId"
      :type="type"
      @uploaded="onUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePhotoStore } from '../../stores/photo.store'
import type { Photo, PhotoType } from '../../types/photo.types'
import PhotoUploadModal from './PhotoUploadModal.vue'

const props = defineProps<{
  clientId:   string
  type:       PhotoType
  canUpload?: boolean
}>()

const photoStore = usePhotoStore()
const showUpload  = ref(false)
const lightboxPhoto = ref<Photo | null>(null)
const deleting    = ref(false)

const loading = computed(() => photoStore.isLoading(props.clientId, props.type))

const timeline = computed(() => photoStore.getTimeline(props.clientId, props.type))

const TYPE_LABELS: Record<PhotoType, string> = {
  progress:  'Progreso corporal',
  profile:   'Foto de perfil',
  nutrition: 'Nutrición',
  training:  'Entrenamiento',
}
const typeLabel = computed(() => TYPE_LABELS[props.type])

// Re-group by month from backend date groups
const monthGroups = computed(() => {
  const tl = timeline.value
  if (!tl) return []

  // Flatten all photos with their date, then group by YYYY-MM
  const flat: Array<{ month: string; monthDate: Date; photo: Photo }> = []
  for (const g of tl.groups) {
    const d = new Date(g.date + 'T00:00:00')
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    for (const p of g.photos) {
      flat.push({ month: monthKey, monthDate: d, photo: p })
    }
  }

  // Build map month → photos (order preserved = desc by date)
  const map = new Map<string, { month: string; label: string; photos: Photo[] }>()
  for (const { month, monthDate, photo } of flat) {
    if (!map.has(month)) {
      map.set(month, {
        month,
        label: monthDate.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
        photos: [],
      })
    }
    map.get(month)!.photos.push(photo)
  }

  return Array.from(map.values()).map(g => ({ month: g.label, photos: g.photos }))
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

function openLightbox(photo: Photo) {
  lightboxPhoto.value = photo
}

function closeLightbox() {
  lightboxPhoto.value = null
}

async function confirmDelete() {
  if (!lightboxPhoto.value) return
  if (!confirm('¿Eliminar esta foto?')) return
  deleting.value = true
  try {
    await photoStore.deletePhoto(props.clientId, props.type, lightboxPhoto.value.id)
    closeLightbox()
  } finally {
    deleting.value = false
  }
}

async function onUploaded() {
  await photoStore.fetchTimeline(props.clientId, props.type)
}

async function load() {
  if (!props.clientId) return
  if (!photoStore.getTimeline(props.clientId, props.type)) {
    await photoStore.fetchTimeline(props.clientId, props.type)
  }
}

onMounted(load)
watch(() => [props.clientId, props.type] as const, load)
</script>
