import { defineStore } from 'pinia'
import { ref } from 'vue'
import { photoRepo } from '../repo/photoRepo'
import type { PhotoTimeline, PhotoType } from '../types/photo.types'

export const usePhotoStore = defineStore('photos', () => {
  const timelines = ref<Record<string, PhotoTimeline>>({})
  const loading   = ref<Record<string, boolean>>({})
  const error     = ref<string | null>(null)

  function key(clientId: string, type: PhotoType) {
    return `${clientId}:${type}`
  }

  async function fetchTimeline(clientId: string, type: PhotoType) {
    const k = key(clientId, type)
    loading.value[k] = true
    error.value = null
    try {
      timelines.value[k] = await photoRepo.getTimeline(clientId, type)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value[k] = false
    }
  }

  async function uploadPhoto(
    clientId: string,
    file: File,
    type: PhotoType,
    takenAt: string,
    notes?: string,
  ) {
    const photo = await photoRepo.upload(clientId, file, type, takenAt, notes)
    // Invalidate cache so next fetch is fresh
    const k = key(clientId, type)
    delete timelines.value[k]
    return photo
  }

  async function deletePhoto(clientId: string, type: PhotoType, photoId: string) {
    await photoRepo.delete(photoId)
    const k = key(clientId, type)
    const tl = timelines.value[k]
    if (tl) {
      tl.groups = tl.groups
        .map(g => ({ ...g, photos: g.photos.filter(p => p.id !== photoId) }))
        .filter(g => g.photos.length > 0)
    }
  }

  function getTimeline(clientId: string, type: PhotoType): PhotoTimeline | null {
    return timelines.value[key(clientId, type)] ?? null
  }

  function isLoading(clientId: string, type: PhotoType): boolean {
    return loading.value[key(clientId, type)] ?? false
  }

  return { fetchTimeline, uploadPhoto, deletePhoto, getTimeline, isLoading, error }
})
