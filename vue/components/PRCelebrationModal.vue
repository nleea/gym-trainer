<script setup lang="ts">
export type PRItem = { exerciseName: string; newWeight: number; previousBest: number }

defineProps<{ prs: PRItem[] }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="emit('close')"
    >
      <Transition
        appear
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="scale-75 opacity-0"
        enter-to-class="scale-100 opacity-100"
      >
        <div class="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
          <!-- Header -->
          <div class="mb-4 flex flex-col items-center gap-2 text-center">
            <span class="text-5xl">🏆</span>
            <h2 class="text-xl font-bold text-foreground">¡Nuevo récord personal!</h2>
            <p class="text-sm text-muted-foreground">Has superado tu mejor marca en:</p>
          </div>

          <!-- PR list -->
          <ul class="mb-6 space-y-2">
            <li
              v-for="pr in prs"
              :key="pr.exerciseName"
              class="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3"
            >
              <span class="font-medium text-foreground">{{ pr.exerciseName }}</span>
              <div class="text-right">
                <p class="text-sm font-bold text-primary">{{ pr.newWeight }} kg</p>
                <p class="text-xs text-muted-foreground">antes {{ pr.previousBest }} kg</p>
              </div>
            </li>
          </ul>

          <!-- Close button -->
          <button
            type="button"
            class="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform"
            @click="emit('close')"
          >
            ¡Genial! 💪
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
