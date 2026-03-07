<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useExercisesStore } from '../../stores/exercises.store'
import type { ExerciseItem } from '../../repo/exercisesRepo'
import ExerciseCard from '../../components/ExerciseCard.vue'

const auth = useAuthStore()
const store = useExercisesStore()
const router = useRouter()
const { exercises, bodyParts, equipment, totalCount } = storeToRefs(store)

const q = ref('')
const selectedBodyPart = ref('')
const selectedEquipment = ref('')
const favoritesOnly = ref(false)
const detail = ref<ExerciseItem | null>(null)

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let debounceId: number | undefined

const isTrainer = computed(() => auth.user?.role === 'trainer')

const activeFilters = computed(() => {
  const chips: Array<{ key: string; label: string }> = []
  if (q.value.trim()) chips.push({ key: 'q', label: `Buscar: ${q.value.trim()}` })
  if (selectedBodyPart.value) chips.push({ key: 'body_part', label: selectedBodyPart.value })
  if (selectedEquipment.value) chips.push({ key: 'equipment', label: selectedEquipment.value })
  if (favoritesOnly.value) chips.push({ key: 'favorites_only', label: 'Favoritos' })
  return chips
})

function currentFilters() {
  return {
    q: q.value.trim() || undefined,
    body_part: selectedBodyPart.value || undefined,
    equipment: selectedEquipment.value || undefined,
    favorites_only: favoritesOnly.value || undefined,
    user_id: auth.user?.id,
  }
}

async function loadInitial() {
  await Promise.all([store.loadFilters(), store.loadFavorites(auth.user?.id)])
  await store.loadExercises(currentFilters(), true)
}

function removeFilter(key: string) {
  if (key === 'q') q.value = ''
  if (key === 'body_part') selectedBodyPart.value = ''
  if (key === 'equipment') selectedEquipment.value = ''
  if (key === 'favorites_only') favoritesOnly.value = false
}

async function toggleFavorite(exercise: ExerciseItem) {
  await store.toggleFavorite(exercise.id, auth.user?.id)
}

async function syncNow() {
  await store.syncExercises()
  await store.loadExercises(currentFilters(), true)
}

function openDetail(exercise: ExerciseItem) {
  detail.value = exercise
}

function addToPlan(exercise: ExerciseItem) {
  localStorage.setItem('pending_plan_exercise', JSON.stringify(exercise))
  router.push('/trainer/plans/training/new')
}

watch([q, selectedBodyPart, selectedEquipment, favoritesOnly], () => {
  window.clearTimeout(debounceId)
  debounceId = window.setTimeout(() => {
    store.loadExercises(currentFilters(), true)
  }, 300)
})

watch(
  () => sentinel.value,
  async () => {
    await nextTick()
    if (!sentinel.value) return
    if (observer) observer.disconnect()
    observer = new IntersectionObserver(async (entries) => {
      const [entry] = entries
      if (!entry?.isIntersecting) return
      if (store.loading || !store.hasMore) return
      await store.loadExercises(currentFilters(), false)
    })
    observer.observe(sentinel.value)
  },
)

