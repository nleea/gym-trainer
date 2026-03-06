<script setup lang="ts">
import { ref, computed } from 'vue'

// ─── Types ───────────────────────────────────────────────────────────────────
type ViewMode   = '1 Week' | '2 Week' | '4 Week'
type DayStatus  = 'completed' | 'planned' | 'rest' | 'empty'
type ViewType   = 'workouts' | 'meals'

interface Task {
  id: number | string
  title: string
  type: 'workout' | 'nutrition' | 'rest' | 'checkup'
  time?: string
  done: boolean
  date: Date
  isPlan?: boolean
}

// ─── Props & Emits ───────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  // Workouts
  dayStatus?:    (d: Date) => DayStatus
  exercises?:    (d: Date) => any[]
  log?:          (d: Date) => any | null
  // Meals
  mealsForDate?:    (d: Date) => any[]
  mealLogForDate?:  (d: Date) => any | null
}>(), {
  dayStatus:     undefined,
  exercises:     undefined,
  log:           undefined,
  mealsForDate:  undefined,
  mealLogForDate: undefined,
})

const emit = defineEmits<{
  (e: 'open-day', date: Date): void
}>()

// ─── State ───────────────────────────────────────────────────────────────────
const viewMode  = ref<ViewMode>('2 Week')
const viewType  = ref<ViewType>('workouts')
const today     = new Date()
const currentDate  = ref(new Date(today))
const showAddModal = ref(false)
const hoveredDate  = ref<Date | null>(null)

const manualTasks = ref<Task[]>([])

// ─── Calendar grid ────────────────────────────────────────────────────────────
const weeksCount = computed(() => {
  if (viewMode.value === '1 Week') return 1
  if (viewMode.value === '2 Week') return 2
  return 4
})

const startDate = computed(() => {
  const d = new Date(currentDate.value)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
})

const rangeLabel = computed(() => {
  const end = new Date(startDate.value)
  end.setDate(end.getDate() + weeksCount.value * 7 - 1)
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  return `${fmt(startDate.value)} – ${fmt(end)}`
})

const calendarDays = computed(() => {
  const days: Date[] = []
  const d = new Date(startDate.value)
  for (let i = 0; i < weeksCount.value * 7; i++) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
})

const weeks = computed(() => {
  const result: Date[][] = []
  for (let w = 0; w < weeksCount.value; w++)
    result.push(calendarDays.value.slice(w * 7, w * 7 + 7))
  return result
})

// ─── Plan-derived tasks ───────────────────────────────────────────────────────
const workoutTasks = computed<Task[]>(() => {
  if (!props.dayStatus) return []

  // console.log(props.dayStatus)

  return calendarDays.value.flatMap((day, i): Task[] => {
    const status = props.dayStatus!(day)
    if (status === 'completed' || status === 'planned') {
      const exs = props.exercises?.(day) ?? []
      const names = exs.slice(0, 2).map((e: any) => e.name).filter(Boolean)
      const title = names.length
        ? names.join(' · ') + (exs.length > 2 ? ` +${exs.length - 2}` : '')
        : 'Entrenamiento'
      return [{ id: `plan-${i}`, title, type: 'workout', done: status === 'completed', date: day, isPlan: true }]
    }
    if (status === 'rest')
      return [{ id: `rest-${i}`, title: 'Descanso', type: 'rest', done: false, date: day, isPlan: true }]
    return []
  })
})

const mealTasks = computed<Task[]>(() => {
  if (!props.mealsForDate) return []
  return calendarDays.value.flatMap((day, i): Task[] => {
    const meals = props.mealsForDate!(day)
    if (!meals?.length) return []
    const logged = !!props.mealLogForDate?.(day)
    const names = meals.slice(0, 2).map((m: any) => m.name || m.meal_name || m.type).filter(Boolean)
    const title = names.length
      ? names.join(' · ') + (meals.length > 2 ? ` +${meals.length - 2}` : '')
      : 'Plan nutricional'
    return [{ id: `meal-${i}`, title, type: 'nutrition', done: logged, date: day, isPlan: true }]
  })
})

// ─── Active tasks based on view ───────────────────────────────────────────────
const activePlanTasks = computed(() =>
  viewType.value === 'workouts' ? workoutTasks.value : mealTasks.value,
)

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const isToday = (d: Date) => isSameDay(d, today)

const tasksForDay = (d: Date) => [
  ...activePlanTasks.value.filter(t => isSameDay(t.date, d)),
  ...manualTasks.value.filter(t => isSameDay(t.date, d)),
]

const typeColor: Record<Task['type'], string> = {
  workout:   '#6366f1',
  nutrition: '#10b981',
  rest:      '#f59e0b',
  checkup:   '#3b82f6',
}
const typeLabel: Record<Task['type'], string> = {
  workout:   '🏋️',
  nutrition: '🥗',
  rest:      '😴',
  checkup:   '🩺',
}

const hasMealsData = computed(() => !!props.mealsForDate)

// ─── Interactions ─────────────────────────────────────────────────────────────
function handleTaskClick(task: Task) {
  if (task.isPlan) emit('open-day', new Date(task.date))
  else task.done = !task.done
}

