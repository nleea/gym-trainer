import { api } from '../api'
import type { AppearanceConfig, Density, Language, ThemeColors } from '../types/config.types'

interface UserConfigResponse {
  config?: {
    language?: string
    density?: string
    global_theme?: Record<string, string>
    view_themes?: Record<string, Record<string, string>>
  }
}

function fromResponse(res: UserConfigResponse): AppearanceConfig {
  const c = res.config ?? {}
  const gt = c.global_theme ?? {}
  return {
    language:    (c.language ?? 'es') as Language,
    density:     (c.density ?? 'normal') as Density,
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
    const res = await api.get<UserConfigResponse>('/config/')
    return fromResponse(res)
  },

  async save(config: AppearanceConfig): Promise<void> {
    await api.put('/config/', toPayload(config))
  },
}
