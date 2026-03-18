<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-show="true" class="modal-backdrop" @click.self="$emit('close')">
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-4 scale-95"
          appear
        >
          <div class="modal-panel">
            <!-- Header -->
            <div class="modal-header">
              <div>
                <h2 class="text-base font-bold text-foreground">Plan rapido</h2>
                <p class="text-xs text-muted-foreground mt-0.5">{{ clientName }}</p>
              </div>
              <button class="modal-close-btn" @click="$emit('close')">
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>

            <!-- Tabs -->
            <div class="modal-tabs">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                :class="['tab-btn', activeTab === tab.key && 'tab-active']"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>

            <!-- Body -->
            <div class="modal-body">
              <!-- Loading -->
              <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>

              <!-- Error -->
              <div v-else-if="error" class="py-8 text-center text-sm text-destructive">
                {{ error }}
              </div>

              <!-- Plan list -->
              <template v-else>
                <div v-if="currentPlans.length === 0" class="py-8 text-center text-sm text-muted-foreground">
                  No hay planes disponibles
                </div>
                <div v-else class="plan-list">
                  <button
                    v-for="plan in currentPlans"
                    :key="plan.id"
                    :class="['plan-row', selectedPlanId === plan.id && 'plan-row-selected']"
                    @click="selectedPlanId = plan.id ?? null"
                  >
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <div :class="['plan-radio', selectedPlanId === plan.id && 'plan-radio-checked']">
                        <div v-if="selectedPlanId === plan.id" class="plan-radio-dot" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-foreground truncate">{{ plan.name }}</p>
                        <span class="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Plantilla</span>
                        <p v-if="plan.description" class="text-xs text-muted-foreground truncate">{{ plan.description }}</p>
                      </div>
                    </div>
                  </button>
                </div>

                <!-- Start date -->
                <div v-if="selectedPlanId" class="start-date-row">
                  <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fecha de inicio
                  </label>
                  <input
                    v-model="startDate"
                    type="date"
                    class="date-input"
                  />
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <button class="btn-cancel" @click="$emit('close')">Cancelar</button>
              <button
                class="btn-assign"
                :disabled="!selectedPlanId || assigning"
                @click="assign"
              >
                <span v-if="assigning" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                <span v-else>Asignar plan</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TrainingPlan, NutritionPlan } from '../../types'
import { listTrainingPlans } from '../../repo/training'
import { listNutritionPlans } from '../../repo/nutritionPlan'
import { assignTemplateToClient } from '../../repo/training'
import { assignNutritionTemplateToClient } from '../../repo/nutritionPlan'
import { toYmdLocal } from '../../../lib/utils'

const props = defineProps<{
  clientId: string
  clientName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'assigned', tab: 'training' | 'nutrition'): void
}>()

const tabs = [
  { key: 'training' as const, label: 'Entrenamiento' },
  { key: 'nutrition' as const, label: 'Nutricion' },
]

const activeTab = ref<'training' | 'nutrition'>('training')
const trainingPlans = ref<TrainingPlan[]>([])
const nutritionPlans = ref<NutritionPlan[]>([])
const selectedPlanId = ref<string | null>(null)
const startDate = ref(toYmdLocal(new Date()))
const loading = ref(false)
const error = ref<string | null>(null)
const assigning = ref(false)

const currentPlans = computed(() =>
  (activeTab.value === 'training' ? trainingPlans.value : nutritionPlans.value).filter(
    (plan: TrainingPlan | NutritionPlan) => plan.isTemplate !== false,
  )
)

watch(activeTab, () => {
  selectedPlanId.value = null
})

async function loadPlans() {
  loading.value = true
  error.value = null
  try {
    const [tp, np] = await Promise.all([listTrainingPlans(), listNutritionPlans()])
    trainingPlans.value = tp
    nutritionPlans.value = np
  } catch {
    error.value = 'Error al cargar los planes'
  } finally {
    loading.value = false
  }
}

async function assign() {
  if (!selectedPlanId.value) return
  assigning.value = true
  try {
    if (activeTab.value === 'training') {
      await assignTemplateToClient(selectedPlanId.value, props.clientId, startDate.value, 4, '')
    } else {
      await assignNutritionTemplateToClient(selectedPlanId.value, props.clientId, startDate.value, 4, '')
    }
    emit('assigned', activeTab.value)
    emit('close')
  } catch {
    error.value = 'Error al asignar el plan'
  } finally {
    assigning.value = false
  }
}

loadPlans()
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;
    padding: 16px;
  }
}
.modal-panel {
  background: var(--card);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  width: 100%;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
@media (min-width: 640px) {
  .modal-panel {
    border-radius: 20px;
    max-width: 440px;
    max-height: 80vh;
  }
}
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 20px 0;
}
.modal-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--muted);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  flex-shrink: 0;
  transition: background 0.15s;
}
.modal-close-btn:hover { background: var(--border); }

.modal-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 20px 0;
}
.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover { background: var(--muted); }
.tab-active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-foreground);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.plan-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}
.plan-row:hover { background: var(--muted); }
.plan-row-selected {
  border-color: var(--primary);
  background: color-mix(in oklch, var(--primary) 8%, transparent);
}
.plan-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;
}
.plan-row-selected .plan-radio { border-color: var(--primary); }
.plan-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

.start-date-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--muted);
}
.date-input {
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--foreground);
  outline: none;
}
.date-input:focus { border-color: var(--primary); }

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}
.btn-cancel {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cancel:hover { background: var(--muted); }
.btn-assign {
  flex: 2;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: var(--primary);
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-foreground);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
}
.btn-assign:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-assign:not(:disabled):hover { opacity: 0.9; }
</style>
