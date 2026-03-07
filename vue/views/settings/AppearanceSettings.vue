<script setup lang="ts">
import { ref, computed, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config.store'
import { useAppToast } from '@/composables/useAppToast'
import { DEFAULT_CONFIG, DEFAULT_THEME } from '@/config/defaults'
import type {
  AppearanceConfig,
  ThemeColors,
  ViewKey,
  Language,
  Density,
} from '@/types/config.types'

const router = useRouter()
const { t } = useI18n()
const store = useConfigStore()
const toast = useAppToast()

function cloneAppearanceConfig(config: AppearanceConfig): AppearanceConfig {
  return {
    language: config.language,
    density: config.density,
    globalTheme: {
      ...config.globalTheme,
    },
    viewThemes: Object.fromEntries(
      Object.entries(config.viewThemes ?? {}).map(([key, value]) => [
        key,
        { ...value },
      ])
    ) as AppearanceConfig['viewThemes'],
  }
}

// ── Estado local (draft — no va al store hasta Guardar) ───────────────────────
const localConfig = ref<AppearanceConfig>(
  cloneAppearanceConfig(toRaw(store.config))
)

const hasChanges = computed(() =>
  JSON.stringify(localConfig.value) !== JSON.stringify(toRaw(store.config))
)

const saving = ref(false)

// ── Navegación ───────────────────────────────────────────────────────────────
type Section = 'language' | 'global' | 'views' | 'density'
const activeSection = ref<Section>('language')

const navItems: { key: Section; icon: string; labelKey: string }[] = [
  { key: 'language', icon: '🌐', labelKey: 'settings.appearance.language.title' },
  { key: 'global', icon: '🎨', labelKey: 'settings.appearance.theme.title' },
  { key: 'views', icon: '🖼', labelKey: 'settings.appearance.views.title' },
  { key: 'density', icon: '📐', labelKey: 'nav.client.settings' },
]

// ── Sección 1 — Idioma ────────────────────────────────────────────────────────
const LANGUAGES: { key: Language; flag: string }[] = [
  { key: 'es', flag: '🇨🇴' },
  { key: 'en', flag: '🇺🇸' },
  { key: 'pt', flag: '🇧🇷' },
]

function selectLanguage(lang: Language) {
  localConfig.value = { ...localConfig.value, language: lang }

  // Preview inmediato
  ;(
    store.i18n ??
    (window as any).__i18n__?.global ??
    { locale: { value: lang } }
  ).locale.value = lang

  import('@/plugins/i18n').then((m) => {
    m.i18n.global.locale.value = lang as any
  })
}

// ── Sección 2 — Tema global ───────────────────────────────────────────────────
type TokenDef = {
  key: keyof ThemeColors
  labelKey: string
  descKey: string
}

const TOKEN_DEFS: TokenDef[] = [
  {
    key: 'primary',
    labelKey: 'settings.appearance.theme.primary',
    descKey: 'settings.appearance.theme.primary_desc',
  },
  {
    key: 'secondary',
    labelKey: 'settings.appearance.theme.secondary',
    descKey: 'settings.appearance.theme.secondary_desc',
  },
  {
    key: 'accent',
    labelKey: 'settings.appearance.theme.accent',
    descKey: 'settings.appearance.theme.accent_desc',
  },
  {
    key: 'danger',
    labelKey: 'settings.appearance.theme.danger',
    descKey: 'settings.appearance.theme.danger_desc',
  },
  {
    key: 'background',
    labelKey: 'settings.appearance.theme.background',
    descKey: 'settings.appearance.theme.background_desc',
  },
  {
    key: 'surface',
    labelKey: 'settings.appearance.theme.surface',
    descKey: 'settings.appearance.theme.surface_desc',
  },
  {
    key: 'textPrimary',
    labelKey: 'settings.appearance.theme.textPrimary',
    descKey: 'settings.appearance.theme.textPrimary_desc',
  },
  {
    key: 'textMuted',
    labelKey: 'settings.appearance.theme.textMuted',
    descKey: 'settings.appearance.theme.textMuted_desc',
  },
  {
    key: 'border',
    labelKey: 'settings.appearance.theme.border',
    descKey: 'settings.appearance.theme.border_desc',
  },
]

const hexErrors = ref<Partial<Record<keyof ThemeColors, boolean>>>({})
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

function onGlobalColorChange(token: keyof ThemeColors, value: string) {
  localConfig.value = {
    ...localConfig.value,
    globalTheme: {
      ...localConfig.value.globalTheme,
      [token]: value,
    },
  }

  if (HEX_RE.test(value)) {
    hexErrors.value = { ...hexErrors.value, [token]: false }
    store.applyTheme(localConfig.value.globalTheme)
  } else {
    hexErrors.value = { ...hexErrors.value, [token]: true }
  }
}

function resetGlobalTheme() {
  localConfig.value = {
    ...localConfig.value,
    globalTheme: { ...DEFAULT_THEME },
  }
  hexErrors.value = {}
  store.applyTheme(localConfig.value.globalTheme)
}

// ── Sección 3 — Temas por vista ───────────────────────────────────────────────
const VIEW_TABS: { key: ViewKey; labelKey: string }[] = [
  { key: 'dashboard', labelKey: 'settings.appearance.views.dashboard' },
  { key: 'calendar', labelKey: 'settings.appearance.views.calendar' },
  { key: 'nutrition', labelKey: 'settings.appearance.views.nutrition' },
  { key: 'training', labelKey: 'settings.appearance.views.training' },
  { key: 'metrics', labelKey: 'settings.appearance.views.metrics' },
  { key: 'settings', labelKey: 'nav.client.settings' },
]

const VIEW_TOKENS: (keyof ThemeColors)[] = [
  'primary',
  'secondary',
  'background',
  'surface',
]

const activeViewTab = ref<ViewKey>('dashboard')

const activeOverrides = computed(
  () => Object.keys(localConfig.value.viewThemes).length
)

function isViewCustomized(vk: ViewKey): boolean {
  return vk in localConfig.value.viewThemes
}

function toggleView(vk: ViewKey) {
  const views = { ...localConfig.value.viewThemes }

  if (isViewCustomized(vk)) {
    delete views[vk]
  } else {
    views[vk] = {
      primary: localConfig.value.globalTheme.primary,
      secondary: localConfig.value.globalTheme.secondary,
      background: localConfig.value.globalTheme.background,
      surface: localConfig.value.globalTheme.surface,
    }
  }

  localConfig.value = {
    ...localConfig.value,
    viewThemes: views,
  }
}

function onViewColorChange(
  vk: ViewKey,
  token: keyof ThemeColors,
  value: string
) {
  if (!HEX_RE.test(value)) return

  const views = { ...localConfig.value.viewThemes }
  views[vk] = { ...views[vk], [token]: value }

  localConfig.value = {
    ...localConfig.value,
    viewThemes: views,
  }
}

// ── Sección 4 — Densidad ──────────────────────────────────────────────────────
const DENSITIES: { key: Density }[] = [
  { key: 'compact' },
  { key: 'normal' },
  { key: 'comfortable' },
]

function selectDensity(d: Density) {
  localConfig.value = { ...localConfig.value, density: d }

  // Preview inmediato de la clase de densidad
  const root = document.documentElement
  root.classList.remove(
    'density-compact',
    'density-normal',
    'density-comfortable'
  )
  root.classList.add(`density-${d}`)
}

// ── Guardar / Restablecer ─────────────────────────────────────────────────────
async function save() {
  const anyHexError = Object.values(hexErrors.value).some(Boolean)

  if (anyHexError) {
    toast.error(t('settings.appearance.theme.invalid_hex'))
    return
  }

  saving.value = true

  try {
    await store.saveConfig(localConfig.value)
    
    toast.success(t('settings.appearance.save_success'))
  } catch {
    toast.error(t('settings.appearance.save_error'))
    // Revertir preview
    store.applyTheme()
  } finally {
    saving.value = false
  }
}

function resetAll() {
  if (!confirm('¿Restablecer toda la configuración a los valores por defecto?')) {
    return
  }

  localConfig.value = cloneAppearanceConfig(DEFAULT_CONFIG)
  hexErrors.value = {}
  store.applyTheme(localConfig.value.globalTheme)
}

// ── Guard: salir sin guardar ──────────────────────────────────────────────────
onBeforeRouteLeave((_to, _from, next) => {
  if (!hasChanges.value) return next()

  const ok = confirm('Tienes cambios sin guardar. ¿Salir de todas formas?')

  if (ok) {
    // Revertir preview al config guardado
    store.applyTheme()
    next()
  } else {
    next(false)
  }
})
</script>

<template>
  <div class="flex h-full flex-col">

    <!-- ── Sticky header ──────────────────────────────────────────────────── -->
    <header class="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3 shadow-sm sm:px-6">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Volver"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-base font-semibold text-foreground sm:text-lg">
          {{ t('settings.appearance.title') }}
        </h1>
        <span
          v-if="hasChanges"
          class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
        >
          • Sin guardar
        </span>
      </div>
      <button
        @click="save"
        :disabled="!hasChanges || saving"
        class="hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:inline-flex"
      >
        {{ saving ? '...' : t('settings.appearance.save') }}
      </button>
    </header>

    <!-- ── Main layout: nav + panel ─────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Nav izquierda -->
      <nav class="hidden w-52 shrink-0 flex-col border-r bg-card p-3 sm:flex">
        <button
          v-for="item in navItems"
          :key="item.key"
          @click="activeSection = item.key"
          :class="[
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left',
            activeSection === item.key
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          ]"
        >
          <span class="text-base">{{ item.icon }}</span>
          {{ t(item.labelKey) }}
        </button>
      </nav>

      <!-- Navegación móvil vertical (arriba) -->
      <div class="w-full border-b bg-card p-2 sm:hidden">
        <button
          v-for="item in navItems"
          :key="item.key"
          @click="activeSection = item.key"
          :class="[
            'mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors last:mb-0',
            activeSection === item.key
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground'
          ]"
        >
          <span class="text-base">{{ item.icon }}</span>
          <span class="truncate">{{ t(item.labelKey) }}</span>
        </button>
      </div>

      <!-- Panel derecho -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">

        <!-- ── Idioma ─────────────────────────────────────────────────── -->
        <section v-if="activeSection === 'language'" class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-foreground">
              {{ t('settings.appearance.language.title') }}
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {{ t('settings.appearance.language.subtitle') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="lang in LANGUAGES"
              :key="lang.key"
              @click="selectLanguage(lang.key)"
              :class="[
                'flex items-center gap-3 rounded-xl border px-6 py-4 text-sm font-medium transition-all',
                localConfig.language === lang.key
                  ? 'border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10 text-[var(--color-primary,#6366f1)] ring-2 ring-[var(--color-primary,#6366f1)]/30'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              ]"
            >
              <span class="text-2xl">{{ lang.flag }}</span>
              <span>{{ t(`settings.appearance.language.${lang.key}`) }}</span>
            </button>
          </div>
        </section>

        <!-- ── Tema global ────────────────────────────────────────────── -->
        <section v-else-if="activeSection === 'global'" class="space-y-6">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-foreground">
                {{ t('settings.appearance.theme.title') }}
              </h2>
              <p class="text-sm text-muted-foreground mt-1">
                {{ t('settings.appearance.theme.subtitle') }}
              </p>
            </div>
            <button
              @click="resetGlobalTheme"
              class="shrink-0 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {{ t('settings.appearance.theme.reset_defaults') }}
            </button>
          </div>

          <!-- Preview card -->
          <div
            class="rounded-xl border p-4"
            :style="{
              background:   localConfig.globalTheme.background,
              borderColor:  localConfig.globalTheme.border,
            }"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium" :style="{ color: localConfig.globalTheme.textPrimary }">
                Preview
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :style="{ background: localConfig.globalTheme.secondary + '22', color: localConfig.globalTheme.secondary }"
              >
                Badge
              </span>
            </div>
            <div
              class="rounded-lg p-3 mb-3"
              :style="{ background: localConfig.globalTheme.surface, borderColor: localConfig.globalTheme.border, border: '1px solid' }"
            >
              <div class="h-2 w-3/4 rounded mb-2" :style="{ background: localConfig.globalTheme.textMuted + '44' }" />
              <div class="h-2 w-1/2 rounded"      :style="{ background: localConfig.globalTheme.textMuted + '22' }" />
            </div>
            <div class="flex gap-2">
              <button
                class="rounded-lg px-3 py-1.5 text-xs font-medium"
                :style="{ background: localConfig.globalTheme.primary, color: '#fff' }"
              >
                Primario
              </button>
              <button
                class="rounded-lg px-3 py-1.5 text-xs font-medium border"
                :style="{ color: localConfig.globalTheme.primary, borderColor: localConfig.globalTheme.border }"
              >
                Secundario
              </button>
            </div>
          </div>

          <!-- Color pickers -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-for="def in TOKEN_DEFS" :key="def.key" class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">
                {{ t(def.labelKey) }}
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  :value="localConfig.globalTheme[def.key]"
                  @input="onGlobalColorChange(def.key, ($event.target as HTMLInputElement).value)"
                  class="h-9 w-10 cursor-pointer rounded-lg border border-border bg-background p-0.5"
                />
                <input
                  type="text"
                  :value="localConfig.globalTheme[def.key]"
                  @input="onGlobalColorChange(def.key, ($event.target as HTMLInputElement).value)"
                  maxlength="7"
                  placeholder="#000000"
                  :class="[
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2',
                    hexErrors[def.key]
                      ? 'border-destructive bg-destructive/5 text-destructive focus:ring-destructive'
                      : 'border-border bg-background text-foreground focus:ring-primary'
                  ]"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- ── Temas por vista ────────────────────────────────────────── -->
        <section v-else-if="activeSection === 'views'" class="space-y-6">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-foreground">
                {{ t('settings.appearance.views.title') }}
              </h2>
              <p class="text-sm text-muted-foreground mt-1">
                {{ t('settings.appearance.views.subtitle') }}
              </p>
            </div>
            <span
              v-if="activeOverrides > 0"
              class="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
            >
              {{ activeOverrides }}
            </span>
          </div>

          <!-- Tabs -->
          <div class="flex overflow-x-auto rounded-xl border bg-muted/50 p-1 gap-1">
            <button
              v-for="tab in VIEW_TABS"
              :key="tab.key"
              @click="activeViewTab = tab.key"
              :class="[
                'relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                activeViewTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              {{ t(tab.labelKey) }}
              <span
                v-if="isViewCustomized(tab.key)"
                class="h-1.5 w-1.5 rounded-full bg-primary"
              />
            </button>
          </div>

          <!-- Contenido del tab activo -->
          <div class="rounded-xl border bg-card p-5">
            <div class="flex items-center justify-between mb-5">
              <div>
                <p class="font-medium text-foreground">{{ t('settings.appearance.views.customize_toggle') }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">{{ t(`settings.appearance.views.${activeViewTab}`) }}</p>
              </div>
              <button
                @click="toggleView(activeViewTab)"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isViewCustomized(activeViewTab) ? 'bg-primary' : 'bg-muted'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    isViewCustomized(activeViewTab) ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>

            <div v-if="isViewCustomized(activeViewTab)" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div v-for="token in VIEW_TOKENS" :key="token" class="space-y-1.5">
                <label class="text-sm font-medium text-foreground">
                  {{ t(`settings.appearance.theme.${token}`) }}
                </label>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    :value="localConfig.viewThemes[activeViewTab]?.[token] ?? localConfig.globalTheme[token]"
                    @input="onViewColorChange(activeViewTab, token, ($event.target as HTMLInputElement).value)"
                    class="h-9 w-10 cursor-pointer rounded-lg border border-border bg-background p-0.5"
                  />
                  <input
                    type="text"
                    :value="localConfig.viewThemes[activeViewTab]?.[token] ?? localConfig.globalTheme[token]"
                    @input="onViewColorChange(activeViewTab, token, ($event.target as HTMLInputElement).value)"
                    maxlength="7"
                    class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">
              Activa la personalización para modificar los colores de esta vista independientemente del tema global.
            </p>
          </div>
        </section>

        <!-- ── Densidad ───────────────────────────────────────────────── -->
        <section v-else-if="activeSection === 'density'" class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-foreground">
              {{ t('settings.appearance.density.title') }}
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {{ t('settings.appearance.density.subtitle') }}
            </p>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              v-for="d in DENSITIES"
              :key="d.key"
              @click="selectDensity(d.key)"
              :class="[
                'flex flex-col items-center gap-4 rounded-xl border p-5 transition-all text-left',
                localConfig.density === d.key
                  ? 'border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/5 ring-2 ring-[var(--color-primary,#6366f1)]/30'
                  : 'border-border bg-background hover:bg-muted'
              ]"
            >
              <!-- Visual preview de spacing -->
              <div class="w-full space-y-2">
                <div
                  v-for="i in 3"
                  :key="i"
                  class="rounded bg-muted"
                  :style="{
                    height: d.key === 'compact' ? '6px' : d.key === 'normal' ? '10px' : '14px',
                    width: i === 1 ? '100%' : i === 2 ? '75%' : '50%',
                  }"
                />
              </div>
              <div>
                <p class="font-medium text-foreground text-sm">
                  {{ t(`settings.appearance.density.${d.key}`) }}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {{ t(`settings.appearance.density.${d.key}_desc`) }}
                </p>
              </div>
            </button>
          </div>
        </section>

      </main>
    </div>

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <footer class="sticky bottom-0 z-10 flex flex-col gap-2 border-t bg-card px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-3">
      <button
        @click="resetAll"
        class="w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:w-auto"
      >
        {{ t('settings.appearance.reset_all') }}
      </button>
      <button
        @click="save"
        :disabled="!hasChanges || saving"
        class="w-full rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
      >
        {{ saving ? '...' : t('settings.appearance.save') }}
      </button>
    </footer>

  </div>
</template>
