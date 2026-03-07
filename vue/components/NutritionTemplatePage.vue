<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { NutritionPlan } from "@/types"

import { usePlansStore } from "@/stores/plan.store"
import { useClientsStore } from "../stores/clients.store"
import NutritionPlanForm from "@/components/NutritionPlanForm.vue"

const route = useRoute()
const router = useRouter()

const plansStore = usePlansStore()
const clientStore = useClientsStore()

const planId = computed(() => route.params.id as string | undefined)
const clientId = computed(() => (route.params.clientId as string) ?? "")

const plan = ref<Partial<NutritionPlan>>({
  name: "",
  description: "",
  targetCalories: undefined,
  targetProtein: undefined,
  targetCarbs: undefined,
  targetFat: undefined,
  water_ml: 2000,
  days: [],
  recommendedFoods: [],
  forbiddenFoods: [],
  guidelines: [],
})

watch(
  clientId,
  async (c) => {
    if (!c) return
    const data = await clientStore.fetchNutritionPlan(c);
    if (!data) return

    plan.value = JSON.parse(JSON.stringify(data))
  },
  { immediate: true }
)

const save = async () => {
  if (planId.value && planId.value !== "new") {
    await plansStore.updateNutritionPlan(planId.value, plan.value)
  } else {
    const newId = await plansStore.addNutritionPlan(plan.value as Omit<NutritionPlan, "id" | "createdAt" | "updatedAt">)
    router.replace(`/trainer/plans/nutrition/${newId}`)
  }
}
</script>

<template>
  <NutritionPlanForm v-model="plan" @save="save" />
</template>
