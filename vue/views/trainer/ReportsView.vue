<script setup lang="ts">
import { Bar, Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  BarElement,
} from 'chart.js'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../stores/auth'
import { useTrainerStore } from '../../stores/trainer.store'
import type { ReportPeriod } from '../../repo/trainerRepo'

ChartJS.register(
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler,
  BarElement,
)

const router = useRouter()
const auth = useAuthStore()
const trainerStore = useTrainerStore()
const { reports, reportsLoading } = storeToRefs(trainerStore)

const period = ref<ReportPeriod>('week')
const sortBy = ref<'client' | 'workouts' | 'volume' | 'prs' | 'streak' | 'status'>('status')
const sortDir = ref<'asc' | 'desc'>('desc')

const trainerId = computed(() => auth.user?.id ?? auth.user?.uid ?? '')

const periodLabel = computed(() => {
  const now = new Date()
  const start = new Date(now)
  if (period.value === 'week') start.setDate(now.getDate() - 6)
  else start.setDate(now.getDate() - 29)
  return `${start.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} – ${now.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`
})

function toClient(clientId: string) {
  router.push({ path: `/trainer/clients/${clientId}`, query: { clientId } })
}

function loadThemeVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value ? `oklch(${value})` : fallback
}

const colors = computed(() => ({
  primary: loadThemeVar('--primary', '#2563eb'),
  muted: loadThemeVar('--muted-foreground', '#9ca3af'),
  success: '#16a34a',
  warning: '#ca8a04',
  danger: '#dc2626',
}))

const statsCards = computed(() => {
  const s = reports.value?.stats
  if (!s) return []
  const attendanceColor =
    s.avgAttendance >= 70 ? colors.value.success : s.avgAttendance >= 50 ? colors.value.warning : colors.value.danger
  return [
    { key: 'active', label: 'Clientes activos', value: s.activeClients, accent: '#2563eb', icon: '👥' },
    { key: 'att', label: 'Asistencia media', value: `${s.avgAttendance}%`, accent: attendanceColor, icon: '✅' },
    { key: 'w', label: 'Entrenos registrados', value: s.totalWorkouts, accent: '#ea580c', icon: '⚡' },
    { key: 'm', label: 'Comidas registradas', value: s.totalMeals, accent: '#059669', icon: '🌿' },
    { key: 'pr', label: 'PRs esta semana', value: s.prsThisWeek, accent: '#ca8a04', icon: '🏆' },
  ]
})

const attendanceChartData = computed(() => {
  const rows = reports.value?.attendance ?? []
  return {
    labels: rows.map((r) => r.day),
    datasets: [
      {
        label: 'Asistió',
        data: rows.map((r) => r.attended),
        backgroundColor: colors.value.primary,
        borderRadius: { topLeft: 10, topRight: 10 },
      },
      {
        label: 'No asistió',
        data: rows.map((r) => r.missed),
        backgroundColor: 'rgba(148, 163, 184, 0.35)',
        borderRadius: { topLeft: 10, topRight: 10 },
      },
    ],
  }
})

const attendanceChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw} clientes`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { borderDash: [3, 3], color: 'rgba(148,163,184,0.25)' },
    },
  },
}))

const groupVolumeChartData = computed(() => {
  const rows = reports.value?.groupVolume ?? []
  const currentWeek = (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().slice(0, 10)
  })()
  return {
    labels: rows.map((r) => {
      const d = new Date(`${r.week}T00:00:00`)
      return `Sem ${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`
    }),
    datasets: [
      {
        label: 'Volumen',
        data: rows.map((r) => r.volume),
        backgroundColor: rows.map((r) =>
          r.week === currentWeek ? 'rgba(202, 138, 4, 0.85)' : colors.value.primary,
        ),
        borderRadius: 8,
      },
    ],
  }
})

const groupVolumeChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${Number(ctx.raw).toLocaleString('es-CO')} kg`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (v: any) => `${Math.round(Number(v) / 1000)}k kg`,
      },
    },
  },
}))

const adherenceHistoryData = computed(() => {
  const rows = reports.value?.adherenceHistory ?? []
  return {
    labels: rows.map((r) => {
      const [year, month] = r.month.split('-')
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-CO', {
        month: 'long',
        year: 'numeric',
      })
    }),
    datasets: [
      {
        label: 'Adherencia',
        data: rows.map((r) => r.adherencePct),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
      },
      {
        label: 'Objetivo',
        data: rows.map(() => 70),
        borderColor: 'rgba(148,163,184,0.7)',
        borderDash: [6, 4],
        pointRadius: 0,
      },
    ],
  }
})

const adherenceHistoryOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
  scales: {
    y: { beginAtZero: true, max: 100 },
  },
}))

