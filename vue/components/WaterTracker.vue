<template>
  <div class="rounded-2xl border bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center justify-between">
      <h4 class="text-sm font-semibold text-foreground">Agua</h4>
      <span class="text-sm font-medium text-sky-500">{{ consumed }}ml / {{ target }}ml</span>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="i in totalGlasses"
        :key="i"
        type="button"
        @click="toggleGlass(i)"
        class="flex h-10 w-10 flex-col items-center justify-end overflow-hidden rounded-lg border transition-all"
        :class="i <= filledCount ? 'border-sky-400 bg-sky-50 dark:bg-sky-950' : 'border-muted bg-muted/20 hover:bg-muted/40'"
        :title="`${i * ML_PER_GLASS}ml`"
      >
        <div
          class="w-full bg-sky-400 transition-all duration-300"
          :style="{ height: i <= filledCount ? '70%' : '0%' }"
        />
        <svg class="mb-0.5 h-3 w-3 shrink-0" :class="i <= filledCount ? 'text-sky-500' : 'text-muted-foreground'"
          viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 2l-2 6h14l-2-6H7zm-3 7l2 14h12l2-14H4z"/>
        </svg>
      </button>
    </div>

    <p class="mt-2 text-xs text-muted-foreground">
      {{ filledCount }} de {{ totalGlasses }} vasos ({{ ML_PER_GLASS }}ml c/u)
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  consumed: number
  target: number
}>()

const emit = defineEmits<{
  (e: 'update', ml: number): void
}>()

const ML_PER_GLASS = 250

const totalGlasses = computed(() => {
  if (!props.target) return 8
  return Math.max(4, Math.ceil(props.target / ML_PER_GLASS))
})

const filledCount = ref(Math.round(props.consumed / ML_PER_GLASS))

watch(() => props.consumed, (v) => {
  filledCount.value = Math.round(v / ML_PER_GLASS)
})

function toggleGlass(i: number) {
  if (filledCount.value === i) {
    filledCount.value = i - 1
  } else {
    filledCount.value = i
  }
  emit('update', filledCount.value * ML_PER_GLASS)
}
</script>
