<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { monthlyReportRepo, type SavedReport } from '../repo/monthlyReport.repo'

const props = defineProps<{
  clientId: string
  clientName: string
}>()

// ── Month navigation ──────────────────────────────────────────────────────────
const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1) // 1-12

const selectedMonthStr = computed(() => {
  const m = String(selectedMonth.value).padStart(2, '0')
  return `${selectedYear.value}-${m}`
})

const displayMonth = computed(() => {
  const d = new Date(selectedYear.value, selectedMonth.value - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const isCurrentOrFuture = computed(() => {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return selectedYear.value > y || (selectedYear.value === y && selectedMonth.value >= m)
})

function prevMonth() {
  if (selectedMonth.value === 1) {
    selectedMonth.value = 12
    selectedYear.value--
  } else {
    selectedMonth.value--
  }
}

function nextMonth() {
  if (isCurrentOrFuture.value) return
  if (selectedMonth.value === 12) {
    selectedMonth.value = 1
    selectedYear.value++
  } else {
    selectedMonth.value++
  }
}

// ── Generate & download ───────────────────────────────────────────────────────
const generating = ref(false)
const toast = ref<{ text: string; type: 'success' | 'error' } | null>(null)

function showToast(text: string, type: 'success' | 'error') {
  toast.value = { text, type }
  setTimeout(() => { toast.value = null }, 3500)
}

async function generateReport() {
  generating.value = true
  try {
    await monthlyReportRepo.downloadReport(props.clientId, selectedMonthStr.value, props.clientName)
    showToast('Report generated and downloaded', 'success')
    await loadSavedReports()
  } catch (e: any) {
    showToast(e?.message ?? 'Failed to generate report', 'error')
  } finally {
    generating.value = false
  }
}

// ── Saved reports list ────────────────────────────────────────────────────────
const savedReports = ref<SavedReport[]>([])
const loadingSaved = ref(false)

async function loadSavedReports() {
  loadingSaved.value = true
  try {
    savedReports.value = await monthlyReportRepo.listReports(props.clientId)
  } finally {
    loadingSaved.value = false
  }
}

onMounted(loadSavedReports)

function formatMonth(month: string) {
  const [y, m] = month.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function downloadSaved(report: SavedReport) {
  generating.value = true
  try {
    await monthlyReportRepo.downloadReport(props.clientId, report.month, props.clientName)
  } catch (e: any) {
    showToast(e?.message ?? 'Download failed', 'error')
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Toast -->
    <Transition name="fade">
      <div
        v-if="toast"
        :class="[
          'fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg',
          toast.type === 'success' ? 'bg-primary text-white' : 'bg-destructive text-white',
        ]"
      >
        {{ toast.text }}
      </div>
    </Transition>

    <!-- Month selector + Generate button -->
    <div class="rounded-2xl border border-border bg-card p-6 space-y-5">
      <h3 class="font-semibold text-foreground">Generate Report</h3>

      <!-- Month navigator -->
      <div class="flex items-center gap-3">
        <button
          @click="prevMonth"
          class="rounded-xl border border-border bg-background p-2 hover:bg-muted transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span class="min-w-[160px] text-center font-semibold text-foreground">
          {{ displayMonth }}
        </span>

        <button
          @click="nextMonth"
          :disabled="isCurrentOrFuture"
          :class="[
            'rounded-xl border border-border p-2 transition-colors',
            isCurrentOrFuture
              ? 'opacity-30 cursor-not-allowed bg-background'
              : 'bg-background hover:bg-muted',
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Generate button -->
      <button
        @click="generateReport"
        :disabled="generating"
        class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        <svg v-if="!generating" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <!-- Spinner -->
        <svg v-else class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        {{ generating ? 'Generating PDF...' : 'Generate Report' }}
      </button>
    </div>

    <!-- Saved reports list -->
    <div class="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h3 class="font-semibold text-foreground">Previous Reports</h3>

      <div v-if="loadingSaved" class="text-sm text-muted-foreground py-4 text-center">
        Loading...
      </div>

      <div v-else-if="savedReports.length === 0" class="text-sm text-muted-foreground py-4 text-center">
        No reports generated yet.
      </div>

      <div v-else class="divide-y divide-border">
        <div
          v-for="report in savedReports"
          :key="report.id"
          class="flex items-center justify-between py-3 gap-4"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <div class="min-w-0">
              <p class="font-semibold text-foreground text-sm truncate">
                {{ formatMonth(report.month) }}
              </p>
              <p class="text-xs text-muted-foreground">
                Generated {{ formatDate(report.generated_at) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <span
              :class="[
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                report.generated_by === 'auto'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary',
              ]"
            >
              {{ report.generated_by === 'auto' ? 'Auto' : 'Manual' }}
            </span>

            <button
              @click="downloadSaved(report)"
              class="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
