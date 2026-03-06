export type Language = 'es' | 'en' | 'pt'
export type Density  = 'compact' | 'normal' | 'comfortable'
export type ViewKey  = 'dashboard' | 'calendar' | 'nutrition' | 'training' | 'metrics' | 'settings' | 'progress'

export interface ThemeColors {
  primary:     string
  secondary:   string
  accent:      string
  danger:      string
  background:  string
  surface:     string
  textPrimary: string
  textMuted:   string
  border:      string
}

export interface AppearanceConfig {
  language:    Language
  density:     Density
  globalTheme: ThemeColors
  viewThemes:  Partial<Record<ViewKey, Partial<ThemeColors>>>
}
