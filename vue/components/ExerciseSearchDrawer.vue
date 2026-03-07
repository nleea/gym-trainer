<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useExercisesStore } from '../stores/exercises.store'
import type { ExerciseItem } from '../repo/exercisesRepo'

const props = defineProps<{
  open: boolean
  mode: 'plan' | 'log'
  onSelect: (exercise: ExerciseItem) => void
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const auth = useAuthStore()
const exercises = useExercisesStore()
const { favorites, bodyParts } = storeToRefs(exercises)

const query = ref('')
const selectedBodyPart = ref<string>('')
const activeTab = ref<'search' | 'recent' | 'favorites'>('search')
let debounceId: number | undefined

const actionLabel = computed(() =>
  props.mode === 'plan' ? 'Usar este' : 'Agregar este',
)

const recentKey = computed(() => `recent_exercises_${auth.user?.id ?? 'anon'}`)
const recentItems = ref<ExerciseItem[]>([])

function close() {
  emit('update:open', false)
}

async function fetchResults(reset = true) {
  await exercises.loadExercises(
    {
      q: query.value.trim() || undefined,
      body_part: selectedBodyPart.value || undefined,
      user_id: auth.user?.id,
    },
    reset,
  )
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await Promise.all([
      exercises.loadFilters(),
      exercises.loadFavorites(auth.user?.id),
    ])
    await fetchResults(true)
    readRecent()
  },
)

watch([query, selectedBodyPart], () => {
  if (!props.open) return
  window.clearTimeout(debounceId)
  debounceId = window.setTimeout(() => {
    fetchResults(true)
  }, 300)
})

function saveRecent(exercise: ExerciseItem) {
  const map = new Map<string, ExerciseItem>()
  for (const item of [exercise, ...recentItems.value]) map.set(item.id, item)
  recentItems.value = Array.from(map.values()).slice(0, 10)
  localStorage.setItem(recentKey.value, JSON.stringify(recentItems.value))
}

function readRecent() {
  try {
    const raw = localStorage.getItem(recentKey.value)
    recentItems.value = raw ? (JSON.parse(raw) as ExerciseItem[]) : []
  } catch {
    recentItems.value = []
  }
}

function selectExercise(exercise: ExerciseItem) {
  saveRecent(exercise)
  props.onSelect(exercise)
  close()
}

onMounted(() => readRecent())
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="drawer-root">
      <div class="drawer-overlay" @click="close" />
      <aside class="drawer-panel">
        <header class="drawer-header">
          <div>
            <h3 class="drawer-title">Buscar ejercicio</h3>
            <p class="drawer-subtitle">Biblioteca global de ejercicios</p>
          </div>
          <button class="close-btn" @click="close">✕</button>
        </header>

        <div class="tabs">
          <button
            v-for="tab in ['search', 'recent', 'favorites']"
            :key="tab"
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab as any"
          >
            {{ tab === 'search' ? 'Buscar' : tab === 'recent' ? 'Recientes' : 'Favoritos' }}
          </button>
        </div>

        <div v-if="activeTab === 'search'" class="search-section">
          <input
            v-model="query"
            class="search-input"
            type="text"
            placeholder="Buscar ejercicio..."
          />
          <div class="chip-row">
            <button
              class="chip"
              :class="{ selected: selectedBodyPart === '' }"
              @click="selectedBodyPart = ''"
            >
              Todos
            </button>
            <button
              v-for="part in bodyParts"
              :key="part"
              class="chip"
              :class="{ selected: selectedBodyPart === part }"
              @click="selectedBodyPart = part"
            >
              {{ part }}
            </button>
          </div>
          <ul class="list">
            <li v-for="exercise in exercises.exercises" :key="exercise.id" class="row">
              <img
                v-if="exercise.gifUrl"
                :src="exercise.gifUrl"
                :alt="exercise.name"
                loading="lazy"
                class="thumb"
              />
              <div v-else class="thumb thumb-empty" />
              <div class="meta">
                <p class="name">{{ exercise.name }}</p>
                <p class="desc">{{ exercise.bodyPart }} · {{ exercise.target }}</p>
              </div>
              <button class="use-btn" @click="selectExercise(exercise)">
                {{ actionLabel }}
              </button>
            </li>
          </ul>
        </div>

        <ul v-else-if="activeTab === 'recent'" class="list">
          <li v-for="exercise in recentItems" :key="exercise.id" class="row">
            <img v-if="exercise.gifUrl" :src="exercise.gifUrl" :alt="exercise.name" loading="lazy" class="thumb" />
            <div v-else class="thumb thumb-empty" />
            <div class="meta">
              <p class="name">{{ exercise.name }}</p>
              <p class="desc">{{ exercise.bodyPart }} · {{ exercise.target }}</p>
            </div>
            <button class="use-btn" @click="selectExercise(exercise)">{{ actionLabel }}</button>
          </li>
        </ul>

        <ul v-else class="list">
          <li v-for="exercise in favorites" :key="exercise.id" class="row">
            <img v-if="exercise.gifUrl" :src="exercise.gifUrl" :alt="exercise.name" loading="lazy" class="thumb" />
            <div v-else class="thumb thumb-empty" />
            <div class="meta">
              <p class="name">{{ exercise.name }}</p>
              <p class="desc">{{ exercise.bodyPart }} · {{ exercise.target }}</p>
            </div>
            <button class="use-btn" @click="selectExercise(exercise)">{{ actionLabel }}</button>
          </li>
        </ul>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer-root { position: fixed; inset: 0; z-index: 60; }
.drawer-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); }
.drawer-panel {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: min(100%, 34rem);
  background: var(--card);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}
.drawer-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--foreground); }
.drawer-subtitle { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--muted-foreground); }
.close-btn { min-width: 2.75rem; min-height: 2.75rem; border: 1px solid var(--border); border-radius: 0.8rem; }
.tabs { padding: 0 1rem; border-bottom: 1px solid var(--border); display: flex; gap: 0.4rem; }
.tab-btn { border: none; background: transparent; padding: 0.7rem 0.35rem; color: var(--muted-foreground); }
.tab-btn.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
.search-section { display: flex; flex-direction: column; min-height: 0; }
.search-input {
  margin: 0.8rem 1rem 0;
  border: 1px solid var(--input);
  border-radius: 0.8rem;
  padding: 0.65rem 0.8rem;
  background: var(--background);
}
.chip-row {
  display: flex;
  overflow-x: auto;
  gap: 0.45rem;
  padding: 0.8rem 1rem;
}
.chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  white-space: nowrap;
}
.chip.selected { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }
.list { list-style: none; margin: 0; padding: 0.5rem 1rem 1rem; overflow: auto; }
.row {
  display: grid;
  grid-template-columns: 3rem 1fr auto;
  gap: 0.75rem;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding: 0.55rem 0;
}
.thumb { width: 3rem; height: 3rem; border-radius: 0.65rem; object-fit: cover; background: var(--muted); }
.thumb-empty { background: var(--muted); }
.meta { min-width: 0; }
.name { margin: 0; color: var(--foreground); font-size: 0.86rem; font-weight: 600; }
.desc { margin: 0.1rem 0 0; color: var(--muted-foreground); font-size: 0.72rem; }
.use-btn {
  min-height: 2.2rem;
  border: 1px solid var(--border);
  border-radius: 0.65rem;
  padding: 0 0.6rem;
  font-size: 0.75rem;
}
</style>
