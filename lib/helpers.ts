export type WeekDayKey =
  'Lunes' |
  'Martes' |
  'Miércoles' |
  'Jueves' |
  'Viernes' |
  'Sábado' |
  'Domingo'

export const WEEK_DAYS: WeekDayKey[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export interface CutoffOptions {
  cutoffHour?: number; // default 21
  now?: Date;          // para tests o reloj externo
}

/**
 * Retorna la fecha "lógica" de la app.
 * Si pasa la hora de corte, avanza al siguiente día.
 */
export function appNow(options: CutoffOptions = {}): Date {
  const cutoffHour = options.cutoffHour ?? 21;
  const now = options.now ?? new Date();

  if (now.getHours() >= cutoffHour) {
    const shifted = new Date(now);
    shifted.setDate(now.getDate() + 1);
    return shifted;
  }

  return now;
}

/**
 * Convierte una fecha → 'lunes', 'martes', etc
 */
export function dateToWeekDayKey(date: Date): WeekDayKey {
  return WEEK_DAYS[date.getDay()];
}

/**
 * Retorna la semana del mes (1-4) basada en el día del mes.
 * 1-7 → 1, 8-14 → 2, 15-21 → 3, 22+ → 4
 */
export function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

/**
 * Retorna el índice activo de semana del plan basado en la fecha de inicio.
 */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getActiveWeekIndexFromAssignedAt(
  currentDate: Date,
  assignedAt: Date,
  totalWeeks: number
): number {
  if (totalWeeks <= 0) return 0;

  const msPerDay = 1000 * 60 * 60 * 24;

  const a = startOfDay(assignedAt).getTime();
  const c = startOfDay(currentDate).getTime();

  const daysPassed = Math.floor((c - a) / msPerDay);
  const weeksPassed = Math.floor(daysPassed / 7);

  return (weeksPassed % totalWeeks) + 1;
}

/**
 * Dado un día UI ('lunes', 'martes', etc)
 * retorna la fecha real considerando hora de corte
 */
export function dayDateFromUi(
  dayUi: WeekDayKey,
  options: CutoffOptions = {},
): Date {
  const base = appNow(options);
  const currentKey = dateToWeekDayKey(base);

  const currentIdx = WEEK_DAYS.indexOf(currentKey);
  const targetIdx = WEEK_DAYS.indexOf(dayUi);

  const diff = targetIdx - currentIdx;

  const d = new Date(base);
  d.setDate(base.getDate() + diff);
  return d;
}

