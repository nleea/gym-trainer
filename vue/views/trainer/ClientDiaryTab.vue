<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useEvidencesStore } from '../../stores/evidences.store'
import EvidenceThreadCard from '../../components/EvidenceThreadCard.vue'
import TrainerFeedbackModal from '../../components/TrainerFeedbackModal.vue'
import type { ExerciseEvidence } from '../../types'
import { useAppToast } from '@/composables/useAppToast'

const props = defineProps<{
  clientId: string
}>()

const store = useEvidencesStore()
const toast = useAppToast()

const filter = ref<'all' | 'week' | 'month'>('all')
const selected = ref<ExerciseEvidence | null>(null)
const openFeedback = ref(false)

async function load() {
  if (!props.clientId) return
  await store.loadClientEvidences(props.clientId, 100, 0)
  await store.loadPendingCount(props.clientId)
}

onMounted(load)
watch(() => props.clientId, load)

const rows = computed(() => {
  const all = [...store.getClientEvidences(props.clientId)]
  const now = Date.now()
  const days = filter.value === 'week' ? 7 : filter.value === 'month' ? 30 : 10000
  return all
    .filter((e) => (now - e.submittedAt.getTime()) / 86400000 <= days)
    .sort((a, b) => {
      if (!a.respondedAt && b.respondedAt) return -1
      if (a.respondedAt && !b.respondedAt) return 1
      return b.submittedAt.getTime() - a.submittedAt.getTime()
    })
})

async function submitFeedback(payload: { feedback: string; rating: 'correct' | 'improve'; photos: File[] }) {
  if (!selected.value) return
  try {
    await store.submitFeedback(selected.value.id, {
      trainerFeedback: payload.feedback,
      trainerRating: payload.rating,
      photos: payload.photos,
    })
    toast.success('Respuesta enviada')
    openFeedback.value = false
    selected.value = null
    await store.loadPendingCount(props.clientId)
  } catch (e: any) {
    toast.error(e?.message || 'No se pudo enviar feedback')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <button class="rounded-lg border px-3 py-1.5 text-sm" :class="filter === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'" @click="filter = 'all'">Todos</button>
      <button class="rounded-lg border px-3 py-1.5 text-sm" :class="filter === 'week' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'" @click="filter = 'week'">Esta semana</button>
      <button class="rounded-lg border px-3 py-1.5 text-sm" :class="filter === 'month' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'" @click="filter = 'month'">Este mes</button>
    </div>

    <div v-if="rows.length === 0" class="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      No hay evidencias para este período.
    </div>

    <div class="space-y-3">
      <EvidenceThreadCard
        v-for="ev in rows"
        :key="ev.id"
        :evidence="ev"
        :show-respond="!ev.respondedAt"
        @respond="(item) => { selected = item; openFeedback = true }"
      />
    </div>

    <TrainerFeedbackModal
      :open="openFeedback"
      :evidence="selected"
      @close="openFeedback = false"
      @submit="submitFeedback"
    />
  </div>
</template>
