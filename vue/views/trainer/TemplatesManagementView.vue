<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlansStore } from '../../stores/plan.store'
import type { TrainingPlan, NutritionPlan } from '../../types'
import { storeToRefs } from 'pinia'

const router = useRouter()
const plansStore = usePlansStore()
const { trainingPlans, nutritionPlans } = storeToRefs(plansStore)

const trainingTemplates = computed(() => (trainingPlans.value || []).filter((p: TrainingPlan) => p.isTemplate !== false))
const nutritionTemplates = computed(() => (nutritionPlans.value || []).filter((p: NutritionPlan) => p.isTemplate !== false))

onMounted(async () => {
  await Promise.all([plansStore.loadTrainingPlans(), plansStore.loadNutritionPlans()])
})

function openTrainingTemplate(id?: string) {
  if (!id) return
  router.push(`/trainer/plans/training/${id}`)
}

function openNutritionTemplate(id?: string) {
  if (!id) return
  router.push(`/trainer/plans/nutrition/${id}/edit`)
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Plantillas</h1>
        <p class="text-sm text-muted-foreground">Editar plantillas solo afecta asignaciones futuras.</p>
      </div>
      <button
        class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        @click="router.push('/trainer/plans/training/new')"
      >
        + Nueva plantilla
      </button>
    </header>

    <div class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-2xl border bg-card p-4">
        <h2 class="font-semibold text-foreground mb-3">Entrenamiento</h2>
        <div class="space-y-3">
          <div v-for="tpl in trainingTemplates" :key="tpl.id" class="rounded-xl border bg-background p-3">
            <p class="font-medium text-foreground">{{ tpl.name }}</p>
            <p class="text-xs text-muted-foreground mt-1">Asignada a {{ tpl.copiesCount ?? 0 }} clientes</p>
            <div class="mt-3 flex gap-2">
              <button class="rounded-lg border px-3 py-1.5 text-sm" @click="openTrainingTemplate(tpl.id)">Editar plantilla</button>
              <button class="rounded-lg border px-3 py-1.5 text-sm" @click="router.push('/trainer/clients')">Asignar a cliente</button>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-2xl border bg-card p-4">
        <h2 class="font-semibold text-foreground mb-3">Nutrición</h2>
        <div class="space-y-3">
          <div v-for="tpl in nutritionTemplates" :key="tpl.id" class="rounded-xl border bg-background p-3">
            <p class="font-medium text-foreground">{{ tpl.name }}</p>
            <p class="text-xs text-muted-foreground mt-1">Asignada a {{ tpl.copiesCount ?? 0 }} clientes</p>
            <div class="mt-3 flex gap-2">
              <button class="rounded-lg border px-3 py-1.5 text-sm" @click="openNutritionTemplate(tpl.id)">Editar plantilla</button>
              <button class="rounded-lg border px-3 py-1.5 text-sm" @click="router.push('/trainer/clients')">Asignar a cliente</button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
