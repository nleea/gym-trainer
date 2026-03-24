<!-- vue/views/client/MetricsView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMetricsStore } from '@/stores/metrics.store';
import type { BodyMetricsEntry } from '@/types';
import { parseYmdLocal, toJsDate, toYmdLocal } from '../../../lib/utils';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from 'vue-i18n';
import { uploadMetricPhotoToR2 } from '../../repo/metricsRepo';
import PhotoTimeline from '@/components/photos/PhotoTimeline.vue'
import BodyRender from '@/components/body/BodyRender.vue'
import WeeklyVolumeChart from '@/components/WeeklyVolumeChart.vue'
import AdherenceCard from '@/components/AdherenceCard.vue'

const { t } = useI18n();

const props = withDefaults(defineProps<{ clientId?: string }>(), { clientId: '' });

const metricsStore = useMetricsStore();
const authStore = useAuthStore();

const resolvedClientId = computed(() =>
  props.clientId || authStore.user?.client_id || authStore.user?.uid || ''
);

const isStandalone = computed(() => !props.clientId);

const roleUser = computed(() => authStore.user?.role ?? 'client');
const isClient = computed(() => roleUser.value === 'client');

type TabKey = 'overview' | 'composition' | 'measurements' | 'mymeasurements' | 'photos' | 'history';

const activeTab = ref<TabKey>('overview');
const formMode = ref<'create' | 'edit'>('create');
const editingId = ref<string | null>(null);

const saving = ref(false);
const uploadingPhotos = ref(false);
const formError = ref<string | null>(null);
const successMsg = ref<string | null>(null);
const uploadMsg = ref<string | null>(null);

const form = reactive({
  date: new Date(),

  // composición
  weightKg: '' as string | number,
  bodyFatPct: '' as string | number,
  musclePct: '' as string | number,
  waterPct: '' as string | number,
  visceralFat: '' as string | number,
  boneMassKg: '' as string | number,
  bmrKcal: '' as string | number,

  // torso
  neckCm: '' as string | number,
  shouldersCm: '' as string | number,
  chestCm: '' as string | number,
  underChestCm: '' as string | number,
  waistCm: '' as string | number,
  abdomenCm: '' as string | number,
  hipsCm: '' as string | number,

  // brazos
  armRelaxedLeftCm: '' as string | number,
  armRelaxedRightCm: '' as string | number,
  armFlexedLeftCm: '' as string | number,
  armFlexedRightCm: '' as string | number,
  forearmLeftCm: '' as string | number,
  forearmRightCm: '' as string | number,

  // piernas
  thighLeftCm: '' as string | number,
  thighRightCm: '' as string | number,
  calfLeftCm: '' as string | number,
  calfRightCm: '' as string | number,

  notes: '',
  measurementProtocol: 'navel' as 'navel' | 'natural_waist',
  photosCsv: '',
});

function n(v: string | number | null | undefined): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function normalizePhotos(csv: string): string[] | null {
  const items = csv
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

const currentPhotoUrls = computed(() => normalizePhotos(form.photosCsv) ?? []);

function setPhotoUrls(urls: string[]) {
  form.photosCsv = urls.join('\n');
}

function removePhoto(index: number) {
  const next = [...currentPhotoUrls.value];
  next.splice(index, 1);
  setPhotoUrls(next);
}

async function onPhotoFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input?.files ? Array.from(input.files) : [];
  if (!files.length) return;

  uploadMsg.value = null;
  formError.value = null;
  uploadingPhotos.value = true;

  try {
    const next = [...currentPhotoUrls.value];
    for (const file of files) {
      const url = await uploadMetricPhotoToR2(file);
      next.push(url);
    }
    setPhotoUrls(next);
    uploadMsg.value = t('client.metrics.uploadSuccess', { n: files.length });
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : t('client.metrics.uploadError');
  } finally {
    uploadingPhotos.value = false;
    input.value = '';
  }
}

function resetForm() {
  formMode.value = 'create';
  editingId.value = null;
  formError.value = null;
  successMsg.value = null;

  form.date = new Date();

  const keys = Object.keys(form) as (keyof typeof form)[];
  for (const k of keys) {
    if (k === 'date') continue;
    if (k === 'measurementProtocol') (form[k] as string) = 'navel';
    else (form[k] as string) = '';
  }
  form.notes = '';
  form.photosCsv = '';
}

