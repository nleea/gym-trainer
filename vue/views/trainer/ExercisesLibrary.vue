<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import {
  useExerciseLibrary,
  type Exercise,
  type MuscleGroup,
} from '../../repo/useExerciseLibrary';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const coachId = computed(() => user.value?.uid || '');
const libApi = ref<ReturnType<typeof useExerciseLibrary> | null>(null);

const showLibraryModal = ref(false);
const showCreateExerciseModal = ref(false);

const showEditExerciseModal = ref(false);
const editingId = ref<string | null>(null);

// filtros/selección
const search = ref('');
const group = ref<MuscleGroup | 'Todos'>('Todos');
const selectedIds = ref(new Set<string>());

const muscleGroups: (MuscleGroup | 'Todos')[] = [
  'Todos',
  'Piernas',
  'Pecho',
  'Espalda',
  'Hombros',
  'Brazos',
  'Core',
  'Cardio',
];

const muscleGroupsWithoutTodos = muscleGroups.filter(g => g !== 'Todos') as MuscleGroup[];

// Form crear ejercicio
const exName = ref('');
const exGroup = ref<MuscleGroup>('Piernas');
const exEquipment = ref('');
const urlExercise = ref('');

const exNotes = ref('');
const creating = ref(false);

const editName = ref('');
const editGroup = ref<MuscleGroup>('Piernas');
const editEquipment = ref('');
const editNotes = ref('');
const savingEdit = ref(false);
const deleting = ref(false);

watch(
  coachId,
  (id) => {
    if (!id) return;
    libApi.value?.stop?.();
    libApi.value = useExerciseLibrary(id);
    libApi.value?.start?.();
  },
  { immediate: true },
);

onUnmounted(() => libApi.value?.stop?.());

const library = computed<Exercise[]>(() => libApi.value?.library ?? []);
const loadingLibrary = computed(() => libApi.value?.loading ?? false);

const filteredLibrary = computed(() => {
  const q = search.value.trim().toLowerCase();

  return library.value.filter((ex) => {
    const matchGroup =
      group.value === 'Todos' || ex.muscleGroup === group.value;
    const matchSearch =
      !q ||
      ex.name.toLowerCase().includes(q) ||
      ex.muscleGroup.toLowerCase().includes(q) ||
      (ex.equipment ?? '').toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });
});

function toggleSelect(id: string) {
  const set = new Set(selectedIds.value);
  if (set.has(id)) { set.delete(id) } else { set.add(id) }
  selectedIds.value = set;
}

function closeLibrary() {
  showLibraryModal.value = false;
  search.value = '';
  group.value = 'Todos';
  selectedIds.value = new Set();
}

async function createExercise() {
  if (!libApi.value) return;
  if (!exName.value.trim()) return;

  creating.value = true;
  try {
    await libApi.value.createExercise({
      name: exName.value.trim(),
      muscleGroup: exGroup.value,
      equipment: exEquipment.value.trim() || undefined,
      notes: exNotes.value.trim() || undefined,
      active: true,
    });

    exName.value = '';
    exEquipment.value = '';
    exNotes.value = '';
    showCreateExerciseModal.value = false;
  } finally {
    creating.value = false;
  }
}

/** ---------- ✅ NUEVO: EDITAR ---------- */
function openEdit(ex: Exercise) {
  editingId.value = ex.id;
  editName.value = ex.name ?? '';
  editGroup.value = ex.muscleGroup;
  editEquipment.value = ex.equipment ?? '';
  editNotes.value = ex.notes ?? '';
  showEditExerciseModal.value = true;
}

function closeEdit() {
  showEditExerciseModal.value = false;
  editingId.value = null;
  editName.value = '';
  editEquipment.value = '';
  editNotes.value = '';
}

async function saveEdit() {
  if (!libApi.value) return;
  if (!editingId.value) return;
  if (!editName.value.trim()) return;

  savingEdit.value = true;
  try {
    await libApi.value.updateExercise(editingId.value, {
      name: editName.value.trim(),
      muscleGroup: editGroup.value,
      equipment: editEquipment.value.trim() || undefined,
      notes: editNotes.value.trim() || undefined,
    });

    closeEdit();
  } finally {
    savingEdit.value = false;
  }
}

