<!-- vue/components/AchievementsPreview.vue -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAchievementsStore } from '../stores/achievements.store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ clientId: string }>()
const achievementsStore = useAchievementsStore()

const summary = computed(() => achievementsStore.getSummary(props.clientId))
const loading = computed(() => achievementsStore.isLoading(props.clientId))
const error = computed(() => achievementsStore.getError(props.clientId))

onMounted(() => achievementsStore.loadSummary(props.clientId))

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="px-5 py-4">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-6">
        <div class="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-sm text-destructive py-4">{{ error }}</div>

      <!-- Data -->
      <template v-else-if="summary">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">🏆</span>
            <div>
              <p class="text-sm font-semibold text-foreground">{{ t('achievements.title') }}</p>
              <p class="text-xs text-muted-foreground">
                {{ summary.unlocked }} / {{ summary.total }} {{ t('achievements.unlocked') }}
              </p>
            </div>
          </div>
          <RouterLink
            to="/client/achievements"
            class="text-xs font-medium text-primary hover:underline"
          >
            {{ t('achievements.viewAll') }}
          </RouterLink>
        </div>

        <!-- Progress bar -->
        <div class="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
          <div
            class="h-full rounded-full bg-primary transition-all duration-500"
            :style="{ width: `${summary.total > 0 ? Math.round((summary.unlocked / summary.total) * 100) : 0}%` }"
          />
        </div>

        <!-- Latest unlocked -->
        <div v-if="summary.latest.length" class="flex flex-wrap gap-2">
          <div
            v-for="badge in summary.latest.slice(0, 3)"
            :key="badge.slug"
            class="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1"
          >
            <span class="text-sm">{{ badge.icon }}</span>
            <span class="text-xs font-medium text-foreground">{{ badge.title }}</span>
            <span class="text-[10px] text-muted-foreground">{{ fmtDate(badge.unlockedAt) }}</span>
          </div>
        </div>

        <!-- No achievements yet -->
        <p v-else class="text-xs text-muted-foreground">
          {{ t('achievements.empty') }}
        </p>
      </template>
    </div>
  </div>
</template>
