// vue/repo/metricsRepo.ts
import { api } from '../api'
import type { BodyMetricsEntry } from '../types'
import { toDate } from './fireRepo'
import { toYmdLocal } from '../../lib/utils'

function normalizeNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toPayload(entry: Omit<BodyMetricsEntry, 'id'>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    client_id: entry.clientId,
    date: entry.date instanceof Date
      ? toYmdLocal(entry.date)
      : (entry.date ?? toYmdLocal(new Date())),
    notes: entry.notes ?? null,
    photos: entry.photos ?? null,
    measurement_protocol: entry.measurementProtocol ?? null,
    weight_kg: normalizeNumber(entry.weightKg),
    body_fat_pct: normalizeNumber(entry.bodyFatPct),
    muscle_pct: normalizeNumber(entry.musclePct),
    water_pct: normalizeNumber(entry.waterPct),
    visceral_fat: normalizeNumber(entry.visceralFat),
    bone_mass_kg: normalizeNumber(entry.boneMassKg),
    bmr_kcal: normalizeNumber(entry.bmrKcal),
    neck_cm: normalizeNumber(entry.neckCm),
    shoulders_cm: normalizeNumber(entry.shouldersCm),
    chest_cm: normalizeNumber(entry.chestCm),
    under_chest_cm: normalizeNumber(entry.underChestCm),
    waist_cm: normalizeNumber(entry.waistCm),
    abdomen_cm: normalizeNumber(entry.abdomenCm),
    hips_cm: normalizeNumber(entry.hipsCm),
    arm_relaxed_left_cm: normalizeNumber(entry.armRelaxedLeftCm),
    arm_relaxed_right_cm: normalizeNumber(entry.armRelaxedRightCm),
    arm_flexed_left_cm: normalizeNumber(entry.armFlexedLeftCm),
    arm_flexed_right_cm: normalizeNumber(entry.armFlexedRightCm),
    forearm_left_cm: normalizeNumber(entry.forearmLeftCm),
    forearm_right_cm: normalizeNumber(entry.forearmRightCm),
    thigh_left_cm: normalizeNumber(entry.thighLeftCm),
    thigh_right_cm: normalizeNumber(entry.thighRightCm),
    calf_left_cm: normalizeNumber(entry.calfLeftCm),
    calf_right_cm: normalizeNumber(entry.calfRightCm),
  }
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
  return payload
}

interface RawMetricsEntry extends Record<string, unknown> {
  id?: string
  client_id?: string
  clientId?: string
  date?: unknown
  weight_kg?: number | null
  weightKg?: number | null
  body_fat_pct?: number | null
  bodyFatPct?: number | null
  muscle_pct?: number | null
  musclePct?: number | null
  water_pct?: number | null
  waterPct?: number | null
  visceral_fat?: number | null
  visceralFat?: number | null
  bone_mass_kg?: number | null
  boneMassKg?: number | null
  bmr_kcal?: number | null
  bmrKcal?: number | null
  neck_cm?: number | null
  neckCm?: number | null
  shoulders_cm?: number | null
  shouldersCm?: number | null
  chest_cm?: number | null
  chestCm?: number | null
  under_chest_cm?: number | null
  underChestCm?: number | null
  waist_cm?: number | null
  waistCm?: number | null
  abdomen_cm?: number | null
  abdomenCm?: number | null
  hips_cm?: number | null
  hipsCm?: number | null
  arm_relaxed_left_cm?: number | null
  armRelaxedLeftCm?: number | null
  arm_relaxed_right_cm?: number | null
  armRelaxedRightCm?: number | null
  arm_flexed_left_cm?: number | null
  armFlexedLeftCm?: number | null
  arm_flexed_right_cm?: number | null
  armFlexedRightCm?: number | null
  forearm_left_cm?: number | null
  forearmLeftCm?: number | null
  forearm_right_cm?: number | null
  forearmRightCm?: number | null
  thigh_left_cm?: number | null
  thighLeftCm?: number | null
  thigh_right_cm?: number | null
  thighRightCm?: number | null
  calf_left_cm?: number | null
  calfLeftCm?: number | null
  calf_right_cm?: number | null
  calfRightCm?: number | null
  notes?: string | null
  photos?: string[] | null
  measurement_protocol?: string | null
  measurementProtocol?: string | null
}

interface RawMetricsSummary {
  deltas: {
    weightKg: DeltaValue
    bodyFatPct: DeltaValue
    waistCm: DeltaValue
    abdomenCm: DeltaValue
  }
  series: {
    weightKg: SeriesPoint[]
    bodyFatPct: SeriesPoint[]
    waistCm: SeriesPoint[]
    abdomenCm: SeriesPoint[]
  }
  history?: RawMetricsEntry[]
}

