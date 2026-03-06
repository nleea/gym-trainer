<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-foreground">{{ t('client.settings.title') }}</h1>
      <p class="mt-2 text-muted-foreground">{{ t('client.settings.subtitle') }}</p>
    </div>

    <!-- Información personal -->
    <div class="rounded-xl border bg-card shadow-sm">
      <div class="border-b p-6">
        <h2 class="text-xl font-semibold text-foreground">{{ t('client.settings.personalInfo') }}</h2>
      </div>
      <div class="p-6 space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-medium text-foreground">{{ t('client.settings.fullName') }}</label>
            <input
              v-model="profile.name"
              type="text"
              class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-foreground">{{ t('client.settings.email') }}</label>
            <input
              v-model="profile.email"
              type="email"
              class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div>
            <label class="text-sm font-medium text-foreground">{{ t('client.settings.age') }}</label>
            <input
              v-model.number="profile.age"
              type="number"
              min="0"
              class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-foreground">{{ t('client.settings.height') }}</label>
            <input
              v-model.number="profile.height"
              type="number"
              min="0"
              class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-foreground">{{ t('client.settings.weight') }}</label>
            <input
              v-model.number="profile.weight"
              type="number"
              min="0"
              step="0.1"
              class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-foreground">{{ t('client.settings.goal') }}</label>
          <select
            v-model="profile.goal"
            class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Pérdida de peso">{{ t('client.settings.goals.weightLoss') }}</option>
            <option value="Ganancia muscular">{{ t('client.settings.goals.muscleGain') }}</option>
            <option value="Mantenimiento">{{ t('client.settings.goals.maintenance') }}</option>
            <option value="Resistencia">{{ t('client.settings.goals.endurance') }}</option>
          </select>
        </div>

        <div class="flex justify-end">
          <button
            @click="saveProfile"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {{ t('client.settings.saveChanges') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Apariencia -->
    <!-- TODO: i18n -->
    <RouterLink
      to="/client/settings/appearance"
      class="flex items-center justify-between rounded-xl border bg-card px-6 py-5 shadow-sm hover:bg-muted/50 transition-colors"
    >
      <div>
        <h2 class="text-xl font-semibold text-foreground">{{ t('client.settings.appearance') }}</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ t('client.settings.appearanceDesc') }}</p>
      </div>
      <svg class="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </RouterLink>

    <!-- Cambiar contraseña -->
    <div class="rounded-xl border bg-card shadow-sm">
      <div class="border-b p-6">
        <h2 class="text-xl font-semibold text-foreground">{{ t('client.settings.security') }}</h2>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="text-sm font-medium text-foreground">{{ t('client.settings.currentPassword') }}</label>
          <input
            v-model="passwordForm.current"
            type="password"
            class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-foreground">{{ t('client.settings.newPassword') }}</label>
          <input
            v-model="passwordForm.new"
            type="password"
            class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-foreground">{{ t('client.settings.confirmPassword') }}</label>
          <input
            v-model="passwordForm.confirm"
            type="password"
            class="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div class="flex justify-end">
          <button
            @click="changePassword"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {{ t('client.settings.updatePassword') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const authStore = useAuthStore()

const profile = ref({
  name: authStore.user?.name || '',
  email: authStore.user?.email || '',
  age: 0,
  height: 0,
  weight: 0,
  goal: 'Ganancia muscular'
})

const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
})

const saveProfile = () => {
  console.log('[v0] Guardando perfil:', profile.value)
}

const changePassword = () => {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    alert(t('client.settings.passwordMismatch'))
    return
  }
  console.log('[v0] Cambiando contraseña')
  passwordForm.value = { current: '', new: '', confirm: '' }
}
</script>
