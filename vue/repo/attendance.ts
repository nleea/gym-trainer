// vue/repo/attendance.ts
import { api } from '../api'
import type { Attendance } from '../types'
import { toDate } from './fireRepo'

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function mapAttendance(d: any): Attendance {
  return {
    ...d,
    date: toDate(d.date) ?? new Date(),
  } as Attendance
}

export async function markAttendance(data: Attendance): Promise<string> {
  const res = await api.post<{ id: string }>('/attendance', {
    client_id: data.clientId,
    date: toISO(data.date instanceof Date ? data.date : new Date(data.date)),
    attended: data.attended ?? true,
    notes: data.notes,
  })
  return res.id
}

export async function listAttendanceByClient(clientId: string): Promise<Attendance[]> {
  const list = await api.get<any[]>(`/attendance/${clientId}`)
  return list.map(mapAttendance)
}

export async function listAttendance(): Promise<Attendance[]> {
  const list = await api.get<any[]>(`/attendance/trainer/`)
  return list.map(mapAttendance)
}

export async function updateAttendance(
  attendanceId: string,
  data: Partial<Attendance>
): Promise<void> {
  await api.put(`/attendance/${attendanceId}`, data)
}
