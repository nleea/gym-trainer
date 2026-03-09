// vue/repo/progressEntry.ts
import { api } from '../api'
import type { ProgressEntry } from '../types'
import { toDate } from './fireRepo'
import { toYmdLocal } from '../../lib/utils'

function toISO(d: Date): string {
  return toYmdLocal(d)
}

function mapEntry(d: any): ProgressEntry {
  return {
    ...d,
    date: toDate(d.date) ?? new Date(),
    createdAt: toDate(d.createdAt),
  } as ProgressEntry
}

export async function addProgressEntry(
  entry: Omit<ProgressEntry, 'id' | 'createdAt'>
): Promise<void> {
  await api.post('/progress', {
    client_id: entry.clientId,
    type: entry.type,
    date: toISO(entry.date instanceof Date ? entry.date : new Date(entry.date)),
    weight: entry.weight,
    measurements: entry.measurements,
    photos: entry.photos ?? [],
    notes: entry.notes,
  })
}

export async function listProgressByClient(clientId: string): Promise<ProgressEntry[]> {
  const list = await api.get<any[]>(`/progress/${clientId}`)
  return list.map(mapEntry)
}

export async function listProgressByClientAndType(
  clientId: string,
  type: ProgressEntry['type']
): Promise<ProgressEntry[]> {
  const list = await api.get<any[]>(`/progress/${clientId}?type=${type}`)
  return list.map(mapEntry)
}
