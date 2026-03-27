<!-- vue/components/AchievementCard.vue -->
<script setup lang="ts">
import type { Achievement } from '../types/achievement'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{ achievement: Achievement }>()

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function progressPct(progress: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((progress / target) * 100))
}
</script>

<template>
  <div
    class="relative rounded-2xl border p-4 transition-shadow hover:shadow-md"
    :class="achievement.unlocked
      ? 'border-primary/30 bg-primary/5'
      : 'border-border/70 bg-background/50 opacity-75'"
  >
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <span
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        :class="achievement.unlocked ? 'bg-primary/15' : 'bg-muted grayscale'"
      >
        {{ achievement.icon }}
      </span>

      <div class="min-w-0 flex-1">
        <!-- Title -->
        <p class="text-sm font-semibold text-foreground truncate">
          {{ achievement.title }}
        </p>

        <!-- Description -->
        <p class="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {{ achievement.description }}
        </p>

        <!-- Unlocked date -->
        <p v-if="achievement.unlocked && achievement.unlockedAt" class="mt-2 text-[11px] text-primary font-medium">
          {{ t('achievements.unlocked') }} · {{ fmtDate(achievement.unlockedAt) }}
        </p>

        <!-- Progress bar (locked) -->
        <div v-if="!achievement.unlocked" class="mt-2">
          <div class="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>{{ achievement.progress }} / {{ achievement.target }}</span>
            <span>{{ progressPct(achievement.progress, achievement.target) }}%</span>
          </div>
          <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full bg-primary/60 transition-all duration-500"
              :style="{ width: `${progressPct(achievement.progress, achievement.target)}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
