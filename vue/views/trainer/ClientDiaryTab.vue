<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useEvidencesStore } from '../../stores/evidences.store'
import EvidenceThreadCard from '../../components/EvidenceThreadCard.vue'
import TrainerFeedbackModal from '../../components/TrainerFeedbackModal.vue'
import type { ExerciseEvidence } from '../../types'
import { useAppToast } from '@/composables/useAppToast'
import {
  addWeeks,
  endOfWeek,
  format,
  isSameWeek,
  startOfWeek,
  subWeeks,
} from 'date-fns'

const props = defineProps<{
  clientId: string
}>()

const store = useEvidencesStore()
const toast = useAppToast()

const statusFilter = ref<'all' | 'pending' | 'responded'>('all')
const evidenceTypeFilter = ref<'all' | string>('all')
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }))
const selected = ref<ExerciseEvidence | null>(null)
const openFeedback = ref(false)

const weekStart = computed(() => format(currentWeekStart.value, 'yyyy-MM-dd'))
const weekEnd = computed(() => format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
const weekKey = computed(() => `${props.clientId}:all:${weekStart.value}:${weekEnd.value}`)
const isCurrentWeek = computed(() => isSameWeek(currentWeekStart.value, new Date(), { weekStartsOn: 1 }))

const weekLabel = computed(() => {
  const start = currentWeekStart.value
  const end = endOfWeek(currentWeekStart.value, { weekStartsOn: 1 })
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()
  if (sameMonth && sameYear) return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`
  if (sameYear) return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`
  return `${format(start, 'MMMM d, yyyy')} - ${format(end, 'MMMM d, yyyy')}`
})

async function load() {
  if (!props.clientId) return
  await store.loadClientEvidencesByWeek({
    clientId: props.clientId,
    weekStart: weekStart.value,
    weekEnd: weekEnd.value,
    limit: 200,
    offset: 0,
  })
  await store.loadPendingCount(props.clientId)
}

onMounted(load)
watch(() => props.clientId, load)
watch([weekStart, weekEnd], load)

function prevWeek() {
  currentWeekStart.value = subWeeks(currentWeekStart.value, 1)
}

function nextWeek() {
  if (isCurrentWeek.value) return
  currentWeekStart.value = addWeeks(currentWeekStart.value, 1)
}

const dayRows = computed(() => {
  const week = store.getClientEvidencesByWeek(weekKey.value)
  if (!week) return []
  return week.days
    .map((day) => {
      const evidences = day.evidences.filter((ev) => {
        if (evidenceTypeFilter.value !== 'all' && ev.type !== evidenceTypeFilter.value) return false
        if (statusFilter.value === 'pending') return !ev.respondedAt
        if (statusFilter.value === 'responded') return !!ev.respondedAt
        return true
      })
      return { ...day, evidences }
    })
    .filter((day) => day.evidences.length > 0)
})

const availableEvidenceTypes = computed(() => {
  const week = store.getClientEvidencesByWeek(weekKey.value)
  if (!week) return []
  return Array.from(
    new Set(
      week.days.flatMap((d) => d.evidences.map((e) => e.type).filter(Boolean)) as string[],
    ),
  )
})

async function submitFeedback(payload: { feedback: string; rating: 'correct' | 'improve'; photos: File[] }) {
  if (!selected.value) return
  try {
    await store.submitFeedback(selected.value.id, {
      evidenceType: selected.value.type,
      trainerFeedback: payload.feedback,
      trainerRating: payload.rating,
      photos: payload.photos,
    })
    toast.success('Respuesta enviada')
    openFeedback.value = false
    selected.value = null
    await store.loadPendingCount(props.clientId)
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'No se pudo enviar feedback')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted" @click="prevWeek">←</button>
        <p class="min-w-[210px] text-center text-sm font-medium">{{ weekLabel }}</p>
        <button
          type="button"
          class="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isCurrentWeek"
          @click="nextWeek"
        >
          →
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button class="rounded-lg border px-3 py-1.5 text-sm" :class="statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'" @click="statusFilter = 'all'">All</button>
        <button class="rounded-lg border px-3 py-1.5 text-sm" :class="statusFilter === 'pending' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'" @click="statusFilter = 'pending'">Pending</button>
        <button class="rounded-lg border px-3 py-1.5 text-sm" :class="statusFilter === 'responded' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'" @click="statusFilter = 'responded'">Responded</button>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="rounded-lg border px-3 py-1.5 text-sm"
          :class="evidenceTypeFilter === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'"
          @click="evidenceTypeFilter = 'all'"
        >
          Todas
        </button>
        <button
          v-for="tp in availableEvidenceTypes"
          :key="tp"
          class="rounded-lg border px-3 py-1.5 text-sm capitalize"
          :class="evidenceTypeFilter === tp ? 'bg-primary/10 text-primary' : 'hover:bg-muted'"
          @click="evidenceTypeFilter = tp"
        >
          {{ tp === 'nutrition' ? 'Comida' : tp }}
        </button>
      </div>
    </div>

    <div v-if="dayRows.length === 0" class="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      No hay evidencias para este período.
    </div>

    <div v-else class="space-y-6">
      <section v-for="day in dayRows" :key="day.date" class="space-y-3">
        <h3 class="text-sm font-semibold text-foreground">
          {{ day.label }} ({{ day.evidences.length }})
        </h3>
        <div class="space-y-3">
          <div
            v-for="ev in day.evidences"
            :key="ev.id"
            class="border-l-4 pl-3"
            :class="!ev.respondedAt ? 'border-l-amber-400' : 'border-l-transparent'"
          >
            <EvidenceThreadCard
              :evidence="ev"
              :show-respond="!ev.respondedAt"
              @respond="(item) => { selected = item; openFeedback = true }"
            />
          </div>
        </div>
      </section>
    </div>

    <TrainerFeedbackModal
      :open="openFeedback"
      :evidence="selected"
      @close="openFeedback = false"
      @submit="submitFeedback"
    />
  </div>
</template>
