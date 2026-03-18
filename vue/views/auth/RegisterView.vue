<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const router = useRouter()
const { register } = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const role = ref<'trainer' | 'client'>('trainer')
const isLoading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    error.value = t('auth.errors.fillFields')
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = t('auth.errors.passwordMismatch')
    return
  }

  if (password.value.length < 6) {
    error.value = t('auth.errors.passwordTooShort')
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await register(email.value, password.value, {
      name: name.value,
      role: role.value,
    })

    if (result.ok) {
      router.push(role.value === 'trainer' ? '/trainer' : '/client')
    } else {
      error.value = result.message ?? t('auth.errors.createAccount')
    }
  } catch {
    error.value = t('auth.errors.register')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center lg:text-left">
      <h1 class="text-2xl font-bold text-foreground">{{ t('auth.register.title') }}</h1>
      <p class="text-muted-foreground mt-2">{{ t('auth.register.subtitle') }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Role Toggle -->
      <div class="bg-muted p-1 rounded-lg flex">
        <button
          type="button"
          @click="role = 'trainer'"
          :class="[
            'flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all',
            role === 'trainer'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('auth.register.roleTrainer') }}
        </button>
        <button
          type="button"
          @click="role = 'client'"
          :class="[
            'flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all',
            role === 'client'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          {{ t('auth.register.roleClient') }}
        </button>
      </div>

      <!-- Name -->
      <div class="space-y-2">
        <label for="name" class="block text-sm font-medium text-foreground">
          {{ t('auth.register.name') }}
        </label>
        <input
          id="name"
          v-model="name"
          type="text"
          :placeholder="t('auth.register.namePlaceholder')"
          class="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
      
      <!-- Email -->
      <div class="space-y-2">
        <label for="email" class="block text-sm font-medium text-foreground">
          {{ t('auth.register.email') }}
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          :placeholder="t('auth.register.emailPlaceholder')"
          class="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
      
      <!-- Password -->
      <div class="space-y-2">
        <label for="password" class="block text-sm font-medium text-foreground">
          {{ t('auth.register.password') }}
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          class="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
      
      <!-- Confirm Password -->
      <div class="space-y-2">
        <label for="confirmPassword" class="block text-sm font-medium text-foreground">
          {{ t('auth.register.confirmPassword') }}
        </label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          placeholder="••••••••"
          class="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
      
      <!-- Error Message -->
      <div v-if="error" class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        {{ error }}
      </div>
      
      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <span v-if="isLoading" class="flex items-center justify-center gap-2">
          <svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ t('auth.register.loading') }}
        </span>
        <span v-else>{{ t('auth.register.submit') }}</span>
      </button>
    </form>

    <!-- Login Link -->
    <p class="text-center text-sm text-muted-foreground">
      {{ t('auth.register.hasAccount') }}
      <RouterLink to="/login" class="text-primary font-medium hover:underline">
        {{ t('auth.register.login') }}
      </RouterLink>
    </p>
  </div>
</template>