/** ---------- ✅ NUEVO: ELIMINAR (soft delete) ---------- */
async function deleteExercise(ex: Exercise) {
  if (!libApi.value) return;

  const ok = confirm(`¿Eliminar "${ex.name}"? (Se ocultará de tu biblioteca)`);
  if (!ok) return;

  deleting.value = true;
  try {
    await libApi.value.updateExercise(ex.id, { active: false });

    const set = new Set(selectedIds.value);
    set.delete(ex.id);
    selectedIds.value = set;
  } finally {
    deleting.value = false;
  }
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
            Selecciona ejercicios existentes o crea nuevos
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="showCreateExerciseModal = true"
            class="px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
          >
            + Nuevo ejercicio
          </button>
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
          <select
            v-model="group"
            class="w-full sm:w-56 px-4 py-2.5 rounded-lg border border-input bg-background"
          >
            <option v-for="g in muscleGroups" :key="g" :value="g">
              {{ g }}
            </option>
          </select>
        </div>

        <div class="text-sm text-muted-foreground">
          <span v-if="loadingLibrary">Cargando biblioteca...</span>
          <span v-else
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
              :checked="selectedIds.has(ex.id)"
              @change="toggleSelect(ex.id)"
            />
            <div class="flex-1">
              <p class="font-medium text-foreground">{{ ex.name }}</p>
              <p class="text-sm text-muted-foreground">
                {{ ex.muscleGroup }}
                <span v-if="ex.equipment">• {{ ex.equipment }}</span>
              </p>
              <p
                v-if="ex.notes"
                class="text-xs text-muted-foreground mt-1"
              >
                {{ ex.notes }}
              </p>
            </div>
          </label>

          <!-- ✅ Solo si está seleccionado -->
          <div v-if="isSelected(ex.id)" class="flex items-center gap-2">
            <button
              type="button"
              @click="openEdit(ex)"
              class="px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
            >
              Editar
            </button>

            <button
              type="button"
              @click="deleteExercise(ex)"
              :disabled="deleting"
              class="px-3 py-2 rounded-lg border border-border hover:bg-destructive/10 text-destructive transition-colors text-sm disabled:opacity-50"
            >
              {{ deleting ? '...' : 'Eliminar' }}
            </button>
          </div>
        </div>

        <div
          v-if="!loadingLibrary && filteredLibrary.length === 0"
          class="p-6 text-center text-sm text-muted-foreground"
        >
          No hay ejercicios. Crea el primero con “+ Nuevo ejercicio”.
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Crear ejercicio -->
  <div
    v-if="showCreateExerciseModal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
      @click="showCreateExerciseModal = false"
    ></div>

    <div
      class="relative bg-card rounded-xl border border-border w-full max-w-md overflow-hidden"
    >
      <div
        class="p-4 lg:p-6 border-b border-border flex items-center justify-between"
      >
        <h2 class="text-lg font-semibold text-foreground">Nuevo ejercicio</h2>
        <button
          @click="showCreateExerciseModal = false"
          class="p-2 rounded-lg hover:bg-muted"
        >
          ✕
        </button>
      </div>

      <form @submit.prevent="createExercise" class="p-4 lg:p-6 space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Nombre</label>
          <input
            v-model="exName"
            type="text"
            placeholder="Ej: Zancadas con mancuernas"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
            required
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >Grupo muscular</label
          >
          <select
            v-model="exGroup"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
          >
            <option
              v-for="g in muscleGroupsWithoutTodos"
              :key="g"
              :value="g"
            >
              {{ g }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >Equipo (opcional)</label
          >
          <input
            v-model="exEquipment"
            type="text"
            placeholder="Barra / Mancuernas / Máquina..."
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >URL (opcional)</label
          >
          <input
            v-model="urlExercise"
            type="text"
            placeholder="Url para ver el ejerciso"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >Notas (opcional)</label
          >
          <textarea
            v-model="exNotes"
            rows="3"
            placeholder="Técnica, tips, etc..."
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
          />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            @click="showCreateExerciseModal = false"
            class="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="creating"
            class="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {{ creating ? 'Creando...' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal Editar ejercicio -->
  <div
    v-if="showEditExerciseModal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
      @click="closeEdit"
    ></div>

    <div
      class="relative bg-card rounded-xl border border-border w-full max-w-md overflow-hidden"
    >
      <div
        class="p-4 lg:p-6 border-b border-border flex items-center justify-between"
      >
        <h2 class="text-lg font-semibold text-foreground">Editar ejercicio</h2>
        <button @click="closeEdit" class="p-2 rounded-lg hover:bg-muted">
          ✕
        </button>
      </div>

      <form @submit.prevent="saveEdit" class="p-4 lg:p-6 space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Nombre</label>
          <input
            v-model="editName"
            type="text"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
            required
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >Grupo muscular</label
          >
          <select
            v-model="editGroup"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
          >
            <option
              v-for="g in muscleGroupsWithoutTodos"
              :key="g"
              :value="g"
            >
              {{ g }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >Equipo (opcional)</label
          >
          <input
            v-model="editEquipment"
            type="text"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
            placeholder="Barra / Mancuernas / Máquina..."
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >URL (opcional)</label
          >
          <input
            v-model="urlExercise"
            type="text"
            placeholder="Url para ver el ejerciso"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground"
            >Notas (opcional)</label
          >
          <textarea
            v-model="editNotes"
            rows="3"
            class="w-full px-4 py-2.5 rounded-lg border border-input bg-background"
            placeholder="Técnica, tips, etc..."
          />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            @click="closeEdit"
            class="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="savingEdit"
            class="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {{ savingEdit ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
