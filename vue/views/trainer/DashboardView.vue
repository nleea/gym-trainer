<template>
  <div class="dashboard-root">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="text-2xl font-bold text-foreground">
          Hola, {{ firstName }}
        </h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          {{ today }}
        </p>
      </div>
      <RouterLink to="/trainer/clients" class="header-btn">
        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
        </svg>
        <span>Clientes</span>
      </RouterLink>
    </div>

    <!-- Loading skeleton -->
    <template v-if="trainerStore.loading">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="i in 4" :key="i" class="skeleton-card" />
      </div>
      <div class="skeleton-banner" />
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="skeleton-client" />
      </div>
    </template>

    <template v-else-if="trainerStore.stats">
      <!-- Stats row -->
      <TrainerStatsRow :stats="trainerStore.stats" />

      <!-- Alerts banner -->
      <AlertsBanner
        v-if="trainerStore.alertedClients.length > 0"
        :alerted-clients="trainerStore.alertedClients"
      />

      <!-- Filter / search bar -->
      <div class="filter-bar">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar cliente..."
            class="search-input"
          />
        </div>
        <div class="filter-chips">
          <button
            v-for="f in filters"
            :key="f.key"
            :class="['filter-chip', activeFilter === f.key && 'filter-chip-active']"
            @click="activeFilter = activeFilter === f.key ? 'all' : f.key"
          >
            {{ f.label }}
            <span v-if="f.count > 0" class="chip-count">{{ f.count }}</span>
          </button>
        </div>
      </div>

      <!-- Client grid -->
      <div v-if="filteredClients.length > 0" class="client-grid">
        <ClientSummaryCard
          v-for="client in filteredClients"
          :key="client.id"
          :client="client"
          @quick-plan="openQuickPlan"
        />
      </div>
      <div v-else class="empty-state">
        <p class="text-muted-foreground text-sm">No se encontraron clientes</p>
      </div>
    </template>

    <!-- Error / empty state -->
    <div v-else class="empty-state">
      <p class="text-muted-foreground text-sm">Sin datos. Intenta recargar.</p>
      <button class="header-btn mt-4" @click="trainerStore.loadDashboard()">Recargar</button>
    </div>

    <!-- Quick Plan Modal -->
    <QuickPlanModal
      v-if="quickPlanClient"
      :client-id="quickPlanClient.id"
      :client-name="quickPlanClient.name"
      @close="quickPlanClient = null"
      @assigned="onPlanAssigned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTrainerStore } from '../../stores/trainer.store'
import { useAuthStore } from '../../stores/auth'
import TrainerStatsRow from '../../components/trainer/TrainerStatsRow.vue'
import AlertsBanner from '../../components/trainer/AlertsBanner.vue'
import ClientSummaryCard from '../../components/trainer/ClientSummaryCard.vue'
import QuickPlanModal from './QuickPlanModal.vue'
import type { DashboardClient } from '../../repo/trainerRepo'

const trainerStore = useTrainerStore()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const firstName = computed(() => user.value?.name?.split(' ')[0] ?? 'Entrenador')

const today = computed(() => {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

// Filter / search
const search = ref('')
const activeFilter = ref<'all' | 'alerts' | 'active' | 'inactive'>('all')

const filters = computed(() => {
  const clients = trainerStore.clients
  return [
    {
      key: 'alerts' as const,
      label: 'Con alertas',
      count: clients.filter((c) => c.alerts.length > 0).length,
    },
    {
      key: 'active' as const,
      label: 'Activos',
      count: clients.filter((c) => c.weeklyWorkouts > 0).length,
    },
    {
      key: 'inactive' as const,
      label: 'Inactivos',
      count: clients.filter((c) => c.weeklyWorkouts === 0).length,
    },
  ]
})

const filteredClients = computed(() => {
  let list = trainerStore.clients

  if (activeFilter.value === 'alerts') {
    list = list.filter((c) => c.alerts.length > 0)
  } else if (activeFilter.value === 'active') {
    list = list.filter((c) => c.weeklyWorkouts > 0)
  } else if (activeFilter.value === 'inactive') {
    list = list.filter((c) => c.weeklyWorkouts === 0)
  }

  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter((c) => c.name.toLowerCase().includes(q))
  }

  return list
})

// Quick plan modal
const quickPlanClient = ref<DashboardClient | null>(null)

function openQuickPlan(clientId: string) {
  quickPlanClient.value = trainerStore.clients.find((c) => c.id === clientId) ?? null
}

function onPlanAssigned(_tab: 'training' | 'nutrition') {
  trainerStore.loadDashboard()
}

onMounted(() => {
  trainerStore.loadDashboard()
})
</script>

<style scoped>
.dashboard-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 32px;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.dashboard-header h1 {
  text-transform: capitalize;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.header-btn:hover { opacity: 0.85; }

/* Filter bar */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.search-wrap {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--muted-foreground);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--card);
  font-size: 14px;
  color: var(--foreground);
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--primary); }
.search-input::placeholder { color: var(--muted-foreground); }

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: var(--card);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s;
}
.filter-chip:hover { background: var(--muted); }
.filter-chip-active {
  border-color: var(--primary);
  background: color-mix(in oklch, var(--primary) 10%, transparent);
  color: var(--primary);
}
.chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--muted);
  font-size: 10px;
  font-weight: 700;
  color: var(--foreground);
}
.filter-chip-active .chip-count {
  background: var(--primary);
  color: var(--primary-foreground);
}

/* Grid */
.client-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 640px) {
  .client-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1280px) {
  .client-grid { grid-template-columns: repeat(3, 1fr); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  border-radius: 16px;
  border: 1px dashed var(--border);
}

/* Skeletons */
.skeleton-card {
  height: 110px;
  border-radius: 16px;
  background: var(--muted);
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-banner {
  height: 52px;
  border-radius: 14px;
  background: var(--muted);
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-client {
  height: 180px;
  border-radius: 16px;
  background: var(--muted);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
