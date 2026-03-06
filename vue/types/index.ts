// User types
export interface User {
  id?: string
  email: string
  name: string
  role: 'trainer' | 'client'
  avatar?: string
  phone?: string
  createdAt: Date
}

export interface Client extends User {
  role: 'client'
  trainerId: string
  status: 'active' | 'inactive'
  startDate: Date
  goals?: string
  notes?: string
  weight?: number
  height?: number
  age?: number
  planId?: string
  nutritionplanId?: string
}

// Attendance
export interface Attendance {
  id?: string
  clientId: string
  date: Date
  attended: boolean
  notes?: string
}

// Training
export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  sets: number
  reps: string
  weight?: number
  rest?: string
  notes?: string
  videoUrl?: string
}

export interface TrainingDay {
  day: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
  exercises: Exercise[]
  notes?: string
}

export interface TrainingWeek {
  weekNumber: number
  days: TrainingDay[]
}

export interface TrainingPlan {
  id?: string
  name: string
  description?: string
  weeks: TrainingWeek[]
  createdAt: Date
  updatedAt: Date
  startDate?: any
}

export interface AssignedTrainingPlan {
  id: string
  planId: string
  clientId: string
  startDate: Date
  endDate: Date
  status: 'active' | 'completed' | 'cancelled'
}

// Training Log
export interface ExerciseLog {
  exerciseId: string
  exerciseName: string
  sets: {
    reps: number
    weight: number
    rpe?: number
    completed: boolean
  }[]
  notes?: string
}

export interface TrainingLog {
  id?: string
  clientId: string
  date: Date
  exercises: ExerciseLog[]
  duration?: number
  notes?: string
  effort?: number,
  name?: string
  createdAt?: string
  trainerId: string
}

// Nutrition
export type MealType = "desayuno" | "almuerzo" | "cena" | "snack";
export interface Meal {
  id?: string
  type: MealType
  name: string
  description?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  ingredients?: string[]
  date: any;
  createdAt?: any;
}

export interface NutritionDay {
  day: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
  meals: Meal[]
}

export interface NutritionWeek {
  weekNumber: number
  days: NutritionDay[]
}

export interface NutritionPlan {
  id?: string
  name?: string
  description?: string
  targetCalories?: number
  targetProtein?: number
  targetCarbs?: number
  targetFat?: number
  days: NutritionDay[]
  weeks?: NutritionWeek[]
  recommendedFoods?: string[]
  forbiddenFoods?: string[]
  createdAt: Date
  updatedAt: Date
  guidelines?: Array<any>
}

export interface AssignedNutritionPlan {
  id: string
  planId: string
  clientId: string
  startDate: Date
  endDate: Date
  status: 'active' | 'completed' | 'cancelled'
}

// Meal Log
export interface MealLog {
  id?: string
  clientId?: string
  mealId?: string
  name?: string
  mealKey?: string
  date: Date
  type: MealType
  description: string
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
  photo?: string
  registered?: boolean
  trainerId: string
}

// Daily Diary
export interface DailyDiary {
  id: string
  clientId: string
  date: Date
  mood: 1 | 2 | 3 | 4 | 5
  energy: 1 | 2 | 3 | 4 | 5
  sleep: number
  stress: 1 | 2 | 3 | 4 | 5
  notes?: string
  discomforts?: string
}

// Progress

export type ProgressType =
  | "weight"
  | "measurement"
  | "photo"
  | "note"
  | "custom";

export interface BodyMeasurements {
  chest?: number
  waist?: number
  hips?: number
  arm?: number
  leg?: number
}

export interface ProgressEntry {
  id?: string
  clientId: string
  type: ProgressType

  // fecha del progreso (no createdAt)
  date: Date

  // peso principal (opcional)
  weight?: number

  // medidas corporales
  measurements?: BodyMeasurements

  meta?: Record<string, number | string>

  bodyFat?: number
  createdAt?: Date
  photos?: string[]
  notes?: string
}


export type BodyMetricsEntry = {
  id?: string
  clientId: string
  date: any // ideal Date ya normalizado

  // --- composición ---
  weightKg?: number | null
  bodyFatPct?: number | null
  musclePct?: number | null
  waterPct?: number | null
  visceralFat?: number | null

  boneMassKg?: number | null
  bmrKcal?: number | null

  // --- medidas (cm) torso ---
  neckCm?: number | null
  shouldersCm?: number | null
  chestCm?: number | null
  underChestCm?: number | null

  waistCm?: number | null         // cintura "natural"
  abdomenCm?: number | null       // ombligo (muy usado)
  hipsCm?: number | null          // cadera/glúteo

  // --- brazos (cm) ---
  armRelaxedLeftCm?: number | null
  armRelaxedRightCm?: number | null
  armFlexedLeftCm?: number | null
  armFlexedRightCm?: number | null
  forearmLeftCm?: number | null
  forearmRightCm?: number | null

  // --- piernas (cm) ---
  thighLeftCm?: number | null
  thighRightCm?: number | null
  calfLeftCm?: number | null
  calfRightCm?: number | null

  // --- extra ---
  heightCm?: number | null // útil para IMC (si no está fijo en el profile)
  notes?: string | null
  photos?: string[] | null

  measurementProtocol?: "navel" | "natural_waist" | null
}

