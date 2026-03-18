<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';

import { usePlansStore } from '../stores/plan.store';

const authStore = useAuthStore();
const plansStore = usePlansStore();
const { user } = storeToRefs(authStore);

const coachId = computed(() => user.value?.uid || '');

const showLibraryModal = ref(false);

// filtros/selección
const search = ref('');
const selectedIds = ref(new Set<string>());
const deleting = ref(false);

watch(
  coachId,
  (id) => {
    if (!id) return;
    plansStore.loadTrainingPlans();
  },
  { immediate: true },
);

const filteredLibrary = computed(() => {
  const q = search.value.trim().toLowerCase();
  return plansStore.trainingPlans.filter((ex) => {
    const matchSearch = !q || ex.name.toLowerCase().includes(q);
    return matchSearch;
  });
});

function toggleSelect(id: string) {
  const set = new Set<string>(selectedIds.value);
  if (set.has(id)) { set.clear() } else { set.add(id) }
  selectedIds.value = set;
}

function closeLibrary() {
  showLibraryModal.value = false;
  search.value = '';
  selectedIds.value = new Set();
}

/** ---------- ✅ NUEVO: ELIMINAR ---------- */
async function deleteExercise(ex: string | undefined) {
  if (!ex) return;
}

/** util: solo para mostrar botones cuando está seleccionado */
function isSelected(id: string) {
  return selectedIds.value.has(id);
}
</script>

<template>
  <button
    @click="showLibraryModal = true"
    class="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-colors"
  >
    Agregar a la biblioteca
  </button>

  <!-- Modal Biblioteca -->
  <div
    v-if="showLibraryModal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
      @click="closeLibrary"
    ></div>

    <div
      class="relative bg-card rounded-xl border border-border w-full max-w-2xl overflow-hidden"
    >
      <div
        class="p-4 lg:p-6 border-b border-border flex items-center justify-between gap-3"
      >
        <div>
          <h2 class="text-lg font-semibold text-foreground">
            Biblioteca del entrenador
          </h2>
          <p class="text-sm text-muted-foreground">
            Selecciona planes o crea nuevos
          </p>
        </div>

        <div class="flex items-center gap-2">
          <RouterLink
            to="plans/training/new"
            class="px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
          >
            + Nuevo ejercicio
          </RouterLink>

          <button
            @click="closeLibrary"
            class="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="p-4 lg:p-6 border-b border-border space-y-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="search"
            type="text"
            placeholder="Buscar..."
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
          />
        </div>

        <div class="text-sm text-muted-foreground">
          <span
            >Mostrando {{ filteredLibrary.length }} • Seleccionados
            {{ selectedIds.size }}</span
          >
        </div>
      </div>

      <div class="max-h-[55vh] overflow-auto divide-y divide-border">
        <div
          v-for="ex in filteredLibrary"
          :key="ex.id"
          class="p-4 lg:px-6 flex items-start justify-between gap-4"
        >
          <label class="flex items-start gap-3 cursor-pointer w-full">
            <input
              type="checkbox"
              class="mt-1"
              :checked="selectedIds.has(ex.id!)"
              @change="toggleSelect(ex.id!)"
            />
            <div class="flex-1">
              <p class="font-medium text-foreground">{{ ex.name }}</p>
            </div>
          </label>

          <div v-if="isSelected(ex.id!)" class="flex items-center gap-2">
            <RouterLink
              :to="'plans/training/' + ex.id"
              class="px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
            >
              Editar
            </RouterLink>

            <button
              type="button"
              @click="deleteExercise(ex.id ?? '')"
              :disabled="deleting"
              class="px-3 py-2 rounded-lg border border-border hover:bg-destructive/10 text-destructive transition-colors text-sm disabled:opacity-50"
            >
              {{ deleting ? '...' : 'Eliminar' }}
            </button>
          </div>
        </div>

        <div
          v-if="filteredLibrary.length === 0"
          class="p-6 text-center text-sm text-muted-foreground"
        >
          No hay planes creados, para crear presiona el '+' en el boton de
          arriba
        </div>
      </div>
    </div>
  </div>
</template>
