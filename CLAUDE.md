# gym-trainer-client

Vue 3 + TypeScript SPA (PWA). Frontend del sistema gym-trainer.

See `AGENTS.md` for the full agent workflow and MCP protocol.

---

## Stack

- Vue 3 + TypeScript + Vite
- Pinia (state management)
- TailwindCSS v4 con CSS custom properties (`--primary`, `--background`, `--foreground`, etc.)
- vue-i18n@9 (`vue/plugins/i18n.ts`)
- JWT en localStorage: `access_token`, `auth_user`
- Backend: FastAPI REST via `VITE_API_URL`

## Path alias

`@` → `./vue`

## Key directories

```
vue/
  api.ts          # axios instance con interceptores JWT
  components/     # componentes reutilizables
  composables/    # lógica reutilizable (useTheme, etc.)
  config/         # defaults y constantes
  locales/        # es.json, en.json, pt.json
  plugins/        # i18n, etc.
  repo/           # capa de acceso a API (userConfig.repo.ts, etc.)
  router/         # vue-router, guards de auth y config
  stores/         # Pinia stores (auth, config, etc.)
  types/          # TypeScript interfaces
  views/          # páginas por rol (client/, trainer/, settings/)
```

## Patterns

- **Repo layer**: `vue/repo/*.repo.ts` habla con la API. No hacer fetch directo en components ni stores.
- **Store**: Pinia con `defineStore`. Llama a repos, nunca a API directamente.
- **Composables**: lógica de UI reutilizable. Sin side effects de negocio.
- **i18n**: todo texto visible al usuario debe usar `t('key')`. Keys en `locales/*.json`.

## CSS / Theme

- TailwindCSS v4 — usar utilities de Tailwind, no CSS inline.
- Variables de tema via `--primary`, `--background`, etc. definidas en `styles/globals.css`.
- Density: clases `.density-compact`, `.density-normal`, `.density-comfortable` en el root.
- No hardcodear colores hex en componentes — usar variables CSS.

## Naming

- Componentes: PascalCase (`TrainingCard.vue`)
- Composables: camelCase con prefijo `use` (`useTheme.ts`)
- Stores: camelCase con sufijo `Store` (`configStore`)
- Repos: camelCase con sufijo `Repo` (`userConfigRepo`)

## snake_case ↔ camelCase

La API devuelve snake_case. La conversión ocurre en `vue/repo/*.repo.ts`.
No convertir en stores ni components.

## Do NOT

- No usar `v0-gym-trainer-app` — está obsoleto.
- No hacer `fetch()` o `axios` directamente en componentes.
- No duplicar lógica de negocio que ya está en un store o composable.
- No añadir colores fuera del sistema de variables CSS.

## Skills

Run `ls .claude/skills/` or check `.agents/skills/` to see if any installed skill is relevant to this task. If so, read it and apply its guidelines.