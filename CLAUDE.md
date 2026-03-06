# CLAUDE.md — gym-trainer-client

## Skills
Before writing any code, read and apply these skills in order:
- ~/.agents/skills/code-documentation-code-explain/SKILL.md
- ~/.agents/skills/ui-ux-pro-max/SKILL.md
- ~/.agents/skills/web-design-guidelines/SKILL.md
- ~/.agents/skills/frontend-responsive-design-standards/SKILL.md
- ~/.agents/skills/responsive-designs/SKILL.md
- 

## Commands

- `npm run dev` — Start dev server (puerto por defecto Vite)
- `npm run build` — Production build (Vite)
- `npm run lint` — ESLint
- `npm run preview` — Preview production build

## Architecture

**Vue 3 + TypeScript SPA** conectada al backend FastAPI (trainerGM), configurada como PWA.

### Backend

El frontend se comunica exclusivamente con el backend FastAPI via REST HTTP.
Ver `/Users/nelsonborrego/Desktop/CO/ng2/trainerGM/` para el servidor.

### HTTP Client

`vue/api.ts` — cliente centralizado con fetch nativo. Maneja JWT automáticamente.
- Token almacenado en `localStorage` bajo `access_token`
- Usuario en `localStorage` bajo `auth_user`
- En 401 redirige a `/auth/login`

### Path Alias

`@` maps to `./vue` (configurado en `vite.config.ts`).

### Key Directories

- **`/vue`** — Código principal de la app
- **`/vue/api.ts`** — Cliente HTTP con JWT (reemplaza firebase.ts)
- **`/vue/views/`** — Vistas por rol: `auth/`, `trainer/`, `client/`
- **`/vue/stores/`** — Pinia stores: `auth`, `data`, `plan.store`, `clients.store`, `logs.store`, `metrics.store`, `attendance.store`
- **`/vue/repo/`** — Capa de acceso a datos (REST calls al backend)
- **`/vue/components/`** — Componentes Vue compartidos
- **`/vue/layouts/`** — Layouts por rol: `AuthLayout`, `TrainerLayout`, `ClientLayout`
- **`/vue/types/index.ts`** — Interfaces TypeScript del dominio

### Data Flow

Views → Pinia Stores → Repo layer (`/vue/repo/`) → FastAPI REST API

### Auth & Routing

JWT en localStorage. `useAuthStore.initAuthListener()` restaura la sesión al arrancar.
Routes protegidas por rol en `vue/router/index.ts`.

### API Endpoints (backend FastAPI)

| Dominio | Prefijo |
|---|---|
| Auth | `/auth` |
| Clients | `/clients` |
| Training Plans | `/training-plans` |
| Nutrition Plans | `/nutrition-plans` |
| Training Logs | `/training-logs` |
| Meal Logs | `/meal-logs` |
| Progress | `/progress` |
| Attendance | `/attendance` |
| Metrics | `/metrics` |

### Styling

TailwindCSS v4 con variables CSS para theming (light/dark). Colores oklch. Primary: verde, Accent: amarillo/naranja.

### PWA

Configurado via `vite-plugin-pwa` con Workbox.

## Environment Variables

```
VITE_API_URL=http://localhost:8000   # URL del backend FastAPI
```
