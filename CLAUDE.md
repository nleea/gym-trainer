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


## 1. Plan Node Default 
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions) 
- If something goes sideways, STOP and re-plan immediately 
- don't keep pushing - Use plan mode for verification steps, not just building 
- Write detailed specs upfront to reduce ambiguity 
--- 
### 2. Subagent Strategy 
- Use subagents liberally to keep main context window clean 
- Offload research, exploration, and parallel analysis to subagents 
- For complex problems, throw more compute at it via subagents 
- One task per subagent for focused execution 
--- 
### 3. Self-Improvement Loop 
- After ANY correction from the user: update `tasks/lessons.md` with the pattern 
- Write rules for yourself that prevent the same mistake 
- Ruthlessly iterate on these lessons until mistake rate drops 
- Review lessons at session start for relevant project 
--- 
### 4. Verification Before Done 
- Never mark a task complete without proving it works 
- Diff behavior between main and your changes when relevant 
- Ask yourself: "Would a staff engineer approve this?" 
- Run tests, check logs, demonstrate correctness 
--- 
### 5. Demand Elegance (Balanced) 
- For non-trivial changes: pause and ask "is there a more elegant way?" 
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution" 
- Skip this for simple, obvious fixes 
- don't over-engineer 
- Challenge your own work before presenting it 
--- 
### 6. Autonomous Bug Fixing 
- When given a bug report: just fix it. Don't ask for hand-holding 
- Point at logs, errors, failing tests 
- then resolve them 
- Zero context switching required from the user 
- Go fix failing CI tests without being told how 
--- 
## Task Management 
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items 
2. **Verify Plan**: Check in before starting implementation 
3. **Track Progress**: Mark items complete as you go 
4. **Explain Changes**: High-level summary at each step 
5. **Document Results**: Add review section to `tasks/todo.md` 
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections 
---
 ## Core Principles 
- **Simplicity First**: Make every change as simple as possible. Impact minimal code 
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards