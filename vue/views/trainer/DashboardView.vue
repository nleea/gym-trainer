<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useDataStore } from "@/stores/data"
import { useAuthStore } from "@/stores/auth"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const dataStore = useDataStore()
const authStore = useAuthStore()

// ✅ state + getters (reactivos)
const {
  clients,
  activeClients,
  trainingLogs,
  mealLogs,
  dailyDiaries,
} = storeToRefs(dataStore)

// ✅ actions
const { loadClients, loadAttendance } = dataStore

// Auth: depende cómo lo tengas en tu auth store
// Si user es state del store:
const { user } = storeToRefs(authStore)

// userId reactivo (ajusta uid/id según tu modelo)
const userId = computed(() => user.value?.uid ?? "")

onMounted(async () => {
  // Evita usar userId! si puede ser vacío
  if (userId.value) {
    // si tu loadClients recibe userId, pásalo; si no, quítalo
    await loadClients(userId.value as any)
  } else {
    await loadClients("" as any)
  }
  await loadAttendance()
})

/**
 * ✅ HOY attendance
 * OJO: si en tu store getTodayAttendance es una función (como en tu composable),
 * lo correcto es llamarla desde dataStore, no desde storeToRefs.
 */
const todayAttendance = computed(() => dataStore.getTodayAttendance())
const attendedToday = computed(
  () => todayAttendance.value.filter((a) => a.attended).length
)

/**
 * ✅ Recent logs (con .value porque vienen de storeToRefs)
 */
const recentLogs = computed(() => {
  const logs: { type: string; clientName: string; date: Date; description: string }[] = []

  trainingLogs.value.slice(0, 3).forEach((log) => {
    const client = clients.value.find((c) => c.id === log.clientId)
    logs.push({
      type: "training",
      clientName: client?.name || t('trainer.dashboard.defaultName'),
      date: new Date(log.date as any),
      description: `${log.exercises.length} ${t('trainer.dashboard.exercises')}`,
    })
  })

  mealLogs.value.slice(0, 3).forEach((log) => {
    const client = clients.value.find((c) => c.id === log.clientId)
    logs.push({
      type: "meal",
      clientName: client?.name || t('trainer.dashboard.defaultName'),
      date: new Date(log.date as any),
      description: log.description,
    })
  })

  dailyDiaries.value.slice(0, 3).forEach((diary) => {
    const client = clients.value.find((c) => c.id === diary.clientId)
    logs.push({
      type: "diary",
      clientName: client?.name || t('trainer.dashboard.defaultName'),
      date: new Date(diary.date as any),
      description: `Energía: ${diary.energy}/5, Sueño: ${diary.sleep.toFixed(1)}h`,
    })
  })

  return logs.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
})

/**
 * ✅ Clientes activos sin plan (placeholder)
 * (tu lógica random la dejé igual pero ahora sí reactiva)
 */
const clientsWithoutPlan = computed(() => {
  return activeClients.value
    .filter((cl) => cl.planId === null || cl.planId === undefined)
})

// helpers UI
const formatDate = (date: Date) => {
  const today = new Date()
  const diff = today.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return t('common.today')
  if (days === 1) return t('common.yesterday')
  return t('common.daysAgo', { n: days })
}

const getLogIcon = (type: string) => {
  switch (type) {
    case "training": return "dumbbell"
    case "meal": return "utensils"
    case "diary": return "book"
    default: return "activity"
  }
}

const getLogColor = (type: string) => {
  switch (type) {
    case "training": return "text-primary"
    case "meal": return "text-accent"
    case "diary": return "text-chart-3"
    default: return "text-muted-foreground"
  }
}
</script>


