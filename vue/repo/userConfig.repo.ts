import { api } from '../api'
import type { AppearanceConfig, ThemeColors } from '../types/config.types'

function fromResponse(res: any): AppearanceConfig {
  const c = res.config ?? {}
  const gt = c.global_theme ?? {}
  return {
    language:    c.language    ?? 'es',
    density:     c.density     ?? 'normal',
    globalTheme: {
      primary:     gt.primary      ?? '#6366f1',
      secondary:   gt.secondary    ?? '#10b981',
      accent:      gt.accent       ?? '#f59e0b',
      danger:      gt.danger       ?? '#ef4444',
      background:  gt.background   ?? '#f4f5f8',
      surface:     gt.surface      ?? '#ffffff',
      textPrimary: gt.text_primary ?? '#1f2937',
      textMuted:   gt.text_muted   ?? '#9ca3af',
      border:      gt.border       ?? '#e5e7eb',
    },
    viewThemes: c.view_themes ?? {},
  }
}

function toPayload(config: AppearanceConfig): Record<string, unknown> {
  const gt: ThemeColors = config.globalTheme
  return {
    language: config.language,
    density:  config.density,
    global_theme: {
      primary:      gt.primary,
      secondary:    gt.secondary,
      accent:       gt.accent,
      danger:       gt.danger,
      background:   gt.background,
      surface:      gt.surface,
      text_primary: gt.textPrimary,
      text_muted:   gt.textMuted,
      border:       gt.border,
    },
    view_themes: config.viewThemes,
  }
}

export const userConfigRepo = {
  async get(): Promise<AppearanceConfig> {
    const res = await api.get<unknown>('/config/')
    return fromResponse(res)
  },

  async save(config: AppearanceConfig): Promise<void> {
    await api.put('/config/', toPayload(config))
  },
}
