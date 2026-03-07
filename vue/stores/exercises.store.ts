import { defineStore } from 'pinia'
import type { ExerciseItem } from '../repo/exercisesRepo'
import {
  favoriteExercise,
  getBodyParts,
  getEquipmentList,
  getFavorites,
  listExercises,
  searchExercises as searchExercisesRepo,
  syncExercises as syncExercisesRepo,
  unfavoriteExercise,
} from '../repo/exercisesRepo'

type ExerciseFilters = {
  body_part?: string
  equipment?: string
  q?: string
  favorites_only?: boolean
  user_id?: string
}

const PAGE_SIZE = 20

export const useExercisesStore = defineStore('exercises', {
  state: () => ({
    exercises: [] as ExerciseItem[],
    favorites: [] as ExerciseItem[],
    bodyParts: [] as string[],
    equipment: [] as string[],
    loading: false,
    totalCount: 0,
    currentPage: 0,
    hasMore: true,
    lastFilters: {} as ExerciseFilters,
  }),

  actions: {
    async loadExercises(filters: ExerciseFilters = {}, reset = true) {
      this.loading = true
      try {
        const page = reset ? 0 : this.currentPage + 1
        const offset = page * PAGE_SIZE
        const res = await listExercises({
          ...filters,
          limit: PAGE_SIZE,
          offset,
        })
        this.lastFilters = { ...filters }
        this.totalCount = res.total
        this.currentPage = page
        this.hasMore = offset + res.items.length < res.total
        this.exercises = reset ? res.items : [...this.exercises, ...res.items]
      } finally {
        this.loading = false
      }
    },

    async searchExercises(query: string) {
      this.loading = true
      try {
        const list = await searchExercisesRepo(query, PAGE_SIZE)
        this.exercises = list
        this.totalCount = list.length
        this.currentPage = 0
        this.hasMore = false
      } finally {
        this.loading = false
      }
    },

    async loadFilters() {
      const [bodyParts, equipment] = await Promise.all([
        getBodyParts(),
        getEquipmentList(),
      ])
      this.bodyParts = bodyParts
      this.equipment = equipment
    },

    async toggleFavorite(exerciseId: string, userId?: string) {
      const target = this.exercises.find((e) => e.id === exerciseId)
      const current = Boolean(target?.isFavorite)
      if (current) {
        await unfavoriteExercise(exerciseId)
      } else {
        await favoriteExercise(exerciseId)
      }
      this.exercises = this.exercises.map((e) =>
        e.id === exerciseId ? { ...e, isFavorite: !current } : e,
      )
      await this.loadFavorites(userId)
    },

    async loadFavorites(userId?: string) {
      this.favorites = await getFavorites(userId)
    },

    async syncExercises() {
      return syncExercisesRepo()
    },
  },
})
