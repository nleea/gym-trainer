<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import ExercisesLibrary from './ExercisesLibrary.vue';
import TrainingPlanlist from '../../components/TrainingPlanlist.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
};

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const name = ref<string>('');
const email = ref<string>('');
const phone = ref<string>('');

const isSaving = ref(false);
const showSuccess = ref(false);

const exercises = ref<Exercise[]>([]);
const showAddExercise = ref(false);

const hydrated = ref(false);

function hydrateFromUser() {
  const u = user.value;
  if (!u) return;

  name.value = (u as any).name ?? '';
  email.value = (u as any).email ?? '';
  phone.value = (u as any).phone ?? '';

  hydrated.value = true;
}

watch(
  user,
  (u) => {
    if (!hydrated.value && u) hydrateFromUser();
  },
  { immediate: true },
);

const handleSaveProfile = async () => {
  if (!user.value) return;

  isSaving.value = true;
  showSuccess.value = false;

  try {
    if (typeof (authStore as any).updateProfile === 'function') {
      await (authStore as any).updateProfile({
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        exercises: exercises.value,
      });
    } else {
      await new Promise((r) => setTimeout(r, 500));
      console.warn(
        'Falta authStore.updateProfile(). Guardado simulado en Settings.vue',
      );
    }

    showSuccess.value = true;
    setTimeout(() => (showSuccess.value = false), 3000);
  } catch (e) {
    console.error('Error saving profile:', e);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-foreground">{{ t('trainer.settings.title') }}</h1>
      <p class="text-muted-foreground">{{ t('trainer.settings.subtitle') }}</p>
    </div>

    <!-- Success Message -->
    <div
      v-if="showSuccess"
      class="p-4 rounded-lg bg-primary/10 text-primary flex items-center gap-3"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
      {{ t('trainer.settings.savedSuccess') }}
    </div>

    <!-- Profile Settings -->
    <div class="bg-card rounded-xl border border-border">
      <div class="p-4 lg:p-6 border-b border-border">
        <h2 class="font-semibold text-foreground">{{ t('trainer.settings.profile') }}</h2>
        <p class="text-sm text-muted-foreground">{{ t('trainer.settings.profileDesc') }}</p>
      </div>

      <form @submit.prevent="handleSaveProfile" class="p-4 lg:p-6 space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            {{ t('trainer.settings.fullName') }}
          </label>
          <input
            v-model="name"
            type="text"
            autocomplete="name"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">{{ t('trainer.settings.email') }}</label>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">{{ t('trainer.settings.phone') }}</label>
          <input
            v-model="phone"
            type="tel"
            autocomplete="tel"
            placeholder="+57 300 000 0000"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          :disabled="isSaving || !user"
          class="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {{ isSaving ? t('trainer.settings.saving') : t('trainer.settings.saveChanges') }}
        </button>
      </form>
    </div>

    <!-- Exercises Library -->
    <div class="bg-card rounded-xl border border-border">
      <div
        class="p-4 lg:p-6 border-b border-border flex items-center justify-between"
      >
        <div>
          <h2 class="font-semibold text-foreground">
            {{ t('trainer.settings.exerciseLibrary') }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ t('trainer.settings.exerciseLibraryDesc') }}
          </p>
        </div>

        <ExercisesLibrary />
      </div>
    </div>

    <div class="bg-card rounded-xl border border-border">
      <div
        class="p-4 lg:p-6 border-b border-border flex items-center justify-between"
      >
        <div>
          <h2 class="font-semibold text-foreground">
            {{ t('trainer.settings.trainingLibrary') }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ t('trainer.settings.trainingLibraryDesc') }}
          </p>
        </div>

        <TrainingPlanlist />
      </div>
    </div>
  </div>
</template>
