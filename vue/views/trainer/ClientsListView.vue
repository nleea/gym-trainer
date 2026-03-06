<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/data';
import { useAuthStore } from '../../stores/auth';

const dataStore = useDataStore();
const authStore = useAuthStore();

const { user } = storeToRefs(authStore);
const { clients } = storeToRefs(dataStore);

const userId = computed(() => user.value?.uid ?? '');

/** UI */
const searchQuery = ref('');
const statusFilter = ref<'all' | 'active' | 'inactive'>('all');
const showAddModal = ref(false);
const showAttendanceModal = ref(false);

const loading = ref(false);
const error = ref('');

/** Form */
const newClient = ref({
  name: '',
  email: '',
  phone: '',
  goals: '',
  cc: '',
  notes: '',
  weight: undefined as number | undefined,
  height: undefined as number | undefined,
  age: undefined as number | undefined,
});

/** 🔁 Carga unificada */
async function loadTrainerData(uid: string) {
  if (!uid) return;
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([
      dataStore.loadClients(uid as any),
      dataStore.loadAttendance(),
    ]);
  } catch (e: any) {
    error.value = e?.message ?? 'Error cargando datos';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (userId.value) {
    await loadTrainerData(userId.value);
  }
});

watch(
  userId,
  async (uid, prev) => {
    if (!uid || uid === prev) return;
    await loadTrainerData(uid);
  },
  { immediate: true },
);

/** ✅ hoy (getter devuelve función) */
const todayAttendance = computed(() => dataStore.getTodayAttendance());

const getClientAttendanceToday = (clientId: string) => {
  const attendance = todayAttendance.value.find((a) => a.clientId === clientId);
  return attendance?.attended ?? false;
};

/** ✅ filtros sin mutar store */
const filteredClients = computed(() => {
  const list = (clients.value ?? []).slice();

  const q = searchQuery.value.trim().toLowerCase();
  const status = statusFilter.value;

  return list.filter((c) => {
    const statusOk = status === 'all' ? true : c.status === status;
    const queryOk =
      !q ||
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q);

    return statusOk && queryOk;
  });
});

/** ✅ acciones */
const toggleAttendance = async (clientId: string, attended: boolean) => {
  try {
    await dataStore.markAttendance(clientId, attended);
  } catch (e: any) {
    console.error(e);
  }
};

