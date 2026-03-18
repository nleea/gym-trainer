<template>
  <div class="rounded-xl border bg-card p-6 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-muted-foreground">{{ title }}</p>
        <p class="mt-2 text-3xl font-bold text-foreground">{{ value }}</p>
        <p v-if="subtitle" class="mt-1 text-xs" :class="subtitleClass">{{ subtitle }}</p>
      </div>
      <div v-if="icon" class="flex h-12 w-12 items-center justify-center rounded-full" :class="iconBgClass">
        <component :is="icon" class="h-6 w-6" :class="iconClass" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon?: Component
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default'
})

const iconBgClass = computed(() => {
  const classes = {
    primary: 'bg-primary/10',
    accent: 'bg-accent/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    default: 'bg-muted'
  }
  return classes[props.variant]
})

const iconClass = computed(() => {
  const classes = {
    primary: 'text-primary',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    default: 'text-muted-foreground'
  }
  return classes[props.variant]
})

const subtitleClass = computed(() => {
  if (!props.subtitle) return ''
  if (props.subtitle.startsWith('+')) return 'text-success'
  if (props.subtitle.startsWith('-')) return 'text-destructive'
  return 'text-muted-foreground'
})
</script>
