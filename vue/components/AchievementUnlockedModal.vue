<!-- vue/components/AchievementUnlockedModal.vue -->
<script setup lang="ts">
import type { Achievement } from '../types/achievement'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{ achievements: Achievement[] }>()
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
            <span class="text-5xl">🎉</span>
            <h2 class="text-xl font-bold text-foreground">{{ t('achievements.unlockedTitle') }}</h2>
            <p class="text-sm text-muted-foreground">{{ t('achievements.unlockedDesc') }}</p>
          </div>

          <!-- Achievements list -->
          <ul class="mb-6 space-y-2">
            <li
              v-for="a in achievements"
              :key="a.id"
              class="flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-3"
            >
              <span class="text-2xl">{{ a.icon }}</span>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-foreground truncate">{{ a.title }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ a.description }}</p>
              </div>
            </li>
          </ul>

          <!-- Close button -->
          <button
            type="button"
            class="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform"
            @click="emit('close')"
          >
            {{ t('achievements.celebrate') }}
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
