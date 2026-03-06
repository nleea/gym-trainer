import type { ThemeColors, AppearanceConfig } from '@/types/config.types'

export const DEFAULT_THEME: ThemeColors = {
  primary:     '#6366f1',
  secondary:   '#10b981',
  accent:      '#f59e0b',
  danger:      '#ef4444',
  background:  '#f4f5f8',
  surface:     '#ffffff',
  textPrimary: '#1f2937',
  textMuted:   '#9ca3af',
  border:      '#e5e7eb',
}

export const DEFAULT_CONFIG: AppearanceConfig = {
  language:    'es',
  density:     'normal',
  globalTheme: DEFAULT_THEME,
  viewThemes:  {},
}