function fillFormFromEntry(e: BodyMetricsEntry) {
  formMode.value = 'edit';
  editingId.value = e.id ?? null;
  formError.value = null;
  successMsg.value = null;

  form.date = toJsDate(e.date) ?? new Date();

  form.weightKg = e.weightKg ?? '';
  form.bodyFatPct = e.bodyFatPct ?? '';
  form.musclePct = e.musclePct ?? '';
  form.waterPct = e.waterPct ?? '';
  form.visceralFat = e.visceralFat ?? '';
  form.boneMassKg = e.boneMassKg ?? '';
  form.bmrKcal = e.bmrKcal ?? '';

  form.neckCm = e.neckCm ?? '';
  form.shouldersCm = e.shouldersCm ?? '';
  form.chestCm = e.chestCm ?? '';
  form.underChestCm = e.underChestCm ?? '';
  form.waistCm = e.waistCm ?? '';
  form.abdomenCm = e.abdomenCm ?? '';
  form.hipsCm = e.hipsCm ?? '';

  form.armRelaxedLeftCm = e.armRelaxedLeftCm ?? '';
  form.armRelaxedRightCm = e.armRelaxedRightCm ?? '';
  form.armFlexedLeftCm = e.armFlexedLeftCm ?? '';
  form.armFlexedRightCm = e.armFlexedRightCm ?? '';
  form.forearmLeftCm = e.forearmLeftCm ?? '';
  form.forearmRightCm = e.forearmRightCm ?? '';

  form.thighLeftCm = e.thighLeftCm ?? '';
  form.thighRightCm = e.thighRightCm ?? '';
  form.calfLeftCm = e.calfLeftCm ?? '';
  form.calfRightCm = e.calfRightCm ?? '';

  form.notes = e.notes ?? '';
  form.measurementProtocol = e.measurementProtocol ?? 'navel';
  form.photosCsv = (e.photos ?? []).join('\n');
}

function validateForm(): string | null {
  const fat = n(form.bodyFatPct);
  if (fat != null && (fat < 2 || fat > 70))
    return t('client.metrics.validation.fatRange');
  const weight = n(form.weightKg);
  if (weight != null && (weight < 20 || weight > 400))
    return t('client.metrics.validation.weightRange');

  const hasAny =
    [
      form.weightKg,
      form.bodyFatPct,
      form.waistCm,
      form.abdomenCm,
      form.hipsCm,
      form.chestCm,
    ].some((v) => n(v) != null) ||
    !!form.notes?.trim() ||
    !!normalizePhotos(form.photosCsv);

  if (!hasAny)
    return t('client.metrics.validation.needsData');
  return null;
}

const loading = computed(
  () => metricsStore.loadingByClient[resolvedClientId.value] ?? false,
);
const error = computed(
  () => metricsStore.errorByClient[resolvedClientId.value] ?? null,
);

const metrics = computed(
  () => metricsStore.getClientMetrics(resolvedClientId.value) ?? [],
);
const metricsSortedDesc = computed(() => {
  const rows = [...metrics.value];
  rows.sort((a, b) => {
    const da = toJsDate(a.date)?.getTime() ?? 0;
    const db = toJsDate(b.date)?.getTime() ?? 0;
    return db - da;
  });
  return rows;
});

const hasMetrics = computed(() => metrics.value.length > 0);

const weightDelta = computed(() =>
  metricsStore.getDelta(resolvedClientId.value, 'weightKg'),
);
const fatDelta = computed(() =>
  metricsStore.getDelta(resolvedClientId.value, 'bodyFatPct'),
);
const waistDelta = computed(() =>
  metricsStore.getDelta(resolvedClientId.value, 'waistCm'),
);
const abdomenDelta = computed(() =>
  metricsStore.getDelta(resolvedClientId.value, 'abdomenCm'),
);

// Sparkline data (últimos 6 puntos por métrica)
const weightSpark = computed(() => metricsStore.getSeries(resolvedClientId.value, 'weightKg', 6));
const fatSpark = computed(() => metricsStore.getSeries(resolvedClientId.value, 'bodyFatPct', 6));
const waistSpark = computed(() => metricsStore.getSeries(resolvedClientId.value, 'waistCm', 6));
const abdomenSpark = computed(() => metricsStore.getSeries(resolvedClientId.value, 'abdomenCm', 6));

