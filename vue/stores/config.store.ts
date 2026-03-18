import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userConfigRepo } from '@/repo/userConfig.repo'
import { DEFAULT_CONFIG } from '@/config/defaults'
import type { AppearanceConfig, Language, ThemeColors, ViewKey } from '@/types/config.types'
import { i18n } from '@/plugins/i18n'

const DENSITY_CLASSES = ['density-compact', 'density-normal', 'density-comfortable']

function cloneAppearanceConfig(config: AppearanceConfig): AppearanceConfig {
  return {
    language: config.language,
    density: config.density,
    globalTheme: { ...config.globalTheme },
    viewThemes: Object.fromEntries(
      Object.entries(config.viewThemes ?? {}).map(([key, value]) => [key, { ...value }])
    ) as AppearanceConfig['viewThemes'],
  }
}

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppearanceConfig>(cloneAppearanceConfig(DEFAULT_CONFIG))
  const loading = ref(false)
  const activeView = ref<ViewKey | null>(null)

  async function fetchConfig() {
    loading.value = true
    try {
      const data = await userConfigRepo.get()
      config.value = cloneAppearanceConfig(data)
      reapplyTheme()
      i18n.global.locale.value = config.value.language as Language
    } catch {
      config.value = cloneAppearanceConfig(DEFAULT_CONFIG)
      reapplyTheme()
      i18n.global.locale.value = config.value.language as Language
    } finally {
      loading.value = false
    }
  }

  async function saveConfig(newConfig: AppearanceConfig) {
    await userConfigRepo.save(newConfig)
    config.value = cloneAppearanceConfig(newConfig)
    reapplyTheme()
    i18n.global.locale.value = newConfig.language as Language
  }

  function setActiveView(viewKey: ViewKey | null) {
    activeView.value = viewKey
    reapplyTheme()
  }

  function reapplyTheme(overrideTheme?: Partial<ThemeColors>) {
    const base = config.value.globalTheme
    const viewOvr = activeView.value ? (config.value.viewThemes[activeView.value] ?? {}) : {}
    const merged: ThemeColors = { ...base, ...viewOvr, ...overrideTheme }

    const root = document.documentElement

    root.style.setProperty('--color-primary', merged.primary)
    root.style.setProperty('--color-secondary', merged.secondary)
    root.style.setProperty('--color-accent', merged.accent)
    root.style.setProperty('--color-danger', merged.danger)
    root.style.setProperty('--color-background', merged.background)
    root.style.setProperty('--color-surface', merged.surface)
    root.style.setProperty('--color-text-primary', merged.textPrimary)
    root.style.setProperty('--color-text-muted', merged.textMuted)
    root.style.setProperty('--color-border', merged.border)

    root.style.setProperty('--primary', merged.primary)
    root.style.setProperty('--secondary', merged.secondary)
    root.style.setProperty('--accent', merged.accent)
    root.style.setProperty('--destructive', merged.danger)
    root.style.setProperty('--background', merged.background)
    root.style.setProperty('--card', merged.surface)
    root.style.setProperty('--foreground', merged.textPrimary)
    root.style.setProperty('--muted-foreground', merged.textMuted)
    root.style.setProperty('--border', merged.border)

    DENSITY_CLASSES.forEach(c => root.classList.remove(c))
    root.classList.add(`density-${config.value.density}`)
  }

  return {
    config,
    loading,
    activeView,
    fetchConfig,
    saveConfig,
    setActiveView,
    reapplyTheme,
  }
})