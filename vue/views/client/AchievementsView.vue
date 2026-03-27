<!-- vue/views/client/AchievementsView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useAchievementsStore } from '../../stores/achievements.store'
import type { AchievementCategory } from '../../types/achievement'
import AchievementCard from '../../components/AchievementCard.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const achievementsStore = useAchievementsStore()

const clientId = computed(() => authStore.user?.client_id || authStore.user?.uid || '')

const achievements = computed(() => achievementsStore.getAchievements(clientId.value))
const loading = computed(() => achievementsStore.isLoading(clientId.value))
const error = computed(() => achievementsStore.getError(clientId.value))
const activeCategory = ref<AchievementCategory | 'all'>('all')

onMounted(() => {
  if (clientId.value) achievementsStore.loadAchievements(clientId.value)
})

const categories: { key: AchievementCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'achievements.categories.all' },
  { key: 'workouts', label: 'achievements.categories.workouts' },
  { key: 'streak', label: 'achievements.categories.streak' },
  { key: 'strength', label: 'achievements.categories.strength' },
  { key: 'milestones', label: 'achievements.categories.milestones' },
]

const filtered = computed(() => {
  if (activeCategory.value === 'all') return achievements.value
  return achievements.value.filter((a) => a.category === activeCategory.value)
})

const unlockedCount = computed(() => achievements.value.filter((a) => a.unlocked).length)
const totalCount = computed(() => achievements.value.length)
const pct = computed(() => totalCount.value > 0 ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0)
</script>

<template>
  <div class="space-y-5 pb-8 sm:space-y-6">
    <!-- Hero -->
    <div class="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card px-4 py-6 sm:px-6 sm:py-8">
      <p class="text-xs font-semibold uppercase tracking-widest text-primary">🏆</p>
      <h1 class="mt-1 text-2xl font-black text-foreground sm:text-3xl">
        {{ t('achievements.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ t('achievements.subtitle') }}
      </p>

      <!-- Summary stats -->
      <div v-if="!loading && achievements.length" class="mt-4 flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-2xl font-black text-primary">{{ unlockedCount }}</span>
          <span class="text-sm text-muted-foreground">/ {{ totalCount }}</span>
        </div>
        <div class="flex-1 max-w-xs">
          <div class="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all duration-700"
              :style="{ width: `${pct}%` }"
            />
          </div>
        </div>
        <span class="text-sm font-semibold text-foreground">{{ pct }}%</span>
      </div>
    </div>

    <!-- Category tabs -->
    <div class="overflow-x-auto">
      <div class="flex gap-1.5 min-w-max">
        <button
          v-for="cat in categories"
          :key="cat.key"
          type="button"
          class="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
          :class="activeCategory === cat.key
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'"
          @click="activeCategory = cat.key"
        >
          {{ t(cat.label) }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!achievements.length" class="flex flex-col items-center justify-center py-16 text-center">
      <span class="text-5xl mb-4">🏆</span>
      <h3 class="text-lg font-semibold text-foreground">{{ t('achievements.emptyTitle') }}</h3>
      <p class="mt-1 max-w-sm text-sm text-muted-foreground">{{ t('achievements.emptyDesc') }}</p>
    </div>

    <!-- Achievements grid -->
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <AchievementCard
        v-for="achievement in filtered"
        :key="achievement.id"
        :achievement="achievement"
      />
    </div>

    <!-- No results for category -->
    <div v-if="!loading && achievements.length && !filtered.length" class="py-8 text-center text-sm text-muted-foreground">
      {{ t('achievements.noCategory') }}
    </div>
  </div>
</template>