function handleDayClick(day: Date) {
  if (props.dayStatus) emit('open-day', new Date(day))
}

// ─── Navigation ──────────────────────────────────────────────────────────────
const prev = () => {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - weeksCount.value * 7)
  currentDate.value = d
}
const next = () => {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + weeksCount.value * 7)
  currentDate.value = d
}
const goToday = () => { currentDate.value = new Date(today) }

// ─── Add task (manual extras) ────────────────────────────────────────────────
const newTask = ref({ title: '', type: 'workout' as Task['type'], time: '', date: '' })

const openAddModal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  newTask.value.date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  showAddModal.value = true
}

const saveTask = () => {
  if (!newTask.value.title.trim()) return
  const [y, m, day] = newTask.value.date.split('-').map(Number)
  manualTasks.value.push({
    id: Date.now(),
    title: newTask.value.title,
    type: newTask.value.type,
    time: newTask.value.time || undefined,
    done: false,
    date: new Date(y, m - 1, day),
  })
  showAddModal.value = false
  newTask.value = { title: '', type: 'workout', time: '', date: '' }
}
</script>

<template>
  <div class="calendar-root" :style="`--weeks: ${weeksCount}`">

    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="cal-header">
      <!-- Left: nav -->
      <div class="cal-header-left">
        <button class="btn-today" @click="goToday">HOY</button>
        <button class="btn-nav" @click="prev">‹</button>
        <span class="cal-range">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" class="cal-icon">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {{ rangeLabel }}
        </span>
        <button class="btn-nav" @click="next">›</button>
      </div>

      <!-- Center: content toggle -->
      <div class="view-type-switcher">
        <button
          class="vt-btn"
          :class="{ active: viewType === 'workouts' }"
          @click="viewType = 'workouts'"
        >
          🏋️ Entrenamientos
        </button>
        <button
          class="vt-btn"
          :class="{ active: viewType === 'meals' }"
          @click="viewType = 'meals'"
        >
          🥗 Comidas
        </button>
      </div>

      <!-- Right: week view switcher -->
      <div class="view-switcher">
        <button
          v-for="v in (['1 Week', '2 Week', '4 Week'] as ViewMode[])"
          :key="v"
          class="view-btn"
          :class="{ active: viewMode === v }"
          @click="viewMode = v"
        >{{ v }}</button>
      </div>
    </div>

    <!-- ── Day labels ─────────────────────────────────────── -->
    <div class="day-labels">
      <div v-for="d in ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM']" :key="d" class="day-label">
        {{ d }}
      </div>
    </div>

    <!-- ── Grid ───────────────────────────────────────────── -->
    <div class="cal-grid">
      <template v-for="(week, wi) in weeks" :key="wi">
        <div
          v-for="day in week"
          :key="day.toISOString()"
          class="cal-cell"
          :class="{
            'is-today': isToday(day),
            'is-hovered': hoveredDate && isSameDay(day, hoveredDate),
            'is-clickable': !!props.dayStatus,
          }"
          @mouseenter="hoveredDate = day"
          @mouseleave="hoveredDate = null"
          @click="handleDayClick(day)"
        >
          <!-- date number + add btn -->
          <div class="cell-top" @click.stop>
            <span class="day-num" :class="{ 'today-badge': isToday(day) }">
              {{ day.getDate() }}
            </span>
            <button
              class="add-btn"
              :class="{ visible: hoveredDate && isSameDay(day, hoveredDate) }"
              @click.stop="openAddModal(day)"
              title="Añadir tarea"
            >＋</button>
          </div>

          <!-- no meals data state -->
          <div
            v-if="viewType === 'meals' && !hasMealsData"
            class="no-data-msg"
          >
            Sin plan nutricional
          </div>

          <!-- tasks -->
          <div v-else class="task-list" @click.stop>
            <div
              v-for="task in tasksForDay(day)"
              :key="task.id"
              class="task-chip"
              :class="{ done: task.done, 'plan-chip': task.isPlan }"
              :style="{ '--task-color': typeColor[task.type] }"
              @click.stop="handleTaskClick(task)"
            >
              <span class="task-emoji">{{ typeLabel[task.type] }}</span>
              <span class="task-title">{{ task.title }}</span>
              <span v-if="task.time" class="task-time">{{ task.time }}</span>
              <svg
                v-if="task.isPlan"
                class="task-chevron"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Add Task Modal ─────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
          <div class="modal-box">
            <h3 class="modal-title">Nueva tarea</h3>

            <label class="modal-label">Título</label>
            <input v-model="newTask.title" class="modal-input" placeholder="ej. Sesión de cardio" />

            <label class="modal-label">Tipo</label>
            <select v-model="newTask.type" class="modal-input">
              <option value="workout">🏋️ Entrenamiento</option>
              <option value="nutrition">🥗 Nutrición</option>
              <option value="rest">😴 Descanso</option>
              <option value="checkup">🩺 Revisión</option>
            </select>

            <label class="modal-label">Hora (opcional)</label>
            <input v-model="newTask.time" type="time" class="modal-input" />

            <label class="modal-label">Fecha</label>
            <input v-model="newTask.date" type="date" class="modal-input" />

            <div class="modal-actions">
              <button class="btn-cancel" @click="showAddModal = false">Cancelar</button>
              <button class="btn-save" @click="saveTask">Guardar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Tokens ─────────────────────────────────────────────── */