const weeklyProgressSorted = computed(() => {
  const rows = [...(reports.value?.weeklyProgress ?? [])]
  const getStatus = (r: any) => {
    const pct = (r.completedWorkouts / Math.max(1, r.plannedWorkouts)) * 100
    if (pct >= 75) return 3
    if (pct >= 50) return 2
    return 1
  }
  rows.sort((a: any, b: any) => {
    let comp = 0
    if (sortBy.value === 'client') comp = a.clientName.localeCompare(b.clientName)
    if (sortBy.value === 'workouts') comp = a.completedWorkouts / Math.max(1, a.plannedWorkouts) - b.completedWorkouts / Math.max(1, b.plannedWorkouts)
    if (sortBy.value === 'volume') comp = a.volumeKg - b.volumeKg
    if (sortBy.value === 'prs') comp = a.prs - b.prs
    if (sortBy.value === 'streak') comp = a.streak - b.streak
    if (sortBy.value === 'status') comp = getStatus(a) - getStatus(b)
    return sortDir.value === 'asc' ? comp : -comp
  })
  return rows
})

function toggleSort(key: typeof sortBy.value) {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortBy.value = key
    sortDir.value = 'desc'
  }
}

function adherenceClass(pct: number) {
  if (pct >= 75) return 'good'
  if (pct >= 50) return 'mid'
  return 'bad'
}

const topPrs = computed(() => reports.value?.prsThisWeek.slice(0, 6) ?? [])
const hasMorePrs = computed(() => (reports.value?.prsThisWeek.length ?? 0) > 6)

onMounted(async () => {
  if (!trainerId.value) return
  await trainerStore.loadReports(trainerId.value, period.value)
})

watch(period, async (p) => {
  if (!trainerId.value) return
  await trainerStore.loadReports(trainerId.value, p)
})
</script>