const handleAddClient = async () => {
  error.value = '';

  if (!newClient.value.name.trim() || !newClient.value.email.trim()) {
    error.value = 'Nombre y email son obligatorios';
    return;
  }

  loading.value = true;
  try {
    const created = await dataStore.addClient({
      name: newClient.value.name.trim(),
      email: newClient.value.email.trim(),
      phone: newClient.value.phone?.trim() ?? '',
      goals: newClient.value.goals?.trim() ?? '',
      notes: newClient.value.notes?.trim() ?? '',
      weight: newClient.value.weight,
      height: newClient.value.height,
      age: newClient.value.age,
      role: 'client',
      trainerId: userId.value, // ✅ usa uid real
      status: 'active',
      startDate: new Date(),
    });

    await authStore.register(newClient.value.email.trim(), newClient.value.cc, {
      name: newClient.value.name.trim(),
      role: 'client',
      trainerId: userId.value,
      clientId: created.id
    });

    // reset form
    newClient.value = {
      name: '',
      email: '',
      phone: '',
      goals: '',
      cc: '',
      notes: '',
      weight: undefined,
      height: undefined,
      age: undefined,
    };

    showAddModal.value = false;
    return created;
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo crear el cliente';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-foreground">Clientes</h1>
        <p class="text-muted-foreground">Gestiona tus clientes y su progreso</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="showAttendanceModal = true"
          class="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        >
          Asistencia
        </button>
        <button
          @click="showAddModal = true"
          class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors"
        >
          Nuevo cliente
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre o email..."
          class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div class="flex bg-muted p-1 rounded-lg">
        <button
          @click="statusFilter = 'all'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            statusFilter === 'all'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          Todos
        </button>
        <button
          @click="statusFilter = 'active'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            statusFilter === 'active'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          Activos
        </button>
        <button
          @click="statusFilter = 'inactive'"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            statusFilter === 'inactive'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          Inactivos
        </button>
      </div>
    </div>

    <!-- Clients Grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink
        v-for="client in filteredClients"
        :key="client.id"
        :to="`/trainer/clients/${client.id}`"
        class="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
          >
            <span class="text-lg font-semibold text-foreground">{{
              client.name?.charAt(0)
            }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-foreground truncate">
                {{ client.name }}
              </h3>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  client.status === 'active'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                ]"
              >
                {{ client.status === 'active' ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <p class="text-sm text-muted-foreground truncate">
              {{ client.email }}
            </p>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-border">
          <p class="text-sm text-muted-foreground line-clamp-2">
            {{ client.goals || 'Sin objetivo definido' }}
          </p>
        </div>

        <div class="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span v-if="client.weight">{{ client.weight }} kg</span>
          <span v-if="client.height">{{ client.height }} cm</span>
          <span v-if="client.age">{{ client.age }} años</span>
        </div>
      </RouterLink>

      <!-- Empty State -->
      <div
        v-if="filteredClients.length === 0"
        class="sm:col-span-2 lg:col-span-3 bg-card rounded-xl border border-border p-12 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-12 h-12 mx-auto text-muted-foreground mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 class="text-lg font-medium text-foreground mb-2">
          No se encontraron clientes
        </h3>
        <p class="text-muted-foreground mb-4">
          Prueba ajustando los filtros o agrega un nuevo cliente
        </p>
        <button
          @click="showAddModal = true"
          class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors"
        >
          Agregar cliente
        </button>
      </div>
    </div>

    <!-- Add Client Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        @click="showAddModal = false"
      ></div>
      <div
        class="relative bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-foreground">Nuevo cliente</h2>
        </div>
        <form @submit.prevent="handleAddClient" class="p-6 space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Nombre *</label>
            <input
              v-model="newClient.name"
              type="text"
              required
              class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Juan Pérez"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Email *</label>
            <input
              v-model="newClient.email"
              type="email"
              required
              class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="juan@email.com"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Teléfono</label>
            <input
              v-model="newClient.phone"
              type="tel"
              class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="+34 600 000 000"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">C.C</label>
            <input
              required
              :minlength="6"
              :min="6"
              v-model="newClient.cc"
              type="text"
              class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="1.1.1.1.1.1"
            />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground"
                >Peso (kg)</label
              >
              <input
                required
                v-model.number="newClient.weight"
                type="number"
                class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="70"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground"
                >Altura (cm)</label
              >
              <input
                required
                v-model.number="newClient.height"
                type="number"
                class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="175"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Edad</label>
              <input
                v-model.number="newClient.age"
                type="number"
                class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="30"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Objetivos</label>
            <textarea
              v-model="newClient.goals"
              rows="3"
              class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe los objetivos del cliente..."
            ></textarea>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Notas</label>
            <textarea
              v-model="newClient.notes"
              rows="3"
              class="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe los objetivos del cliente..."
            ></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showAddModal = false"
              class="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Attendance Modal -->
    <div
      v-if="showAttendanceModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        @click="showAttendanceModal = false"
      ></div>
      <div
        class="relative bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-foreground">
            Asistencia de hoy
          </h2>
          <p class="text-sm text-muted-foreground">
            {{
              new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            }}
          </p>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="client in clients.filter((c) => c.status === 'active')"
            :key="client.id"
            class="p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <span class="text-sm font-semibold text-foreground">{{
                  client.name?.charAt(0)
                }}</span>
              </div>
              <span class="font-medium text-foreground">{{ client.name }}</span>
            </div>
            <div class="flex gap-2">
              <button
                @click="toggleAttendance(client.id!, true)"
                :class="[
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  getClientAttendanceToday(client.id!) === true
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-muted',
                ]"
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
              </button>
              <button
                @click="toggleAttendance(client.id!, false)"
                :class="[
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  getClientAttendanceToday(client.id!) === false
                    ? 'bg-destructive text-destructive-foreground'
                    : 'border border-border hover:bg-muted',
                ]"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="p-4 border-t border-border">
          <button
            @click="showAttendanceModal = false"
            class="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
