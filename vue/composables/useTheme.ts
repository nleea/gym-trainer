import { onMounted, onUnmounted } from 'vue'
import { useConfigStore } from '@/stores/config.store'
import type { ThemeColors, ViewKey } from '@/types/config.types'

export function useTheme() {
  const configStore = useConfigStore()

  function mountViewTheme(viewKey: ViewKey) {
    onMounted(() => {
      configStore.setActiveView(viewKey)
    })

    onUnmounted(() => {
      if (configStore.activeView === viewKey) {
        configStore.setActiveView(null)
      }
    })
  }

  function cssVar(token: keyof ThemeColors): string {
    const map: Record<keyof ThemeColors, string> = {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      accent: 'var(--color-accent)',
      danger: 'var(--color-danger)',
      background: 'var(--color-background)',
      surface: 'var(--color-surface)',
      textPrimary: 'var(--color-text-primary)',
      textMuted: 'var(--color-text-muted)',
      border: 'var(--color-border)',
    }
    return map[token]
  }

  return { mountViewTheme, cssVar }
}