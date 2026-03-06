// Script to help identify files that need import fixes
// All Vue files should use relative imports instead of @ alias

const filesToFix = [
  'vue/layouts/ClientLayout.vue',
  'vue/layouts/TrainerLayout.vue',
  'vue/views/auth/LoginView.vue',
  'vue/views/auth/RegisterView.vue',
  'vue/views/client/DashboardView.vue',
  'vue/views/client/LogWorkoutView.vue',
  'vue/views/client/NutritionView.vue',
  'vue/views/client/ProgressView.vue',
  'vue/views/client/SettingsView.vue',
  'vue/views/client/TrainingView.vue',
  'vue/views/trainer/ClientProfileView.vue',
  'vue/views/trainer/ClientsListView.vue',
  'vue/views/trainer/CreateNutritionPlanView.vue',
  'vue/views/trainer/CreateTrainingPlanView.vue',
  'vue/views/trainer/DashboardView.vue',
  'vue/views/trainer/ReportsView.vue',
  'vue/views/trainer/SettingsView.vue'
]

// Conversion rules:
// layouts/* -> from '@/stores/auth' to '../../stores/auth'
// views/auth/* -> from '@/stores/auth' to '../../stores/auth'
// views/client/* -> from '@/stores/auth' to '../../stores/auth'
// views/trainer/* -> from '@/stores/auth' to '../../stores/auth'

console.log('Files to fix:', filesToFix.length)
