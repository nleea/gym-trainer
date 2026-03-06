<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import Toast from "./components/AppToast.vue";
import { useConfigStore } from '@/stores/config.store'
import { useRoute } from 'vue-router'

import type { ViewKey } from '@/types/config.types'

const configStore = useConfigStore()
const route = useRoute()


watch(
  () => route.meta.viewTheme,
  (viewTheme) => {
    if (viewTheme) {
      configStore.setActiveView(viewTheme as ViewKey)
    } else {
      configStore.reapplyTheme()
    }
  },
  { immediate: true }
)

watch(
  () => configStore.config,
  () => {
    const viewTheme = route.meta.viewTheme as ViewKey | undefined
    if (viewTheme) {
      configStore.setActiveView(viewTheme)
    } else {
      configStore.reapplyTheme()
    }
  },
  { deep: true }
)
</script>

<template>
  <RouterView />
  <Toast/>
</template>
