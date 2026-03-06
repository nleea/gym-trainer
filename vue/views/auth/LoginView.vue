<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const router = useRouter();
const auth = useAuthStore();

// ✅ state/getters reactivos
const { error: storeError } = storeToRefs(auth);
// (si en tu auth store no tienes loading/error, quita estas 2 líneas y usa tus refs locales)

const email = ref('client1@gymtrainer.com');
const password = ref('client123');

// UI local
const isLoading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  if (!email.value || !password.value) {
    error.value = t('auth.errors.fillFields');
    return;
  }

  isLoading.value = true;
  error.value = '';

  try {
    const result = await auth.login(email.value, password.value);

    if (result.ok) {

      if(result.role === 'trainer') {
        router.push('/trainer/');
        return;
      }

      router.push('/client/');
    }

  } catch (e: any) {
    const code = e?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      error.value = t('auth.errors.invalidCredential');
    } else if (code === 'auth/user-not-found') {
      error.value = t('auth.errors.userNotFound');
    } else if (code === 'auth/too-many-requests') {
      error.value = t('auth.errors.tooManyRequests');
    } else {
      error.value = t('auth.errors.login');
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="text-center lg:text-left">
      <h1 class="text-2xl font-bold text-foreground">{{ t('auth.login.title') }}</h1>
      <p class="text-muted-foreground mt-2">
        {{ t('auth.login.subtitle') }}
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Email -->
      <div class="space-y-2">
        <label for="email" class="block text-sm font-medium text-foreground">
          {{ t('auth.login.email') }}
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          :placeholder="t('auth.login.emailPlaceholder')"
          class="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>

      <!-- Password -->
      <div class="space-y-2">
        <label for="password" class="block text-sm font-medium text-foreground">
          {{ t('auth.login.password') }}
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          class="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>

      <!-- Error Message -->
      <div
        v-if="error || storeError"
        class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
      >
        {{ error || storeError }}
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <span v-if="isLoading" class="flex items-center justify-center gap-2">
          <svg
            class="animate-spin w-5 h-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ t('auth.login.loading') }}
        </span>
        <span v-else>{{ t('auth.login.submit') }}</span>
      </button>
    </form>

    <!-- Register Link -->
    <p class="text-center text-sm text-muted-foreground">
      {{ t('auth.login.noAccount') }}
      <RouterLink
        to="/register"
        class="text-primary font-medium hover:underline"
      >
        {{ t('auth.login.register') }}
      </RouterLink>
    </p>
  </div>
</template>