.calendar-root {
  --bg: #f4f5f8;
  --surface: #ffffff;
  --border: #e5e7eb;
  --text: #1f2937;
  --text-muted: #9ca3af;
  --accent: #6366f1;
  --accent-light: #eef2ff;
  --today-bg: #6366f1;
  --today-text: #ffffff;
  --radius: 12px;

  font-family: 'DM Sans', 'Segoe UI', sans-serif;
  background: var(--bg);
  padding: 20px;
  border-radius: 20px;
  width: 100%;

  /* Full-height layout */
  height: calc(90vh - 120px);
  min-height: 500px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────── */
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
}
.cal-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-today {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text);
  cursor: pointer;
  transition: all .15s;
}
.btn-today:hover { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.btn-nav {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  line-height: 1;
  transition: color .15s, background .15s;
}
.btn-nav:hover { color: var(--accent); background: var(--accent-light); }
.cal-range {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}
.cal-icon { color: var(--text-muted); }

/* ── Content toggle (workouts / meals) ──────────────────── */
.view-type-switcher {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 3px;
}
.vt-btn {
  border: none;
  background: none;
  padding: 7px 18px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all .2s;
  white-space: nowrap;
}
.vt-btn.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,.35);
}
.vt-btn:not(.active):hover {
  color: var(--text);
  background: var(--accent-light);
}

/* ── View switcher ──────────────────────────────────────── */
.view-switcher {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 3px;
}
.view-btn {
  border: none;
  background: none;
  padding: 6px 14px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all .2s;
}
.view-btn.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,.35);
}

/* ── Day labels ─────────────────────────────────────────── */
.day-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  flex-shrink: 0;
}
.day-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  padding: 0 8px;
}

/* ── Grid ───────────────────────────────────────────────── */
.cal-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(var(--weeks), 1fr);
  gap: 6px;
}

/* ── Cell ───────────────────────────────────────────────── */
.cal-cell {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 10px;
  border: 1.5px solid transparent;
  transition: border-color .15s, box-shadow .15s;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow: hidden;
  min-height: 0;
}
.cal-cell.is-clickable { cursor: pointer; }
.cal-cell.is-hovered {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99,102,241,.1);
}

.cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.day-num {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}
.today-badge {
  background: var(--today-bg);
  color: var(--today-text);
  box-shadow: 0 2px 8px rgba(99,102,241,.4);
}

/* ── No data message ────────────────────────────────────── */
.no-data-msg {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 4px 0;
  opacity: 0.6;
}

/* ── Add button ─────────────────────────────────────────── */
.add-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s, background .15s, border-color .15s, color .15s;
  flex-shrink: 0;
}
.add-btn.visible {
  opacity: 1;
  border-color: var(--accent);
  color: var(--accent);
}
.add-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

/* ── Task chips ─────────────────────────────────────────── */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.task-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--task-color) 12%, transparent);
  border-left: 3px solid var(--task-color);
  cursor: pointer;
  transition: opacity .15s, background .15s;
  user-select: none;
  flex-shrink: 0;
}
.task-chip:hover { background: color-mix(in srgb, var(--task-color) 22%, transparent); }
.task-chip.done { opacity: 0.45; }
.task-chip.done .task-title { text-decoration: line-through; }

.task-emoji { font-size: 12px; flex-shrink: 0; }
.task-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.task-time {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.task-chevron {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.6;
}

/* ── Modal ──────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-box {
  background: var(--surface);
  border-radius: 18px;
  padding: 28px;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.modal-title { font-size: 18px; font-weight: 700; color: var(--text); margin: 0 0 6px; }
.modal-label { font-size: 12px; font-weight: 600; color: var(--text-muted); letter-spacing: .05em; }
.modal-input {
  width: 100%;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color .15s;
  box-sizing: border-box;
}
.modal-input:focus { border-color: var(--accent); }
.modal-actions { display: flex; gap: 8px; margin-top: 8px; }
.btn-cancel {
  flex: 1; padding: 10px; border: 1.5px solid var(--border); border-radius: 8px;
  background: none; font-size: 14px; font-weight: 600; color: var(--text-muted); cursor: pointer;
  transition: all .15s;
}
.btn-cancel:hover { border-color: #ef4444; color: #ef4444; }
.btn-save {
  flex: 2; padding: 10px; border: none; border-radius: 8px; background: var(--accent);
  color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
  transition: background .15s, box-shadow .15s;
}
.btn-save:hover { background: #4f46e5; box-shadow: 0 4px 14px rgba(99,102,241,.4); }

/* ── Modal transition ───────────────────────────────────── */
.modal-enter-active, .modal-leave-active { transition: all .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.95); }
</style>