onMounted(loadInitial)
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <section class="page">
    <header class="header">
      <div>
        <h1 class="title">Biblioteca de ejercicios</h1>
        <p class="subtitle">{{ totalCount.toLocaleString('es-CO') }} ejercicios disponibles</p>
      </div>
      <button v-if="isTrainer" class="sync-btn" @click="syncNow">Sincronizar</button>
    </header>

    <div class="search-area">
      <input v-model="q" class="search-input" placeholder="Buscar ejercicio..." />
      <div class="filters">
        <select v-model="selectedBodyPart" class="select">
          <option value="">Todos los músculos</option>
          <option v-for="part in bodyParts" :key="part" :value="part">{{ part }}</option>
        </select>
        <select v-model="selectedEquipment" class="select">
          <option value="">Todo el equipamiento</option>
          <option v-for="item in equipment" :key="item" :value="item">{{ item }}</option>
        </select>
        <button class="fav-toggle" :class="{ active: favoritesOnly }" @click="favoritesOnly = !favoritesOnly">
          ❤️ Favoritos
        </button>
      </div>
      <div v-if="activeFilters.length" class="chips">
        <button v-for="chip in activeFilters" :key="chip.key" class="chip" @click="removeFilter(chip.key)">
          {{ chip.label }} ✕
        </button>
      </div>
    </div>

    <div class="grid">
      <ExerciseCard
        v-for="exercise in exercises"
        :key="exercise.id"
        :exercise="exercise"
        @favorite="toggleFavorite"
        @select="openDetail"
      />
    </div>
    <div ref="sentinel" class="sentinel" />
  </section>

  <Teleport to="body">
    <div v-if="detail" class="modal-root">
      <div class="modal-overlay" @click="detail = null" />
      <article class="modal">
        <img v-if="detail.gifUrl" :src="detail.gifUrl" :alt="detail.name" loading="lazy" class="hero" />
        <div class="modal-content">
          <h2>{{ detail.name }}</h2>
          <p class="meta">{{ detail.bodyPart }} · {{ detail.equipment }} · {{ detail.target }}</p>
          <p v-if="detail.secondaryMuscles.length" class="meta">
            Secundarios: {{ detail.secondaryMuscles.join(', ') }}
          </p>
          <ol class="steps">
            <li v-for="(step, idx) in detail.instructions" :key="`${detail.id}-${idx}`">{{ step }}</li>
          </ol>
          <div class="actions">
            <button v-if="isTrainer" class="primary" @click="addToPlan(detail)">Agregar al plan</button>
            <button class="secondary" @click="toggleFavorite(detail)">
              {{ detail.isFavorite ? 'Quitar favorito' : 'Favorito' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.page { padding: 1rem; max-width: 76rem; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.title { margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--foreground); }
.subtitle { margin: 0.2rem 0 0; color: var(--muted-foreground); font-size: 0.85rem; }
.sync-btn {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 0.8rem;
  min-height: 2.75rem;
  padding: 0 0.9rem;
}
.search-area { margin-top: 1rem; display: grid; gap: 0.8rem; }
.search-input { border: 1px solid var(--input); border-radius: 0.8rem; padding: 0.75rem 0.9rem; background: var(--background); }
.filters { display: grid; gap: 0.6rem; grid-template-columns: 1fr; }
.select { border: 1px solid var(--input); border-radius: 0.7rem; min-height: 2.75rem; background: var(--background); padding: 0 0.7rem; }
.fav-toggle { border: 1px solid var(--border); border-radius: 0.7rem; min-height: 2.75rem; background: var(--card); }
.fav-toggle.active { border-color: var(--primary); color: var(--primary); }
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip { border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem 0.6rem; font-size: 0.75rem; background: var(--muted); }
.grid { margin-top: 1rem; display: grid; grid-template-columns: 1fr; gap: 0.8rem; }
.sentinel { height: 1px; }
.modal-root { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 1rem; }
.modal-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.55); }
.modal { position: relative; width: min(100%, 42rem); max-height: 90vh; overflow: auto; border-radius: 1rem; background: var(--card); border: 1px solid var(--border); }
.hero { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: var(--muted); }
.modal-content { padding: 1rem; }
.meta { margin: 0.4rem 0; color: var(--muted-foreground); font-size: 0.8rem; }
.steps { margin: 0.8rem 0 0; padding-left: 1.1rem; color: var(--foreground); font-size: 0.85rem; }
.actions { margin-top: 1rem; display: flex; gap: 0.6rem; }
.primary, .secondary { min-height: 2.75rem; border-radius: 0.7rem; padding: 0 0.9rem; border: 1px solid var(--border); }
.primary { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }
.secondary { background: var(--card); }
@media (min-width: 48rem) {
  .filters { grid-template-columns: 1fr 1fr auto; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 64rem) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
