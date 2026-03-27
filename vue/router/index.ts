import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useConfigStore } from '../stores/config.store'
import { getToken } from '../api'

// Layouts
import AuthLayout from '../layouts/AuthLayout.vue'
import TrainerLayout from '../layouts/TrainerLayout.vue'
import ClientLayout from '../layouts/ClientLayout.vue'

// Auth Views
import LoginView from '../views/auth/LoginView.vue'
import RegisterView from '../views/auth/RegisterView.vue'

// Trainer Views
import TrainerDashboard from '../views/trainer/DashboardView.vue'
import ClientsListView from '../views/trainer/ClientsListView.vue'
import ClientProfileView from '../views/trainer/ClientProfileView.vue'
import CreateTrainingPlanView from '../views/trainer/CreateTrainingPlanView.vue'
import TrainingTemplatePage from '../components/TrainingTemplatePage.vue'

import CreateNutritionPlanView from '../views/trainer/CreateNutritionPlanView.vue'
import NutritionPlanEditor from '../views/trainer/NutritionPlanEditor.vue'
import ReportsView from '../views/trainer/ReportsView.vue'
import TrainerSettingsView from '../views/trainer/SettingsView.vue'
import TemplatesManagementView from '../views/trainer/TemplatesManagementView.vue'

// Client Views
import ClientDashboard from '../views/client/DashboardView.vue'
import TrainingView from '../views/client/TrainingView.vue'
import NutritionView from '../views/client/NutritionView.vue'
import LogWorkoutView from '../views/client/LogWorkoutView.vue'
import ProgressView from '../views/client/ProgressView.vue'
import ClientSettingsView from '../views/client/SettingsView.vue'
import AppearanceSettings from '../views/settings/AppearanceSettings.vue'
import MetricsView from '../views/client/MetricsView.vue'
import WeeklyCheckinView from '../views/client/WeeklyCheckinView.vue'
import AchievementsView from '../views/client/AchievementsView.vue'
import DailyWellnessView from '../views/client/DailyWellnessView.vue'
import ExerciseLibraryView from '../views/shared/ExerciseLibraryView.vue'


type Role = 'trainer' | 'client'

function getUserFromStorage(): null | { role: Role } {
  try {
    const user = localStorage.getItem('auth_user')
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

function getSessionFromStorage(): null | { role: Role } {
  const token = getToken()
  const user = getUserFromStorage()

  if (!token || !user) return null
  return user
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/auth/login'
  },
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      { path: 'login', name: 'login', component: LoginView },
      { path: 'register', name: 'register', component: RegisterView }
    ]
  },
  {
    path: '/trainer',
    component: TrainerLayout,
    meta: { requiresAuth: true, role: 'trainer' as Role },
    children: [
      { path: '', name: 'trainer-dashboard', component: TrainerDashboard },
      { path: 'clients', name: 'clients-list', component: ClientsListView },
      { path: 'clients/:id', name: 'client-profile', component: ClientProfileView },
      { path: 'plans/training/new', name: 'create-training-plan', component: CreateTrainingPlanView },
      { path: 'plans/training/:clientId/:id', name: 'edit-training-plan-client', component: CreateTrainingPlanView },
      { path: 'plans/training/:id', name: 'edit-training-plan', component: TrainingTemplatePage },
      { path: 'plans/templates', name: 'templates-management', component: TemplatesManagementView },
      { path: 'plans/nutrition/new', name: 'create-nutrition-plan', component: NutritionPlanEditor },
      { path: 'plans/nutrition/:id/edit', name: 'edit-nutrition-plan', component: NutritionPlanEditor },
      { path: 'plans/nutrition/:clientId/:id', name: 'edit-nutrition-plan-client', component: CreateNutritionPlanView },
      { path: 'reports', name: 'reports', component: ReportsView },
      { path: 'settings', name: 'trainer-settings', component: TrainerSettingsView },
      { path: 'settings/appearance', name: 'trainer-appearance', component: AppearanceSettings }
    ]
  },
  {
    path: '/exercises',
    name: 'exercise-library',
    component: ExerciseLibraryView,
    meta: { requiresAuth: true },
  },
  {
    path: '/client',
    component: ClientLayout,
    meta: { requiresAuth: true, role: 'client' as Role },
    children: [
      { path: '', name: 'client-dashboard', component: ClientDashboard, meta: { viewTheme: 'dashboard' } },
      { path: 'calendar', name: 'calendar', component: TrainingView, meta: { viewTheme: 'calendar' } },
      { path: 'nutrition', name: 'nutrition', component: NutritionView, meta: { viewTheme: 'nutrition' } },
      { path: 'daily-log', name: 'log-workout', component: LogWorkoutView, meta: { viewTheme: 'training' } },
      { path: 'progress', name: 'progress', component: ProgressView, meta: { viewTheme: 'progress' } },
      { path: 'metrics', name: 'metrics', component: MetricsView, meta: { viewTheme: 'metrics' } },
      { path: 'settings', name: 'client-settings', component: ClientSettingsView, meta: { viewTheme: 'settings' } },
      { path: 'settings/appearance', name: 'client-appearance', component: AppearanceSettings, meta: { viewTheme: 'settings' } },
      { path: 'weekly-checkin', name: 'weekly-checkin', component: WeeklyCheckinView },
      { path: 'achievements', name: 'achievements', component: AchievementsView, meta: { viewTheme: 'achievements' } },
      { path: 'wellness', name: 'daily-wellness', component: DailyWellnessView },

    ]
  },

  // 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/auth/login'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Flag para cargar config una sola vez por sesión
let configLoaded = false

// Guard (Vue Router 4)
router.beforeEach(async (to) => {
  const user = getSessionFromStorage()

  const requiresAuth = Boolean(to.meta.requiresAuth)
  const requiredRole = to.meta.role as Role | undefined

  // Si no está logueado y la ruta requiere auth
  if (requiresAuth && !user) {
    configLoaded = false
    return { path: '/auth/login' }
  }

  // Si está logueado y entra a auth, lo mandamos a su dashboard
  if (to.path.startsWith('/auth') && user) {
    return user.role === 'trainer' ? { path: '/trainer' } : { path: '/client' }
  }

  // Si la ruta pide rol y no coincide
  if (requiredRole && user?.role !== requiredRole) {
    return user?.role === 'trainer' ? { path: '/trainer' } : { path: '/client' }
  }

  // Cargar config la primera vez que se navega a una ruta protegida
  if (user && requiresAuth && !configLoaded) {
    configLoaded = true
    const configStore = useConfigStore()
    await configStore.fetchConfig()
  }

  return true
})

export default router
