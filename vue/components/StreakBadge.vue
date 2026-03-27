<!-- vue/components/StreakBadge.vue -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStreakStore } from '../stores/streak.store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ clientId: string }>()
const streakStore = useStreakStore()

const streak = computed(() => streakStore.getStreak(props.clientId))
const loading = computed(() => streakStore.isLoading(props.clientId))
const error = computed(() => streakStore.getError(props.clientId))

onMounted(() => streakStore.loadStreak(props.clientId))
</script>

<template>
  <div class="rounded-2xl border border-border bg-card p-4">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-sm text-destructive">{{ error }}</div>

    <!-- Data -->
    <template v-else-if="streak">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm text-muted-foreground">{{ t('streak.current') }}</p>
          <p class="text-2xl font-bold text-foreground">
            {{ streak.current }}
            <span class="text-base font-normal text-muted-foreground">{{ t('streak.days') }}</span>
          </p>
        </div>
        <svg
          class="h-8 w-8 shrink-0"
          :class="streak.current > 0 ? 'text-orange-500' : 'text-muted-foreground/40'"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        >
          <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
          <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>
        </svg>
      </div>
      <div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{{ t('streak.best') }}: <strong class="text-foreground">{{ streak.best }}</strong> {{ t('streak.days') }}</span>
        <span v-if="streak.lastActivity">·</span>
        <span v-if="streak.lastActivity">{{ t('streak.lastActivity') }}: {{ fmtDate(streak.lastActivity) }}</span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
</script>