function sparkPath(pts: Array<{ value: number }>, w = 64, h = 24): string {
  if (pts.length < 2) return '';
  const vals = pts.map(p => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const coords = vals.map((v, i) => {
    const x = ((i / (vals.length - 1)) * w).toFixed(1);
    const y = (h - ((v - min) / range) * h).toFixed(1);
    return `${x},${y}`;
  });
  return 'M ' + coords.join(' L ');
}

// Trend helpers
function trendClass(change: number | null, decreaseGood = false): string {
  if (change == null || change === 0) return 'text-muted-foreground';
  const isPositive = change > 0;
  if (decreaseGood) return isPositive ? 'text-destructive' : 'text-success';
  return 'text-muted-foreground';
}

function trendArrow(change: number | null): string {
  if (change == null || change === 0) return '';
  return change > 0 ? '↑' : '↓';
}

const latestPhotos = computed(() => {
  const last = metricsSortedDesc.value.find(
    (e) => Array.isArray(e.photos) && e.photos.length,
  );
  return last?.photos ?? [];
});

function fmt(v: string | number | null | undefined, suffix = '') {
  if (v === null || v === undefined) return '—';
  return `${v}${suffix}`;
}

function fmtChange(v: number | null) {
  if (v == null) return '';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}`;
}

function fmtDate(d: string | Date) {
  const js = toJsDate(d);
  if (!js) return '—';
  return js.toLocaleDateString();
}

async function load() {
  if (!resolvedClientId.value) return;
  await metricsStore.loadClientMetrics(resolvedClientId.value);
}

async function onSubmit() {
  formError.value = null;
  successMsg.value = null;

  const errMsg = validateForm();
  if (errMsg) {
    formError.value = errMsg;
    return;
  }

  saving.value = true;
  try {
    const payloadBase: Omit<BodyMetricsEntry, 'id'> = {
      clientId: resolvedClientId.value,
      date: form.date,

      weightKg: n(form.weightKg),
      bodyFatPct: n(form.bodyFatPct),
      musclePct: n(form.musclePct),
      waterPct: n(form.waterPct),
      visceralFat: n(form.visceralFat),
      boneMassKg: n(form.boneMassKg),
      bmrKcal: n(form.bmrKcal),

      neckCm: n(form.neckCm),
      shouldersCm: n(form.shouldersCm),
      chestCm: n(form.chestCm),
      underChestCm: n(form.underChestCm),
      waistCm: n(form.waistCm),
      abdomenCm: n(form.abdomenCm),
      hipsCm: n(form.hipsCm),

      armRelaxedLeftCm: n(form.armRelaxedLeftCm),
      armRelaxedRightCm: n(form.armRelaxedRightCm),
      armFlexedLeftCm: n(form.armFlexedLeftCm),
      armFlexedRightCm: n(form.armFlexedRightCm),
      forearmLeftCm: n(form.forearmLeftCm),
      forearmRightCm: n(form.forearmRightCm),

      thighLeftCm: n(form.thighLeftCm),
      thighRightCm: n(form.thighRightCm),
      calfLeftCm: n(form.calfLeftCm),
      calfRightCm: n(form.calfRightCm),

      notes: form.notes?.trim() || null,
      measurementProtocol: form.measurementProtocol ?? 'navel',
      photos: normalizePhotos(form.photosCsv),
    };

    if (formMode.value === 'create') {
      await metricsStore.addEntry(payloadBase);
      successMsg.value = t('client.metrics.validation.saved');
      resetForm();
      await metricsStore.loadClientMetrics(resolvedClientId.value);
    } else {
      const id = editingId.value;
      if (!id) throw new Error('No entry id to update');
      await metricsStore.updateEntry(resolvedClientId.value, id, payloadBase as Partial<BodyMetricsEntry>);
      successMsg.value = t('client.metrics.validation.updated');
      resetForm();
    }
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : t('common.error');
  } finally {
    saving.value = false;
  }
}

async function onDelete(entryId: string) {
  const ok = confirm(t('client.metrics.validation.deleteConfirm'));
  if (!ok) return;
  try {
    await metricsStore.removeEntry(resolvedClientId.value, entryId);
    if (editingId.value === entryId) resetForm();
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : t('client.metrics.validation.deleteError'));
  }
}

watch(
  () => resolvedClientId.value,
  async (id) => {
    resetForm();
    if (id) await load();
  },
  { immediate: true },
);

function handleTableSelect(row: BodyMetricsEntry) {
  if (isClient.value) return;
  fillFormFromEntry(row);
  activeTab.value = 'composition';
}

function goToRegister() {
  resetForm();
  activeTab.value = isClient.value ? 'mymeasurements' : 'composition';
}

// Tab definitions
const clientTabs = computed(() => [
  { key: 'overview' as TabKey, label: t('client.metrics.tabs.overview') },
  { key: 'mymeasurements' as TabKey, label: t('client.metrics.tabs.myMeasurements') },
  { key: 'photos' as TabKey, label: t('client.metrics.tabs.photos') },
  { key: 'history' as TabKey, label: t('client.metrics.tabs.history') },
]);

const trainerTabs = computed(() => [
  { key: 'overview' as TabKey, label: t('client.metrics.tabs.overview') },
  { key: 'composition' as TabKey, label: t('client.metrics.tabs.composition') },
  { key: 'measurements' as TabKey, label: t('client.metrics.tabs.measurements') },
  { key: 'photos' as TabKey, label: t('client.metrics.tabs.photos') },
  { key: 'history' as TabKey, label: t('client.metrics.tabs.history') },
]);

const tabs = computed(() => isClient.value ? clientTabs.value : trainerTabs.value);

onMounted(load);
</script>

<template>
  <div class="space-y-5">

    <!-- ══════════════════ HERO (standalone only) ══════════════════ -->
    <div
      v-if="isStandalone"
      class="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card px-4 py-6 sm:px-6 sm:py-8"
    >
      <p class="text-xs font-semibold uppercase tracking-widest text-primary">
        {{ t('client.metrics.hero.label') }}
      </p>
      <h1 class="mt-1 text-2xl font-black text-foreground sm:text-3xl">
        {{ t('client.metrics.hero.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ t('client.metrics.hero.subtitle') }}
      </p>
    </div>

    <!-- ══════════════════ MAIN CARD ══════════════════ -->
    <div class="space-y-5 rounded-3xl border border-border/70 bg-gradient-to-b from-card to-card/70 p-4 shadow-sm sm:p-6">

      <!-- Header + tabs -->
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="text-lg font-semibold text-foreground">{{ t('client.metrics.title') }}</div>
          <div class="text-sm text-muted-foreground">{{ t('client.metrics.subtitle') }}</div>
        </div>

        <!-- Unified tab bar -->
        <div class="flex gap-1.5 overflow-x-auto pb-1 whitespace-nowrap">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 border"
            :class="activeTab === tab.key
              ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
              : 'border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Loading / Error -->
      <div v-if="loading" class="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
        <svg class="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm text-muted-foreground">{{ t('client.metrics.loading') }}</span>
      </div>
      <div v-else-if="error" class="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {{ error }}
      </div>

      <!-- ==================== RESUMEN ==================== -->
      <template v-if="activeTab === 'overview'">

        <!-- Empty state -->
        <div v-if="!loading && !hasMetrics" class="flex flex-col items-center justify-center py-12 text-center">
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg class="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-foreground">{{ t('client.metrics.empty.title') }}</h3>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">{{ t('client.metrics.empty.desc') }}</p>
          <button
            class="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            @click="goToRegister"
          >
            {{ t('client.metrics.empty.cta') }}
          </button>
        </div>

        <!-- Metric overview cards -->
        <div v-else class="space-y-4">

          <!-- 3D Body Scanner -->
          <BodyRender :client-id="resolvedClientId" class="hidden sm:block" />

          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">

            <!-- Peso -->
            <div class="group relative overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-4 transition-shadow hover:shadow-md">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <svg class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
                </svg>
                {{ t('client.metrics.stats.weight') }}
              </div>
              <div class="mt-1 text-2xl font-bold text-foreground">
                {{ fmt(weightDelta?.lastValue, ' kg') }}
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <span v-if="weightDelta?.change != null" class="text-xs font-medium" :class="trendClass(weightDelta?.change ?? null, false)">
                  {{ trendArrow(weightDelta?.change ?? null) }}
                  {{ fmtChange(weightDelta?.change ?? null) }} kg
                </span>
                <svg v-if="weightSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-blue-500/70">
                  <path :d="sparkPath(weightSpark)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
            </div>

            <!-- % Grasa -->
            <div class="group relative overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-4 transition-shadow hover:shadow-md">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <svg class="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
                </svg>
                {{ t('client.metrics.stats.fatPct') }}
              </div>
              <div class="mt-1 text-2xl font-bold text-foreground">
                {{ fmt(fatDelta?.lastValue, ' %') }}
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <span v-if="fatDelta?.change != null" class="text-xs font-medium" :class="trendClass(fatDelta?.change ?? null, true)">
                  {{ trendArrow(fatDelta?.change ?? null) }}
                  {{ fmtChange(fatDelta?.change ?? null) }}%
                </span>
                <svg v-if="fatSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-orange-500/70">
                  <path :d="sparkPath(fatSpark)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
            </div>

            <!-- Cintura -->
            <div class="group relative overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-4 transition-shadow hover:shadow-md">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <svg class="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                {{ t('client.metrics.stats.waist') }}
              </div>
              <div class="mt-1 text-2xl font-bold text-foreground">
                {{ fmt(waistDelta?.lastValue, ' cm') }}
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <span v-if="waistDelta?.change != null" class="text-xs font-medium" :class="trendClass(waistDelta?.change ?? null, true)">
                  {{ trendArrow(waistDelta?.change ?? null) }}
                  {{ fmtChange(waistDelta?.change ?? null) }} cm
                </span>
                <svg v-if="waistSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-yellow-500/70">
                  <path :d="sparkPath(waistSpark)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
            </div>

            <!-- Abdomen -->
            <div class="group relative overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-4 transition-shadow hover:shadow-md">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <svg class="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm0 5v4m0 0l-3 3m3-3l3 3m-3-3v7" />
                </svg>
                {{ t('client.metrics.stats.abdomen') }}
              </div>
              <div class="mt-1 text-2xl font-bold text-foreground">
                {{ fmt(abdomenDelta?.lastValue, ' cm') }}
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <span v-if="abdomenDelta?.change != null" class="text-xs font-medium" :class="trendClass(abdomenDelta?.change ?? null, true)">
                  {{ trendArrow(abdomenDelta?.change ?? null) }}
                  {{ fmtChange(abdomenDelta?.change ?? null) }} cm
                </span>
                <svg v-if="abdomenSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-purple-500/70">
                  <path :d="sparkPath(abdomenSpark)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Quick register CTA -->
          <div class="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div>
              <p class="text-sm font-medium text-foreground">{{ t('client.metrics.registerNow') }}</p>
              <p class="text-xs text-muted-foreground">{{ t('client.metrics.history.tip') }}</p>
            </div>
            <button
              class="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              @click="goToRegister"
            >
              {{ t('client.metrics.registerNow') }}
            </button>
          </div>

          <!-- Volume + Adherence -->
          <div class="grid gap-4 lg:grid-cols-2">
            <WeeklyVolumeChart :client-id="resolvedClientId" />
            <AdherenceCard :client-id="resolvedClientId" />
          </div>

          <!-- Latest photos -->
          <div class="rounded-2xl border border-border/70 bg-background/50 p-4">
            <div class="font-semibold mb-2 text-foreground">{{ t('client.metrics.latestPhotos') }}</div>
            <div v-if="!latestPhotos.length" class="flex flex-col items-center py-6 text-center">
              <svg class="h-10 w-10 text-muted-foreground/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p class="text-sm text-muted-foreground">{{ t('client.metrics.noPhotos') }}</p>
              <p class="mt-1 text-xs text-muted-foreground/70">{{ t('client.metrics.photoTip') }}</p>
            </div>
            <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              <a
                v-for="(url, i) in latestPhotos"
                :key="url + i"
                :href="url"
                target="_blank"
                class="block overflow-hidden rounded-xl border border-border/60 transition-shadow hover:shadow-md"
              >
                <img :src="url" class="w-full aspect-[3/4] object-cover" loading="lazy" />
              </a>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== COMPOSICIÓN (solo trainer) ==================== -->
      <div
        v-if="activeTab === 'composition' && !isClient"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div class="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3">
          <div>
            <div class="font-semibold text-foreground">{{ t('client.metrics.composition.title') }}</div>
            <div class="text-sm text-muted-foreground">{{ t('client.metrics.composition.desc') }}</div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.composition.weightKg') }}
              <input v-model="form.weightKg" type="number" step="0.1" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.composition.bodyFatPct') }}
              <input v-model="form.bodyFatPct" type="number" step="0.1" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.composition.musclePct') }}
              <input v-model="form.musclePct" type="number" step="0.1" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.composition.waterPct') }}
              <input v-model="form.waterPct" type="number" step="0.1" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.composition.visceralFat') }}
              <input v-model="form.visceralFat" type="number" step="0.1" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.composition.boneMassKg') }}
              <input v-model="form.boneMassKg" type="number" step="0.1" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground col-span-2">
              {{ t('client.metrics.composition.bmrKcal') }}
              <input v-model="form.bmrKcal" type="number" step="1" class="metric-input" />
            </label>
          </div>
        </div>

        <div class="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3">
          <div class="font-semibold text-foreground">{{ t('client.metrics.record.title') }}</div>

          <label class="text-sm text-muted-foreground block">
            {{ t('client.metrics.record.date') }}
            <input
              :value="toYmdLocal(form.date)"
              type="date"
              class="metric-input"
              @input="(e: Event) => (form.date = parseYmdLocal((e.target as HTMLInputElement).value))"
            />
          </label>

          <label class="text-sm text-muted-foreground block">
            {{ t('client.metrics.record.protocol') }}
            <select v-model="form.measurementProtocol" class="metric-input">
              <option value="navel">{{ t('client.metrics.record.protocolNavel') }}</option>
              <option value="natural_waist">{{ t('client.metrics.record.protocolNatural') }}</option>
            </select>
          </label>

          <label class="text-sm text-muted-foreground block">
            {{ t('client.metrics.record.notes') }}
            <textarea v-model="form.notes" rows="4" class="metric-input" :placeholder="t('client.metrics.record.notesPlaceholder')" />
          </label>

          <label class="text-sm text-muted-foreground block">
            {{ t('client.metrics.record.photos') }}
            <textarea v-model="form.photosCsv" rows="3" class="metric-input" :placeholder="t('client.metrics.record.photosPlaceholder')" />
          </label>

          <div v-if="formError" class="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{{ formError }}</div>
          <div v-if="successMsg" class="rounded-lg bg-success/10 p-2.5 text-sm text-success">{{ successMsg }}</div>

          <div class="flex gap-2 pt-1">
            <button
              class="flex-1 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              :disabled="saving"
              @click="onSubmit"
            >
              {{ saving ? t('client.metrics.saving') : formMode === 'create' ? t('client.metrics.saveMetric') : t('client.metrics.saveChanges') }}
            </button>
            <button
              class="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              :disabled="saving"
              @click="resetForm"
            >
              {{ t('client.metrics.clear') }}
            </button>
          </div>

          <div v-if="formMode === 'edit'" class="text-xs text-muted-foreground">
            {{ t('client.metrics.editing') }} {{ editingId }}
          </div>
        </div>
      </div>

      <!-- ==================== PERÍMETROS (solo trainer) ==================== -->
      <div
        v-if="activeTab === 'measurements' && !isClient"
        class="space-y-4"
      >
        <div class="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-4">
          <div>
            <div class="font-semibold text-foreground">{{ t('client.metrics.measurements.title') }}</div>
            <div class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.desc') }}</div>
          </div>

          <!-- Torso -->
          <div class="rounded-xl border border-border/50 p-3 space-y-2">
            <div class="flex items-center gap-2 font-semibold text-sm text-foreground">
              <svg class="h-4 w-4 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm0 5v4m-3 7l-2 5m8-5l2 5" />
              </svg>
              {{ t('client.metrics.measurements.torso') }}
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.neck') }} <input v-model="form.neckCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.shoulders') }} <input v-model="form.shouldersCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.chest') }} <input v-model="form.chestCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.underChest') }} <input v-model="form.underChestCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.waist') }} <input v-model="form.waistCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.abdomen') }} <input v-model="form.abdomenCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.hips') }} <input v-model="form.hipsCm" type="number" step="0.1" class="metric-input" /></label>
            </div>
          </div>

          <!-- Brazos -->
          <div class="rounded-xl border border-border/50 p-3 space-y-2">
            <div class="flex items-center gap-2 font-semibold text-sm text-foreground">
              <svg class="h-4 w-4 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              {{ t('client.metrics.measurements.arms') }}
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.armRelaxedLeft') }} <input v-model="form.armRelaxedLeftCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.armRelaxedRight') }} <input v-model="form.armRelaxedRightCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.armFlexedLeft') }} <input v-model="form.armFlexedLeftCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.armFlexedRight') }} <input v-model="form.armFlexedRightCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.forearmLeft') }} <input v-model="form.forearmLeftCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.forearmRight') }} <input v-model="form.forearmRightCm" type="number" step="0.1" class="metric-input" /></label>
            </div>
          </div>

          <!-- Piernas -->
          <div class="rounded-xl border border-border/50 p-3 space-y-2">
            <div class="flex items-center gap-2 font-semibold text-sm text-foreground">
              <svg class="h-4 w-4 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 0l-3 3m3-3l3 3m-3-3v7m-3-4l-2 5m8-5l2 5" />
              </svg>
              {{ t('client.metrics.measurements.legs') }}
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.thighLeft') }} <input v-model="form.thighLeftCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.thighRight') }} <input v-model="form.thighRightCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.calfLeft') }} <input v-model="form.calfLeftCm" type="number" step="0.1" class="metric-input" /></label>
              <label class="text-sm text-muted-foreground">{{ t('client.metrics.measurements.calfRight') }} <input v-model="form.calfRightCm" type="number" step="0.1" class="metric-input" /></label>
            </div>
          </div>
        </div>

        <div v-if="formError" class="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{{ formError }}</div>
        <div v-if="successMsg" class="rounded-lg bg-success/10 p-2.5 text-sm text-success">{{ successMsg }}</div>

        <div class="flex gap-2">
          <button
            class="flex-1 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            :disabled="saving"
            @click="onSubmit"
          >
            {{ saving ? t('client.metrics.saving') : formMode === 'create' ? t('client.metrics.saveMetric') : t('client.metrics.saveChanges') }}
          </button>
          <button
            class="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            :disabled="saving"
            @click="resetForm"
          >
            {{ t('client.metrics.clear') }}
          </button>
        </div>
      </div>

      <!-- ==================== MIS MEDIDAS (solo cliente) ==================== -->
      <div
        v-if="activeTab === 'mymeasurements' && isClient"
        class="space-y-4"
      >
        <!-- Section 1: Key metrics -->
        <div class="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-4">
          <div class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
              </svg>
            </div>
            <div>
              <div class="font-semibold text-foreground">{{ t('client.metrics.myMeasurements.title') }}</div>
              <div class="text-sm text-muted-foreground">{{ t('client.metrics.myMeasurements.desc') }}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.myMeasurements.weightKg') }}
              <input v-model="form.weightKg" type="number" step="0.1" placeholder="72.5" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.myMeasurements.fatPct') }}
              <input v-model="form.bodyFatPct" type="number" step="0.1" placeholder="18.5" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.myMeasurements.waist') }}
              <input v-model="form.waistCm" type="number" step="0.1" placeholder="78" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.myMeasurements.abdomen') }}
              <input v-model="form.abdomenCm" type="number" step="0.1" placeholder="82" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.myMeasurements.hips') }}
              <input v-model="form.hipsCm" type="number" step="0.1" placeholder="95" class="metric-input" />
            </label>
            <label class="text-sm text-muted-foreground">
              {{ t('client.metrics.myMeasurements.chest') }}
              <input v-model="form.chestCm" type="number" step="0.1" placeholder="98" class="metric-input" />
            </label>
          </div>
        </div>

        <!-- Section 2: Details & Photos -->
        <div class="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-4">
          <div class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div class="font-semibold text-foreground">{{ t('client.metrics.myMeasurements.detailsTitle') }}</div>
          </div>

          <label class="text-sm text-muted-foreground block">
            {{ t('client.metrics.record.date') }}
            <input
              :value="toYmdLocal(form.date)"
              type="date"
              class="metric-input"
              @input="(e: Event) => (form.date = parseYmdLocal((e.target as HTMLInputElement).value))"
            />
          </label>

          <label class="text-sm text-muted-foreground block">
            {{ t('client.metrics.myMeasurements.notesOptional') }}
            <textarea v-model="form.notes" rows="3" class="metric-input"
              :placeholder="t('client.metrics.myMeasurements.notesPlaceholder')" />
          </label>

          <label class="text-sm text-muted-foreground block">
            {{ t('client.metrics.myMeasurements.photosOptional') }}
            <textarea v-model="form.photosCsv" rows="2" class="metric-input"
              :placeholder="t('client.metrics.myMeasurements.photosPlaceholder')" />
          </label>

          <!-- Photo upload -->
          <div class="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {{ t('client.metrics.uploadTitle') }}
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              class="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary file:cursor-pointer"
              :disabled="uploadingPhotos"
              @change="onPhotoFilesSelected"
            />
            <p v-if="uploadingPhotos" class="text-xs text-muted-foreground animate-pulse">{{ t('client.metrics.uploading') }}</p>
            <p v-else-if="uploadMsg" class="text-xs text-success">{{ uploadMsg }}</p>
          </div>

          <!-- Photo previews -->
          <div v-if="currentPhotoUrls.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div
              v-for="(url, i) in currentPhotoUrls"
              :key="url + i"
              class="relative overflow-hidden rounded-xl border border-border/60"
            >
              <img :src="url" class="w-full aspect-[3/4] object-cover" loading="lazy" />
              <button
                type="button"
                class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white transition-colors hover:bg-black/80"
                @click="removePhoto(i)"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        <!-- Feedback + Actions -->
        <div v-if="formError" class="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{{ formError }}</div>
        <div v-if="successMsg" class="rounded-xl bg-success/10 p-3 text-sm text-success">{{ successMsg }}</div>

        <div class="flex gap-2">
          <button
            class="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            :disabled="saving"
            @click="onSubmit"
          >
            {{ saving ? t('client.metrics.saving') : t('client.metrics.saveMetric') }}
          </button>
          <button
            class="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            :disabled="saving"
            @click="resetForm"
          >
            {{ t('client.metrics.clear') }}
          </button>
        </div>
      </div>

      <!-- ==================== FOTOS ==================== -->
      <div v-if="activeTab === 'photos'" class="rounded-2xl border border-border/70 bg-background/50 p-4">
        <PhotoTimeline
          :client-id="resolvedClientId"
          type="progress"
          :can-upload="true"
        />
      </div>

      <!-- ==================== HISTORIAL ==================== -->
      <div v-if="activeTab === 'history'" class="space-y-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="font-semibold text-foreground">{{ t('client.metrics.history.title') }}</div>
            <div v-if="!isClient" class="text-sm text-muted-foreground">{{ t('client.metrics.history.clickToEdit') }}</div>
          </div>
          <button
            v-if="!isClient"
            class="rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            @click="resetForm(); activeTab = 'composition';"
          >
            {{ t('client.metrics.history.newMetric') }}
          </button>
          <button
            v-else
            class="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            @click="resetForm(); activeTab = 'mymeasurements';"
          >
            {{ t('client.metrics.history.registerMetric') }}
          </button>
        </div>

        <!-- Empty history -->
        <div v-if="!metricsSortedDesc.length" class="flex flex-col items-center py-8 text-center">
          <svg class="h-10 w-10 text-muted-foreground/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-muted-foreground">{{ t('client.metrics.history.noMetrics') }}</p>
        </div>

        <!-- Mobile cards -->
        <div v-else class="space-y-2 lg:hidden">
          <div
            v-for="row in metricsSortedDesc"
            :key="row.id"
            class="rounded-xl border border-border/70 bg-background/50 p-3 space-y-2"
            :class="!isClient ? 'cursor-pointer transition-shadow hover:shadow-md' : ''"
            @click="() => handleTableSelect(row)"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-foreground">{{ fmtDate(row.date) }}</span>
              <div v-if="!isClient" class="flex gap-1">
                <button
                  class="rounded-lg border border-border px-2 py-1 text-xs transition-colors hover:bg-muted"
                  @click.stop="fillFormFromEntry(row); activeTab = 'composition';"
                >
                  {{ t('common.edit') }}
                </button>
                <button
                  class="rounded-lg border border-destructive/30 px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
                  @click.stop="row.id && onDelete(row.id)"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span class="text-muted-foreground">{{ t('client.metrics.history.weight') }}</span>
                <span class="ml-1 font-medium text-foreground">{{ row.weightKg ?? '—' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">{{ t('client.metrics.history.fatPct') }}</span>
                <span class="ml-1 font-medium text-foreground">{{ row.bodyFatPct ?? '—' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">{{ t('client.metrics.history.waist') }}</span>
                <span class="ml-1 font-medium text-foreground">{{ row.waistCm ?? '—' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">{{ t('client.metrics.history.abdomen') }}</span>
                <span class="ml-1 font-medium text-foreground">{{ row.abdomenCm ?? '—' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">{{ t('client.metrics.history.hips') }}</span>
                <span class="ml-1 font-medium text-foreground">{{ row.hipsCm ?? '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop table -->
        <div v-if="metricsSortedDesc.length" class="hidden lg:block overflow-x-auto rounded-xl border border-border/70">
          <table class="w-full min-w-[720px] text-sm">
            <thead class="bg-muted/50">
              <tr>
                <th class="text-left p-2.5 font-medium text-muted-foreground">{{ t('client.metrics.history.date') }}</th>
                <th class="text-left p-2.5 font-medium text-muted-foreground">{{ t('client.metrics.history.weight') }}</th>
                <th class="text-left p-2.5 font-medium text-muted-foreground">{{ t('client.metrics.history.fatPct') }}</th>
                <th class="text-left p-2.5 font-medium text-muted-foreground">{{ t('client.metrics.history.waist') }}</th>
                <th class="text-left p-2.5 font-medium text-muted-foreground">{{ t('client.metrics.history.abdomen') }}</th>
                <th class="text-left p-2.5 font-medium text-muted-foreground">{{ t('client.metrics.history.hips') }}</th>
                <th v-if="!isClient" class="text-left p-2.5 font-medium text-muted-foreground">{{ t('client.metrics.history.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in metricsSortedDesc"
                :key="row.id"
                class="border-t border-border/50 transition-colors"
                :class="!isClient ? 'hover:bg-muted/30 cursor-pointer' : ''"
                @click="() => handleTableSelect(row)"
              >
                <td class="p-2.5 font-medium text-foreground">{{ fmtDate(row.date) }}</td>
                <td class="p-2.5">{{ row.weightKg ?? '—' }}</td>
                <td class="p-2.5">{{ row.bodyFatPct ?? '—' }}</td>
                <td class="p-2.5">{{ row.waistCm ?? '—' }}</td>
                <td class="p-2.5">{{ row.abdomenCm ?? '—' }}</td>
                <td class="p-2.5">{{ row.hipsCm ?? '—' }}</td>
                <td v-if="!isClient" class="p-2.5">
                  <div class="flex gap-1">
                    <button
                      class="rounded-lg border border-border px-2 py-1 text-xs transition-colors hover:bg-muted"
                      @click.stop="fillFormFromEntry(row); activeTab = 'composition';"
                    >
                      {{ t('common.edit') }}
                    </button>
                    <button
                      class="rounded-lg border border-destructive/30 px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
                      @click.stop="row.id && onDelete(row.id)"
                    >
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="text-xs text-muted-foreground">
          {{ t('client.metrics.history.tip') }}
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.metric-input {
  display: block;
  margin-top: 0.25rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background-color: var(--background);
  padding: 0.5rem 0.75rem;
  color: var(--foreground);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.metric-input::placeholder {
  color: color-mix(in oklch, var(--muted-foreground) 50%, transparent);
}
.metric-input:focus {
  border-color: color-mix(in oklch, var(--primary) 50%, transparent);
  outline: none;
  box-shadow: 0 0 0 1px color-mix(in oklch, var(--primary) 30%, transparent);
}
</style>
