// vue/repo/fireRepo.ts — Helpers genéricos de fecha y datos

// Quita claves con valor undefined
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T
}

// Convierte cualquier valor de fecha a Date
export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value

  // Si es string tipo "YYYY-MM-DD", parsear manualmente para evitar UTC offset
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day) // local time, no UTC
  }

  const d = new Date(value as string | number)
  return isNaN(d.getTime()) ? undefined : d
}
