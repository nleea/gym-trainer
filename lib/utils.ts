import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
// import { Timestamp } from 'firebase/firestore'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string ) {
  if (!date) return ''

  let d: Date

  if (date instanceof Date) {
    d = date
  } else if (typeof date === 'string') {
    d = new Date(date)
  }  else {
    return ''
  }

  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  })
}

export function getWeekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 domingo - 6 sábado
  const diffToMonday = day === 0 ? -6 : 1 - day

  const start = new Date(d)
  start.setDate(d.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}


export function toJsDate(value: any): Date | null {
  if (!value) return null

  // Firestore Timestamp (SDK)
  // if (value instanceof Timestamp) return value.toDate()

  // Timestamp "plano" (a veces viene como {seconds, nanoseconds})
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000)
  }

  // string o Date
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export function dayKey(date: any) {
  const d = date?.toDate ? date.toDate() : new Date(date)
  return toYmdLocal(d)
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export const jsDate = (d: any) => (d instanceof Date ? d : new Date(d));
export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function toYmdLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const da = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${da}`
}

export function ymd(d: Date) {
  return toYmdLocal(startOfDay(d))
}

export function getWeekStart(d: Date) {
  // Domingo como inicio
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}

export function weekKeyFor(cid: string, date: Date) {
  return `${cid}|${ymd(getWeekStart(date))}`
}

export function weekKey(clientId: string, anchorDate = new Date()) {
  const { start } = getWeekRange(anchorDate)
  return `${clientId}|${ymd(start)}`
}

export function parseYmdLocal(ymdStr: string) {
  const [y, m, d] = ymdStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

export function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}


export function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameLocalDay(a: Date, b: Date) {
  return startOfDayLocal(a).getTime() === startOfDayLocal(b).getTime();
}

export function isPastLocalDay(target: Date) {
  const today = startOfDayLocal(new Date());
  const t = startOfDayLocal(target);
  return t.getTime() < today.getTime();
}
