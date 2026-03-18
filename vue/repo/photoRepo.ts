import { api, getToken } from '../api'
import type { Photo, PhotoTimeline, PhotoType } from '../types/photo.types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface RawPhoto {
  id: string
  client_id: string
  uploaded_by: string
  type: PhotoType
  url: string
  notes?: string
  taken_at: string
  created_at: string
}

interface RawPhotoGroup {
  date: string
  photos?: RawPhoto[]
}

interface RawPhotoTimeline {
  type: PhotoType
  groups?: RawPhotoGroup[]
}

function fromResponse(raw: RawPhoto): Photo {
  return {
    id:         raw.id,
    clientId:   raw.client_id,
    uploadedBy: raw.uploaded_by,
    type:       raw.type,
    url:        raw.url,
    notes:      raw.notes ?? undefined,
    takenAt:    raw.taken_at,
    createdAt:  raw.created_at,
  }
}

function fromTimeline(raw: RawPhotoTimeline): PhotoTimeline {
  return {
    type:   raw.type,
    groups: (raw.groups ?? []).map((g: RawPhotoGroup) => ({
      date:   g.date,
      photos: (g.photos ?? []).map(fromResponse),
    })),
  }
}

export const photoRepo = {
  async getTimeline(clientId: string, type: PhotoType): Promise<PhotoTimeline> {
    const raw = await api.get<RawPhotoTimeline>(`/photos/${clientId}/timeline/${type}`)
    return fromTimeline(raw)
  },

  async upload(
    clientId: string,
    file: File,
    type: PhotoType,
    takenAt: string,
    notes?: string,
  ): Promise<Photo> {
    // Step 1: get presigned PUT URL (same pattern as uploadMetricPhotoToR2)
    const signed = await api.post<{ r2_key: string; upload_url: string; expires_in: number }>(
      `/photos/${clientId}/upload-url`,
      { file_name: file.name, content_type: file.type, file_size: file.size },
    )

    // Step 2: PUT file directly to R2
    const uploadRes = await fetch(signed.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!uploadRes.ok) throw new Error('No se pudo subir la imagen a R2')

    // Step 3: save the photo record in our DB
    const raw = await api.post<RawPhoto>(`/photos/${clientId}/record`, {
      r2_key:   signed.r2_key,
      type,
      taken_at: takenAt,
      notes:    notes ?? null,
    })
    return fromResponse(raw)
  },

  async delete(photoId: string): Promise<void> {
    const token = getToken()
    const res = await fetch(`${BASE_URL}/photos/${photoId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>
      throw new Error((err?.detail as string) ?? `Error ${res.status}`)
    }
  },
}
