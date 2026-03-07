<script setup lang="ts">
import { ref } from 'vue'
import type { ExerciseItem } from '../repo/exercisesRepo'

const props = defineProps<{
  exercise: ExerciseItem
}>()

const emit = defineEmits<{
  (e: 'select', exercise: ExerciseItem): void
  (e: 'favorite', exercise: ExerciseItem): void
}>()

const imageLoaded = ref(false)
</script>

<template>
  <article class="exercise-card" @click="emit('select', props.exercise)">
    <button
      class="favorite-btn"
      :aria-label="props.exercise.isFavorite ? 'Quitar favorito' : 'Agregar favorito'"
      @click.stop="emit('favorite', props.exercise)"
    >
      {{ props.exercise.isFavorite ? '❤️' : '🤍' }}
    </button>

    <div class="image-wrap">
      <div v-if="!imageLoaded" class="image-placeholder" />
      <img
        v-if="props.exercise.gifUrl"
        :src="props.exercise.gifUrl"
        :alt="props.exercise.name"
        loading="lazy"
        class="exercise-gif"
        :class="{ loaded: imageLoaded }"
        @load="imageLoaded = true"
      />
      <div v-else class="image-placeholder" />
    </div>

    <div class="content">
      <h3 class="name">{{ props.exercise.name }}</h3>
      <div class="chips">
        <span v-if="props.exercise.bodyPart" class="chip">{{ props.exercise.bodyPart }}</span>
        <span v-if="props.exercise.equipment" class="chip">{{ props.exercise.equipment }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.exercise-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 1rem;
  overflow: hidden;
  background: var(--card);
  cursor: pointer;
}
.favorite-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border: none;
  border-radius: 999px;
  background: color-mix(in oklch, var(--card) 80%, transparent);
}
.image-wrap {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--muted);
}
.image-placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, var(--muted) 20%, var(--background) 45%, var(--muted) 70%);
  background-size: 200% 100%;
  animation: shine 1.4s linear infinite;
}
.exercise-gif {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.exercise-gif.loaded {
  opacity: 1;
}
.content {
  padding: 0.9rem;
}
.name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--foreground);
}
.chips {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.chip {
  font-size: 0.7rem;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  background: var(--muted);
  color: var(--muted-foreground);
}
@keyframes shine {
  to {
    background-position-x: -200%;
  }
}
</style>
