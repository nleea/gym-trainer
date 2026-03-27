export interface DailyWellness {
  id: string
  clientId: string
  date: string           // "YYYY-MM-DD"
  energy: number         // 1-5
  sleepQuality: number   // 1-5
  muscleFatigue: number  // 1-5
  notes: string | null
  createdAt: string
}