<template>
  <section class="reports-page">
    <header class="section card anim">
      <div>
        <h1 class="title">Reportes</h1>
        <p class="subtitle">Analiza el progreso de tus clientes</p>
        <p class="period">{{ periodLabel }}</p>
      </div>
      <div class="toggle">
        <button :class="['toggle-btn', period === 'week' && 'active']" @click="period = 'week'">Semana</button>
        <button :class="['toggle-btn', period === 'month' && 'active']" @click="period = 'month'">Mes</button>
      </div>
    </header>

    <div v-if="reportsLoading" class="card loading">Cargando reportes...</div>

    <template v-else-if="reports">
      <section class="stats-grid section anim">
        <article v-for="(card, idx) in statsCards" :key="card.key" class="card stat" :style="{ '--accent': card.accent, '--delay': `${idx * 60}ms` }">
          <p class="stat-label">{{ card.label }}</p>
          <p class="stat-value">{{ card.value }}</p>
          <span class="stat-icon">{{ card.icon }}</span>
        </article>
      </section>

      <section class="two-col section anim">
        <article class="card chart-card">
          <h3>Asistencia</h3>
          <div class="chart-wrap"><Bar :data="attendanceChartData" :options="attendanceChartOptions" /></div>
        </article>
        <article class="card prs-card">
          <header class="prs-header">
            <h3>🏆 PRs esta semana</h3>
            <span class="badge">{{ reports.stats.prsThisWeek }} nuevos récords</span>
          </header>
          <ul v-if="topPrs.length" class="prs-list">
            <li v-for="pr in topPrs" :key="`${pr.clientName}-${pr.exerciseName}-${pr.date}`" class="prs-item">
              <div class="avatar">{{ pr.clientName.charAt(0) }}</div>
              <div class="prs-meta">
                <p class="name">{{ pr.clientName }}</p>
                <p class="desc">{{ pr.exerciseName }} · {{ pr.newWeight }}kg</p>
                <p class="time">{{ pr.date }}</p>
              </div>
              <span class="delta">+{{ Math.max(0, pr.newWeight - pr.previousBest) }}kg</span>
            </li>
          </ul>
          <p v-else class="empty">Esta semana aún no hay PRs. ¡A entrenar!</p>
          <button v-if="hasMorePrs" class="link-btn">Ver todos</button>
        </article>
      </section>

      <section class="two-col section anim">
        <article class="card chart-card">
          <div class="head-row">
            <h3>Volumen del grupo</h3>
            <p class="big-number">{{ reports.groupVolume.reduce((s, x) => s + x.volume, 0).toLocaleString('es-CO') }} kg</p>
          </div>
          <div class="chart-wrap"><Bar :data="groupVolumeChartData" :options="groupVolumeChartOptions" /></div>
        </article>
        <article class="card wellbeing-card">
          <header class="head-row">
            <h3>Bienestar semanal</h3>
            <span class="small">{{ reports.wellbeingSnapshot.clientsWithCheckin }}/{{ reports.stats.activeClients }} check-ins</span>
          </header>
          <div class="well-grid">
            <div><p class="k">😴 Sueño</p><p class="v">{{ reports.wellbeingSnapshot.avgSleep }}h</p></div>
            <div><p class="k">⚡ Energía</p><p class="v">{{ reports.wellbeingSnapshot.avgEnergy }}/10</p></div>
            <div><p class="k">🧘 Estrés</p><p class="v" :class="{ stress: reports.wellbeingSnapshot.avgStress > 7 }">{{ reports.wellbeingSnapshot.avgStress }}/10</p></div>
          </div>
          <div class="mood-list">
            <div v-for="(value, key) in reports.wellbeingSnapshot.moodDistribution" :key="key" class="mood-row">
              <span class="mk">{{ key }}</span>
              <div class="bar"><span :style="{ width: `${(value / Math.max(1, reports.wellbeingSnapshot.clientsWithCheckin)) * 100}%` }" /></div>
              <span class="mv">{{ value }}</span>
            </div>
          </div>
          <p v-if="reports.wellbeingSnapshot.clientsWithCheckin < Math.ceil(reports.stats.activeClients * 0.5)" class="warn">
            Solo {{ reports.wellbeingSnapshot.clientsWithCheckin }} clientes completaron el check-in esta semana
          </p>
        </article>
      </section>

      <section class="section anim">
        <article class="card">
          <h3>Progreso semanal por cliente</h3>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th @click="toggleSort('client')">Cliente</th>
                  <th @click="toggleSort('workouts')">Entrenos</th>
                  <th @click="toggleSort('volume')">Volumen</th>
                  <th @click="toggleSort('prs')">PRs</th>
                  <th @click="toggleSort('streak')">Racha</th>
                  <th @click="toggleSort('status')">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in weeklyProgressSorted" :key="row.clientId" @click="toClient(row.clientId)">
                  <td>{{ row.clientName }}</td>
                  <td>
                    <div>{{ row.completedWorkouts }}/{{ row.plannedWorkouts }}</div>
                    <div class="mini"><span :style="{ width: `${(row.completedWorkouts / Math.max(1,row.plannedWorkouts))*100}%` }" /></div>
                  </td>
                  <td>{{ row.volumeKg.toLocaleString('es-CO') }}kg</td>
                  <td>{{ row.prs }} <span v-if="row.prs > 0">🏆</span></td>
                  <td>🔥 {{ row.streak }}</td>
                  <td>
                    <span
                      class="state-dot"
                      :class="adherenceClass(Math.round((row.completedWorkouts / Math.max(1, row.plannedWorkouts)) * 100))"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section class="section anim">
        <article class="card chart-card">
          <h3>Adherencia histórica</h3>
          <div class="chart-wrap"><Line :data="adherenceHistoryData" :options="adherenceHistoryOptions" /></div>
        </article>
      </section>

      <section class="section anim">
        <article class="card">
          <h3>Ranking de adherencia</h3>
          <ul class="ranking">
            <li v-for="(item, idx) in reports.adherenceRanking" :key="item.clientId" @click="toClient(item.clientId)">
              <div class="r-left">
                <div class="avatar rank">{{ item.clientName.charAt(0) }}<span class="pos">{{ idx + 1 }}</span></div>
                <div>
                  <p class="name">{{ idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '' }}{{ item.clientName }}</p>
                  <p class="desc">{{ item.workouts }} entrenos, {{ item.meals }} comidas</p>
                </div>
              </div>
              <div class="r-right">
                <div class="bar"><span :class="adherenceClass(item.adherencePct)" :style="{ width: `${item.adherencePct}%` }" /></div>
                <strong>{{ item.adherencePct }}%</strong>
              </div>
            </li>
          </ul>
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped>
.reports-page { display: grid; gap: 1rem; padding: 1rem; }
.section { animation: rise .35s ease both; }
.anim { animation-delay: .05s; }
.card { border: 1px solid var(--border); border-radius: 1rem; background: var(--card); box-shadow: 0 8px 30px rgba(15, 23, 42, .04); padding: 1rem; }
.title { margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--foreground); }
.subtitle, .period { margin: .2rem 0 0; color: var(--muted-foreground); font-size: .85rem; }
.toggle { display: flex; gap: .35rem; background: var(--muted); border-radius: .8rem; padding: .2rem; width: fit-content; }
.toggle-btn { border: none; background: transparent; border-radius: .65rem; min-height: 2.5rem; padding: 0 .8rem; }
.toggle-btn.active { background: var(--card); font-weight: 700; }
.stats-grid { display: grid; grid-template-columns: 1fr; gap: .7rem; }
.stat { position: relative; border-left: 4px solid var(--accent); animation-delay: var(--delay); }
.stat-label { margin: 0; color: var(--muted-foreground); font-size: .75rem; }
.stat-value { margin: .25rem 0 0; font-size: 1.8rem; font-weight: 800; color: var(--foreground); }
.stat-icon { position: absolute; right: .9rem; top: .8rem; font-size: 1.2rem; }
.two-col { display: grid; grid-template-columns: 1fr; gap: .7rem; }
.chart-wrap { height: 17rem; }
.prs-header, .head-row { display: flex; justify-content: space-between; align-items: center; gap: .7rem; }
.badge { font-size: .7rem; border-radius: 999px; padding: .2rem .6rem; background: var(--muted); }
.prs-list { list-style: none; padding: 0; margin: .8rem 0 0; display: grid; gap: .45rem; }
.prs-item { display: grid; grid-template-columns: 2rem 1fr auto; gap: .6rem; align-items: center; border: 1px solid var(--border); border-radius: .8rem; padding: .55rem; }
.avatar { width: 2rem; height: 2rem; border-radius: 999px; background: var(--muted); display: grid; place-items: center; font-weight: 700; }
.prs-meta .name { margin: 0; font-size: .85rem; font-weight: 700; color: var(--foreground); }
.prs-meta .desc, .prs-meta .time { margin: 0; font-size: .72rem; color: var(--muted-foreground); }
.delta { background: rgba(22,163,74,.12); color: #15803d; border-radius: .6rem; padding: .2rem .45rem; font-size: .7rem; font-weight: 700; }
.empty { color: var(--muted-foreground); font-size: .85rem; margin-top: .9rem; }
.link-btn { margin-top: .7rem; border: none; background: transparent; color: var(--primary); font-weight: 700; }
.big-number { margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--foreground); }
.small { color: var(--muted-foreground); font-size: .75rem; }
.well-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; margin-top: .8rem; }
.k { margin: 0; font-size: .7rem; color: var(--muted-foreground); }
.v { margin: .2rem 0 0; font-size: 1rem; font-weight: 800; color: var(--foreground); }
.v.stress { color: #dc2626; }
.mood-list { display: grid; gap: .35rem; margin-top: .8rem; }
.mood-row { display: grid; grid-template-columns: 5rem 1fr 1.4rem; gap: .35rem; align-items: center; }
.mk, .mv { font-size: .72rem; color: var(--muted-foreground); text-transform: capitalize; }
.bar { height: .45rem; border-radius: 999px; background: var(--muted); overflow: hidden; }
.bar span { display: block; height: 100%; border-radius: inherit; background: var(--primary); }
.warn { margin-top: .7rem; font-size: .75rem; border: 1px solid #facc15; background: rgba(250, 204, 21, .1); color: #a16207; border-radius: .65rem; padding: .4rem .5rem; }
.table-wrap { overflow-x: auto; margin-top: .6rem; }
.table { width: 100%; border-collapse: collapse; min-width: 46rem; }
.table th, .table td { text-align: left; padding: .65rem .5rem; border-bottom: 1px solid var(--border); font-size: .82rem; color: var(--foreground); }
.table th { color: var(--muted-foreground); cursor: pointer; }
.table tbody tr:hover { background: var(--muted); }
.mini { height: .25rem; border-radius: 999px; background: var(--muted); margin-top: .2rem; overflow: hidden; }
.mini span { display: block; height: 100%; background: var(--primary); }
.state-dot { width: .62rem; height: .62rem; border-radius: 999px; display: inline-block; }
.state-dot.good { background: #16a34a; }
.state-dot.mid { background: #ca8a04; }
.state-dot.bad { background: #dc2626; }
.ranking { list-style: none; margin: .7rem 0 0; padding: 0; display: grid; gap: .45rem; }
.ranking li { border: 1px solid var(--border); border-radius: .8rem; padding: .55rem; display: flex; align-items: center; justify-content: space-between; gap: .7rem; cursor: pointer; }
.ranking li:hover { background: var(--muted); }
.r-left { display: flex; align-items: center; gap: .6rem; }
.avatar.rank { position: relative; }
.pos { position: absolute; right: -.25rem; top: -.25rem; width: .95rem; height: .95rem; border-radius: 999px; background: var(--primary); color: var(--primary-foreground); font-size: .62rem; display: grid; place-items: center; }
.r-right { width: min(14rem, 50%); display: grid; gap: .25rem; }
.r-right .bar span.good { background: #16a34a; }
.r-right .bar span.mid { background: #ca8a04; }
.r-right .bar span.bad { background: #dc2626; }
.loading { text-align: center; color: var(--muted-foreground); }
@keyframes rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
@media (min-width: 48rem) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 70rem) {
  .stats-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .two-col { grid-template-columns: 3fr 2fr; }
}
</style>