function fromResponse(d: RawMetricsEntry): BodyMetricsEntry {
  return {
    id: d.id,
    clientId: (d.client_id ?? d.clientId) as string,
    date: toDate(d.date) ?? new Date(),
    weightKg: d.weight_kg ?? d.weightKg ?? null,
    bodyFatPct: d.body_fat_pct ?? d.bodyFatPct ?? null,
    musclePct: d.muscle_pct ?? d.musclePct ?? null,
    waterPct: d.water_pct ?? d.waterPct ?? null,
    visceralFat: d.visceral_fat ?? d.visceralFat ?? null,
    boneMassKg: d.bone_mass_kg ?? d.boneMassKg ?? null,
    bmrKcal: d.bmr_kcal ?? d.bmrKcal ?? null,
    neckCm: d.neck_cm ?? d.neckCm ?? null,
    shouldersCm: d.shoulders_cm ?? d.shouldersCm ?? null,
    chestCm: d.chest_cm ?? d.chestCm ?? null,
    underChestCm: d.under_chest_cm ?? d.underChestCm ?? null,
    waistCm: d.waist_cm ?? d.waistCm ?? null,
    abdomenCm: d.abdomen_cm ?? d.abdomenCm ?? null,
    hipsCm: d.hips_cm ?? d.hipsCm ?? null,
    armRelaxedLeftCm: d.arm_relaxed_left_cm ?? d.armRelaxedLeftCm ?? null,
    armRelaxedRightCm: d.arm_relaxed_right_cm ?? d.armRelaxedRightCm ?? null,
    armFlexedLeftCm: d.arm_flexed_left_cm ?? d.armFlexedLeftCm ?? null,
    armFlexedRightCm: d.arm_flexed_right_cm ?? d.armFlexedRightCm ?? null,
    forearmLeftCm: d.forearm_left_cm ?? d.forearmLeftCm ?? null,
    forearmRightCm: d.forearm_right_cm ?? d.forearmRightCm ?? null,
    thighLeftCm: d.thigh_left_cm ?? d.thighLeftCm ?? null,
    thighRightCm: d.thigh_right_cm ?? d.thighRightCm ?? null,
    calfLeftCm: d.calf_left_cm ?? d.calfLeftCm ?? null,
    calfRightCm: d.calf_right_cm ?? d.calfRightCm ?? null,
    notes: d.notes ?? null,
    photos: d.photos ?? null,
    measurementProtocol: (d.measurement_protocol ?? d.measurementProtocol ?? null) as BodyMetricsEntry['measurementProtocol'],
  }
}

export async function listMetricsByClient(clientId: string, _limitN = 200): Promise<BodyMetricsEntry[]> {
  const list = await api.get<RawMetricsEntry[]>(`/metrics/${clientId}`)
  return list.map(fromResponse)
}

export interface DeltaValue {
  lastValue: number | null
  change: number | null
}

export interface SeriesPoint {
  date: string
  value: number
}

export interface MetricsSummary {
  deltas: {
    weightKg: DeltaValue
    bodyFatPct: DeltaValue
    waistCm: DeltaValue
    abdomenCm: DeltaValue
  }
  series: {
    weightKg: SeriesPoint[]
    bodyFatPct: SeriesPoint[]
    waistCm: SeriesPoint[]
    abdomenCm: SeriesPoint[]
  }
  history: BodyMetricsEntry[]
}

export interface MetricPhotoUploadUrl {
  key: string
  upload_url: string
  public_url: string
  expires_in: number
}

export async function getMetricsSummary(clientId: string): Promise<MetricsSummary> {
  const raw = await api.get<RawMetricsSummary>(`/clients/${clientId}/metrics-summary`)
  return {
    deltas: raw.deltas,
    series: raw.series,
    history: (raw.history ?? []).map(fromResponse),
  }
}

export async function createMetricPhotoUploadUrl(
  fileName: string,
  contentType: string,
  fileSize?: number,
): Promise<MetricPhotoUploadUrl> {
  return api.post<MetricPhotoUploadUrl>('/metrics/upload-url', {
    file_name: fileName,
    content_type: contentType,
    file_size: fileSize ?? null,
  })
}

export async function uploadMetricPhotoToR2(file: File): Promise<string> {
  const signed = await createMetricPhotoUploadUrl(
    file.name,
    file.type || 'application/octet-stream',
    file.size,
  )

  const res = await fetch(signed.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) throw new Error('No se pudo subir la imagen a R2')

  return signed.public_url
}

export async function addMetricsEntry(entry: Omit<BodyMetricsEntry, 'id'>): Promise<string> {
  if (!entry.clientId) throw new Error('clientId is required')
  const res = await api.post<{ id: string }>('/metrics', toPayload(entry))
  return res.id
}

export async function updateMetricsEntry(
  _clientId: string,
  entryId: string,
  updates: Partial<BodyMetricsEntry>
): Promise<void> {
  await api.put(`/metrics/${entryId}`, toPayload(updates as Omit<BodyMetricsEntry, 'id'>))
}

export async function deleteMetricsEntry(_clientId: string, entryId: string): Promise<void> {
  await api.delete(`/metrics/${entryId}`)
}
