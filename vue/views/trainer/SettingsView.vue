<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import ExercisesLibrary from './ExercisesLibrary.vue';
import type { NutritionPlan, TrainingPlan } from '../../types';
import { listTrainingPlans, deleteTrainingPlan } from '../../repo/training';
import { listNutritionPlans, deleteNutritionPlan } from '../../repo/nutritionPlan';
import { useAppToast } from '@/composables/useAppToast';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();
const toast = useAppToast();

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
const templatesLoading = ref(false);
const deletingTemplateId = ref<string | null>(null);
const templateTab = ref<'training' | 'nutrition'>('training');
const trainingTemplates = ref<TrainingPlan[]>([]);
const nutritionTemplates = ref<NutritionPlan[]>([]);

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

const visibleTrainingTemplates = computed(() =>
  trainingTemplates.value.filter((p: any) => p.isTemplate !== false),
);
const visibleNutritionTemplates = computed(() =>
  nutritionTemplates.value.filter((p: any) => p.isTemplate !== false),
);

async function loadTemplates() {
  templatesLoading.value = true;
  try {
    const [training, nutrition] = await Promise.all([listTrainingPlans(), listNutritionPlans()]);
    trainingTemplates.value = training;
    nutritionTemplates.value = nutrition;
  } catch (err) {
    console.error('Error loading templates:', err);
    toast.error('No se pudieron cargar las plantillas');
  } finally {
    templatesLoading.value = false;
  }
}

function editTrainingTemplate(planId: string) {
  router.push(`/trainer/plans/training/${planId}`);
}

function editNutritionTemplate(planId: string) {
  router.push(`/trainer/plans/nutrition/${planId}/edit`);
}

async function removeTrainingTemplate(planId: string) {
  const ok = window.confirm('¿Eliminar esta plantilla de entrenamiento? Las copias de clientes no se borrarán.');
  if (!ok) return;
  deletingTemplateId.value = planId;
  try {
    await deleteTrainingPlan(planId);
    trainingTemplates.value = trainingTemplates.value.filter((p) => p.id !== planId);
    toast.success('Plantilla eliminada');
  } catch (err) {
    console.error('Error deleting training template:', err);
    toast.error('No se pudo eliminar la plantilla');
  } finally {
    deletingTemplateId.value = null;
  }
}

async function removeNutritionTemplate(planId: string) {
  const ok = window.confirm('¿Eliminar esta plantilla de nutrición? Las copias de clientes no se borrarán.');
  if (!ok) return;
  deletingTemplateId.value = planId;
  try {
    await deleteNutritionPlan(planId);
    nutritionTemplates.value = nutritionTemplates.value.filter((p) => p.id !== planId);
    toast.success('Plantilla eliminada');
  } catch (err) {
    console.error('Error deleting nutrition template:', err);
    toast.error('No se pudo eliminar la plantilla');
  } finally {
    deletingTemplateId.value = null;
  }
}

onMounted(async () => {
  await loadTemplates();
});
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
      <div class="p-4 lg:p-6 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 class="font-semibold text-foreground">
            {{ t('trainer.settings.trainingLibrary') }}
          </h2>
          <p class="text-sm text-muted-foreground">
            Gestiona plantillas globales. Solo se listan templates, no planes ya asignados.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm"
            @click="loadTemplates"
            :disabled="templatesLoading"
          >
            {{ templatesLoading ? 'Actualizando...' : 'Actualizar' }}
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
            @click="templateTab === 'training' ? router.push('/trainer/plans/training/new') : router.push('/trainer/plans/nutrition/new')"
          >
            + Nueva plantilla
          </button>
        </div>
      </div>

      <div class="p-4 lg:p-6 space-y-4">
        <div class="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            class="px-3 py-2 text-sm"
            :class="templateTab === 'training' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
            @click="templateTab = 'training'"
          >
            Entrenamiento
          </button>
          <button
            class="px-3 py-2 text-sm border-l border-border"
            :class="templateTab === 'nutrition' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
            @click="templateTab = 'nutrition'"
          >
            Nutrición
          </button>
        </div>

        <div v-if="templateTab === 'training'" class="space-y-3">
          <div
            v-for="tpl in visibleTrainingTemplates"
            :key="tpl.id"
            class="rounded-xl border border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium text-foreground truncate">{{ tpl.name }}</p>
              <p class="text-xs text-muted-foreground mt-1">
                Asignada a {{ (tpl as any).copiesCount ?? 0 }} clientes
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                @click="editTrainingTemplate(String(tpl.id))"
              >
                Editar
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm disabled:opacity-60"
                :disabled="deletingTemplateId === tpl.id"
                @click="removeTrainingTemplate(String(tpl.id))"
              >
                {{ deletingTemplateId === tpl.id ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
          <p v-if="!templatesLoading && visibleTrainingTemplates.length === 0" class="text-sm text-muted-foreground">
            No tienes plantillas de entrenamiento creadas.
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="tpl in visibleNutritionTemplates"
            :key="tpl.id"
            class="rounded-xl border border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium text-foreground truncate">{{ tpl.name }}</p>
              <p class="text-xs text-muted-foreground mt-1">
                Asignada a {{ (tpl as any).copiesCount ?? 0 }} clientes
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                @click="editNutritionTemplate(String(tpl.id))"
              >
                Editar
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm disabled:opacity-60"
                :disabled="deletingTemplateId === tpl.id"
                @click="removeNutritionTemplate(String(tpl.id))"
              >
                {{ deletingTemplateId === tpl.id ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
          <p v-if="!templatesLoading && visibleNutritionTemplates.length === 0" class="text-sm text-muted-foreground">
            No tienes plantillas de nutrición creadas.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