<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-foreground">
        {{ t('trainer.dashboard.greeting') }}, {{ user?.name?.split(' ')[0] || t('trainer.dashboard.defaultName') }}
      </h1>
      <p class="text-muted-foreground">
        {{ t('trainer.dashboard.subtitle') }}
      </p>
    </div>
    
    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-foreground">{{ activeClients.length }}</p>
            <p class="text-sm text-muted-foreground">{{ t('trainer.dashboard.stats.activeClients') }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-foreground">{{ attendedToday }}</p>
            <p class="text-sm text-muted-foreground">{{ t('trainer.dashboard.stats.attendance') }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-chart-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-foreground">{{ trainingLogs.length }}</p>
            <p class="text-sm text-muted-foreground">{{ t('trainer.dashboard.stats.workoutsLogged') }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card rounded-xl p-4 lg:p-6 border border-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-chart-4/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-chart-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-foreground">87%</p>
            <p class="text-sm text-muted-foreground">{{ t('trainer.dashboard.stats.avgAdherence') }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content Grid -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recent Activity -->
      <div class="bg-card rounded-xl border border-border">
        <div class="p-4 lg:p-6 border-b border-border">
          <h2 class="font-semibold text-foreground">{{ t('trainer.dashboard.recentActivity') }}</h2>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="(log, index) in recentLogs"
            :key="index"
            class="p-4 lg:px-6 flex items-start gap-3"
          >
            <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', getLogColor(log.type)]" 
                 :style="{ backgroundColor: log.type === 'training' ? 'var(--primary)' : log.type === 'meal' ? 'var(--accent)' : 'var(--chart-3)', opacity: 0.15 }">
              <!-- Dumbbell -->
              <svg v-if="log.type === 'training'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h2m12 0h2M4 18h2m12 0h2M7 6v12M17 6v12M7 12h10" />
              </svg>
              <!-- Utensils -->
              <svg v-if="log.type === 'meal'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <!-- Book -->
              <svg v-if="log.type === 'diary'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13M19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ log.clientName }}</p>
              <p class="text-xs text-muted-foreground">{{ log.description }}</p>
            </div>
            <span class="text-xs text-muted-foreground whitespace-nowrap">{{ formatDate(log.date) }}</span>
          </div>
          <div v-if="recentLogs.length === 0" class="p-6 text-center text-muted-foreground">
            {{ t('trainer.dashboard.noActivity') }}
          </div>
        </div>
      </div>
      
      <!-- Clients Without Plan -->
      <div class="bg-card rounded-xl border border-border">
        <div class="p-4 lg:p-6 border-b border-border flex items-center justify-between">
          <h2 class="font-semibold text-foreground">{{ t('trainer.dashboard.clientsWithoutPlan') }}</h2>
          <RouterLink to="/trainer/clients" class="text-sm text-primary hover:underline">
            {{ t('trainer.dashboard.viewAll') }}
          </RouterLink>
        </div>
        <div class="divide-y divide-border">
          <RouterLink
            v-for="client in clientsWithoutPlan"
            :key="client.id"
            :to="`/trainer/clients/${client.id}`"
            class="p-4 lg:px-6 flex items-center gap-3 hover:bg-muted/50 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span class="text-sm font-semibold text-foreground">{{ client.name?.charAt(0) ?? "" }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ client.name }}</p>
              <p class="text-xs text-muted-foreground">{{ client.goals || t('trainer.dashboard.noGoal') }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
          <div v-if="clientsWithoutPlan.length === 0" class="p-6 text-center text-muted-foreground">
            {{ t('trainer.dashboard.allHavePlans') }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="bg-card rounded-xl border border-border p-4 lg:p-6">
      <h2 class="font-semibold text-foreground mb-4">{{ t('trainer.dashboard.quickActions') }}</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RouterLink
          to="/trainer/clients"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-foreground text-center">{{ t('trainer.dashboard.newClient') }}</span>
        </RouterLink>

        <RouterLink
          to="/trainer/plans/training/new"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span class="text-sm font-medium text-foreground text-center">{{ t('trainer.dashboard.trainingPlan') }}</span>
        </RouterLink>

        <RouterLink
          to="/trainer/plans/nutrition/new"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-chart-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6M7 6v12M17 6v12M7 12h10" />
            </svg>
          </div>
          <span class="text-sm font-medium text-foreground text-center">{{ t('trainer.dashboard.nutritionPlan') }}</span>
        </RouterLink>

        <RouterLink
          to="/trainer/reports"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-chart-4/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-chart-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-foreground text-center">{{ t('trainer.dashboard.viewReports') }}</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
