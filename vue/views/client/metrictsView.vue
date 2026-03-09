<!-- src/components/ClientMetricsView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMetricsStore } from '@/stores/metrics.store';
import type { BodyMetricsEntry } from '@/types';
import { parseYmdLocal, toJsDate, toYmdLocal } from '../../../lib/utils';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from 'vue-i18n';
import { uploadMetricPhotoToR2 } from '../../repo/metricsrepo';
import PhotoTimeline from '@/components/photos/PhotoTimeline.vue'

const { t } = useI18n();

const props = defineProps<{ clientId: string }>();

const metricsStore = useMetricsStore();
const authStore = useAuthStore();

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
  weightKg: '' as any,
  bodyFatPct: '' as any,
  musclePct: '' as any,
  waterPct: '' as any,
  visceralFat: '' as any,
  boneMassKg: '' as any,
  bmrKcal: '' as any,

  // torso
  neckCm: '' as any,
  shouldersCm: '' as any,
  chestCm: '' as any,
  underChestCm: '' as any,
  waistCm: '' as any,
  abdomenCm: '' as any,
  hipsCm: '' as any,

  // brazos
  armRelaxedLeftCm: '' as any,
  armRelaxedRightCm: '' as any,
  armFlexedLeftCm: '' as any,
  armFlexedRightCm: '' as any,
  forearmLeftCm: '' as any,
  forearmRightCm: '' as any,

  // piernas
  thighLeftCm: '' as any,
  thighRightCm: '' as any,
  calfLeftCm: '' as any,
  calfRightCm: '' as any,

  notes: '',
  measurementProtocol: 'navel' as 'navel' | 'natural_waist',
  photosCsv: '',
});

function n(v: any): number | null {
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
    uploadMsg.value = `${files.length} foto(s) subida(s) correctamente`;
  } catch (e: any) {
    formError.value = e?.message ?? 'No se pudieron subir las imágenes';
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
    if (k === 'measurementProtocol') form[k] = 'navel' as any;
    else form[k] = '' as any;
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
  form.measurementProtocol = (e.measurementProtocol ?? 'navel') as any;
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
  () => metricsStore.loadingByClient[props.clientId] ?? false,
);
const error = computed(
  () => metricsStore.errorByClient[props.clientId] ?? null,
);

const metrics = computed(
  () => metricsStore.getClientMetrics(props.clientId) ?? [],
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

const weightDelta = computed(() =>
  metricsStore.getDelta(props.clientId, 'weightKg'),
);
const fatDelta = computed(() =>
  metricsStore.getDelta(props.clientId, 'bodyFatPct'),
);
const waistDelta = computed(() =>
  metricsStore.getDelta(props.clientId, 'waistCm'),
);
const abdomenDelta = computed(() =>
  metricsStore.getDelta(props.clientId, 'abdomenCm'),
);

// Sparkline data (últimos 6 puntos por métrica)
const weightSpark = computed(() => metricsStore.getSeries(props.clientId, 'weightKg', 6));
const fatSpark = computed(() => metricsStore.getSeries(props.clientId, 'bodyFatPct', 6));
const waistSpark = computed(() => metricsStore.getSeries(props.clientId, 'waistCm', 6));
const abdomenSpark = computed(() => metricsStore.getSeries(props.clientId, 'abdomenCm', 6));

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
// "decreaseGood" = grasa/cintura/abdomen: bajar es verde
function trendClass(change: number | null, decreaseGood = false): string {
  if (change == null || change === 0) return 'text-muted-foreground';
  const isPositive = change > 0;
  if (decreaseGood) return isPositive ? 'text-destructive' : 'text-success';
  return 'text-muted-foreground'; // peso: neutro
}

function trendArrow(change: number | null): string {
  if (change == null || change === 0) return '→';
  return change > 0 ? '↑' : '↓';
}

const latestPhotos = computed(() => {
  const last = metricsSortedDesc.value.find(
    (e) => Array.isArray(e.photos) && e.photos.length,
  );
  return last?.photos ?? [];
});

function fmt(v: any, suffix = '') {
  if (v === null || v === undefined) return '—';
  return `${v}${suffix}`;
}

function fmtChange(v: number | null) {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}`;
}

function fmtDate(d: any) {
  const js = toJsDate(d);
  if (!js) return '—';
  return js.toLocaleDateString();
}

async function load() {
  if (!props.clientId) return;
  await metricsStore.loadClientMetrics(props.clientId);
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
      clientId: props.clientId,
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
      await metricsStore.loadClientMetrics(props.clientId);
    } else {
      const id = editingId.value;
      if (!id) throw new Error('No entry id to update');
      await metricsStore.updateEntry(props.clientId, id, payloadBase as any);
      successMsg.value = t('client.metrics.validation.updated');
      resetForm();
    }
  } catch (e: any) {
    formError.value = e?.message ?? t('common.error');
  } finally {
    saving.value = false;
  }
}

async function onDelete(entryId: string) {
  const ok = confirm(t('client.metrics.validation.deleteConfirm'));
  if (!ok) return;
  try {
    await metricsStore.removeEntry(props.clientId, entryId);
    if (editingId.value === entryId) resetForm();
  } catch (e: any) {
    alert(e?.message ?? t('client.metrics.validation.deleteError'));
  }
}

watch(
  () => props.clientId,
  async (id) => {
    resetForm();
    if (id) await load();
  },
  { immediate: true },
);

function handlrerTableSelect(row: BodyMetricsEntry) {
  if (isClient.value) return;
  fillFormFromEntry(row);
  activeTab.value = 'composition';
}

onMounted(load);


</script>

<template>
  <div class="space-y-5 rounded-3xl border border-border/70 bg-gradient-to-b from-card to-card/70 p-4 shadow-sm sm:p-6">
    <!-- Header + tabs -->
    <div
      class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <div class="text-lg font-semibold">{{ t('client.metrics.title') }}</div>
        <div class="text-sm opacity-70">
          {{ t('client.metrics.subtitle') }}
        </div>
      </div>

      <!-- Tabs para TRAINER -->
      <div v-if="!isClient" class="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
        <button class="px-3 py-1.5 rounded-lg border" :class="activeTab === 'overview' ? 'font-semibold' : ''" @click="activeTab = 'overview'">
          {{ t('client.metrics.tabs.overview') }}
        </button>
        <button class="px-3 py-1.5 rounded-lg border" :class="activeTab === 'composition' ? 'font-semibold' : ''" @click="activeTab = 'composition'">
          {{ t('client.metrics.tabs.composition') }}
        </button>
        <button class="px-3 py-1.5 rounded-lg border" :class="activeTab === 'measurements' ? 'font-semibold' : ''" @click="activeTab = 'measurements'">
          {{ t('client.metrics.tabs.measurements') }}
        </button>
        <button class="px-3 py-1.5 rounded-lg border" :class="activeTab === 'photos' ? 'font-semibold' : ''" @click="activeTab = 'photos'">
          {{ t('client.metrics.tabs.photos') }}
        </button>
        <button class="px-3 py-1.5 rounded-lg border" :class="activeTab === 'history' ? 'font-semibold' : ''" @click="activeTab = 'history'">
          {{ t('client.metrics.tabs.history') }}
        </button>
      </div>

      <!-- Tabs para CLIENTE -->
      <div v-else class="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
        <button class="px-3 py-1.5 rounded-xl border border-border/70" :class="activeTab === 'overview' ? 'font-semibold bg-primary/10 text-primary' : ''" @click="activeTab = 'overview'">
          {{ t('client.metrics.tabs.overview') }}
        </button>
        <button class="px-3 py-1.5 rounded-xl border border-border/70" :class="activeTab === 'mymeasurements' ? 'font-semibold bg-primary/10 text-primary' : ''" @click="activeTab = 'mymeasurements'">
          {{ t('client.metrics.tabs.myMeasurements') }}
        </button>
        <button class="px-3 py-1.5 rounded-xl border border-border/70" :class="activeTab === 'photos' ? 'font-semibold bg-primary/10 text-primary' : ''" @click="activeTab = 'photos'">
          {{ t('client.metrics.tabs.photos') }}
        </button>
        <button class="px-3 py-1.5 rounded-xl border border-border/70" :class="activeTab === 'history' ? 'font-semibold bg-primary/10 text-primary' : ''" @click="activeTab = 'history'">
          {{ t('client.metrics.tabs.history') }}
        </button>
      </div>
    </div>

    <!-- Load / error -->
    <div v-if="loading" class="p-3 rounded-lg border text-sm opacity-70">
      {{ t('client.metrics.loading') }}
    </div>
    <div v-else-if="error" class="p-3 rounded-lg border text-sm text-red-600">
      {{ error }}
    </div>

    <!-- ==================== RESUMEN ==================== -->
    <div v-if="activeTab === 'overview'" class="space-y-3">
      <div class="metrics-masonry">

        <!-- Peso -->
        <div class="metrics-tile p-4 rounded-2xl border border-border/70 bg-background/50 space-y-1">
          <div class="text-sm opacity-70">{{ t('client.metrics.stats.weight') }}</div>
          <div class="text-2xl font-semibold">
            {{ fmt(weightDelta?.lastValue, ' kg') }}
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-muted-foreground">
              <span :class="trendClass(weightDelta?.change ?? null, false)">
                {{ trendArrow(weightDelta?.change ?? null) }}
              </span>
              {{ fmtChange(weightDelta?.change ?? null) }} kg
            </span>
            <svg v-if="weightSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-blue-500">
              <path :d="sparkPath(weightSpark)" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
        </div>

        <!-- % Grasa -->
        <div class="metrics-tile p-4 rounded-2xl border border-border/70 bg-background/50 space-y-1">
          <div class="text-sm opacity-70">{{ t('client.metrics.stats.fatPct') }}</div>
          <div class="text-2xl font-semibold">
            {{ fmt(fatDelta?.lastValue, ' %') }}
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm" :class="trendClass(fatDelta?.change ?? null, true)">
              {{ trendArrow(fatDelta?.change ?? null) }}
              {{ fmtChange(fatDelta?.change ?? null) }}%
            </span>
            <svg v-if="fatSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-orange-500">
              <path :d="sparkPath(fatSpark)" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
        </div>

        <!-- Cintura -->
        <div class="metrics-tile p-4 rounded-2xl border border-border/70 bg-background/50 space-y-1">
          <div class="text-sm opacity-70">{{ t('client.metrics.stats.waist') }}</div>
          <div class="text-2xl font-semibold">
            {{ fmt(waistDelta?.lastValue, ' cm') }}
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm" :class="trendClass(waistDelta?.change ?? null, true)">
              {{ trendArrow(waistDelta?.change ?? null) }}
              {{ fmtChange(waistDelta?.change ?? null) }} cm
            </span>
            <svg v-if="waistSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-yellow-500">
              <path :d="sparkPath(waistSpark)" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
        </div>

        <!-- Abdomen -->
        <div class="metrics-tile p-4 rounded-2xl border border-border/70 bg-background/50 space-y-1">
          <div class="text-sm opacity-70">{{ t('client.metrics.stats.abdomen') }}</div>
          <div class="text-2xl font-semibold">
            {{ fmt(abdomenDelta?.lastValue, ' cm') }}
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm" :class="trendClass(abdomenDelta?.change ?? null, true)">
              {{ trendArrow(abdomenDelta?.change ?? null) }}
              {{ fmtChange(abdomenDelta?.change ?? null) }} cm
            </span>
            <svg v-if="abdomenSpark.length >= 2" :width="64" :height="24" class="shrink-0 text-purple-500">
              <path :d="sparkPath(abdomenSpark)" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
        </div>
      </div>

      <div class="p-4 rounded-2xl border border-border/70 bg-background/50">
        <div class="font-semibold mb-2">{{ t('client.metrics.latestPhotos') }}</div>
        <div v-if="!latestPhotos.length" class="text-sm opacity-70">
          {{ t('client.metrics.noPhotos') }}
        </div>
        <div v-else class="metrics-photo-masonry">
          <a
            v-for="(url, i) in latestPhotos"
            :key="url + i"
            :href="url"
            target="_blank"
            class="metrics-tile block rounded-xl border border-border/60 overflow-hidden"
          >
            <img :src="url" class="w-full object-cover" />
          </a>
        </div>
        <div class="text-xs opacity-60 mt-2">
          {{ t('client.metrics.photoTip') }}
        </div>
      </div>
    </div>

    <!-- ==================== COMPOSICIÓN (solo trainer) ==================== -->
    <div
      v-if="activeTab === 'composition' && !isClient"
      class="metrics-masonry"
    >
      <div class="p-4 rounded-xl border space-y-2">
        <div class="font-semibold">{{ t('client.metrics.composition.title') }}</div>
        <div class="text-sm opacity-70">
          {{ t('client.metrics.composition.desc') }}
        </div>

        <div class="grid grid-cols-2 gap-2">
          <label class="text-sm">
            {{ t('client.metrics.composition.weightKg') }}
            <input v-model="form.weightKg" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.composition.bodyFatPct') }}
            <input v-model="form.bodyFatPct" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.composition.musclePct') }}
            <input v-model="form.musclePct" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.composition.waterPct') }}
            <input v-model="form.waterPct" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.composition.visceralFat') }}
            <input v-model="form.visceralFat" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.composition.boneMassKg') }}
            <input v-model="form.boneMassKg" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label class="text-sm col-span-2">
            {{ t('client.metrics.composition.bmrKcal') }}
            <input v-model="form.bmrKcal" type="number" step="1" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
        </div>
      </div>

      <div class="p-4 rounded-xl border space-y-2">
        <div class="font-semibold">{{ t('client.metrics.record.title') }}</div>

        <label class="text-sm block">
          {{ t('client.metrics.record.date') }}
          <input
            :value="toYmdLocal(form.date)"
            type="date"
            class="mt-1 w-full border rounded-lg px-3 py-2"
            @input="(e: any) => (form.date = parseYmdLocal(e.target.value))"
          />
        </label>

        <label class="text-sm block">
          {{ t('client.metrics.record.protocol') }}
          <select v-model="form.measurementProtocol" class="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="navel">{{ t('client.metrics.record.protocolNavel') }}</option>
            <option value="natural_waist">{{ t('client.metrics.record.protocolNatural') }}</option>
          </select>
        </label>

        <label class="text-sm block">
          {{ t('client.metrics.record.notes') }}
          <textarea v-model="form.notes" rows="4" class="mt-1 w-full border rounded-lg px-3 py-2" :placeholder="t('client.metrics.record.notesPlaceholder')" />
        </label>

        <label class="text-sm block">
          {{ t('client.metrics.record.photos') }}
          <textarea v-model="form.photosCsv" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2" :placeholder="t('client.metrics.record.photosPlaceholder')" />
        </label>

        <div v-if="formError" class="text-sm text-red-600">{{ formError }}</div>
        <div v-if="successMsg" class="text-sm text-green-700">{{ successMsg }}</div>

        <div class="flex gap-2">
          <button class="px-4 py-2 rounded-lg border font-semibold" :disabled="saving" @click="onSubmit">
            {{ saving ? t('client.metrics.saving') : formMode === 'create' ? t('client.metrics.saveMetric') : t('client.metrics.saveChanges') }}
          </button>
          <button class="px-4 py-2 rounded-lg border" :disabled="saving" @click="resetForm">
            {{ t('client.metrics.clear') }}
          </button>
        </div>

        <div v-if="formMode === 'edit'" class="text-xs opacity-60">
          Editando medición: {{ editingId }}
        </div>
      </div>
    </div>

    <!-- ==================== PERÍMETROS (solo trainer) ==================== -->
    <div
      v-if="activeTab === 'measurements' && !isClient"
      class="p-4 rounded-xl border space-y-4"
    >
      <div>
        <div class="font-semibold">{{ t('client.metrics.measurements.title') }}</div>
        <div class="text-sm opacity-70">
          {{ t('client.metrics.measurements.desc') }}
        </div>
      </div>

      <!-- Torso -->
      <div class="border rounded-xl p-3">
        <div class="font-semibold mb-2">{{ t('client.metrics.measurements.torso') }}</div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <label class="text-sm">{{ t('client.metrics.measurements.neck') }} <input v-model="form.neckCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.shoulders') }} <input v-model="form.shouldersCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.chest') }} <input v-model="form.chestCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.underChest') }} <input v-model="form.underChestCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.waist') }} <input v-model="form.waistCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.abdomen') }} <input v-model="form.abdomenCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.hips') }} <input v-model="form.hipsCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
        </div>
      </div>

      <!-- Brazos -->
      <div class="border rounded-xl p-3">
        <div class="font-semibold mb-2">{{ t('client.metrics.measurements.arms') }}</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label class="text-sm">{{ t('client.metrics.measurements.armRelaxedLeft') }} <input v-model="form.armRelaxedLeftCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.armRelaxedRight') }} <input v-model="form.armRelaxedRightCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.armFlexedLeft') }} <input v-model="form.armFlexedLeftCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.armFlexedRight') }} <input v-model="form.armFlexedRightCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.forearmLeft') }} <input v-model="form.forearmLeftCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.forearmRight') }} <input v-model="form.forearmRightCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
        </div>
      </div>

      <!-- Piernas -->
      <div class="border rounded-xl p-3">
        <div class="font-semibold mb-2">{{ t('client.metrics.measurements.legs') }}</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label class="text-sm">{{ t('client.metrics.measurements.thighLeft') }} <input v-model="form.thighLeftCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.thighRight') }} <input v-model="form.thighRightCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.calfLeft') }} <input v-model="form.calfLeftCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label class="text-sm">{{ t('client.metrics.measurements.calfRight') }} <input v-model="form.calfRightCm" type="number" step="0.1" class="mt-1 w-full border rounded-lg px-3 py-2" /></label>
        </div>
      </div>

      <div class="flex gap-2">
        <button class="px-4 py-2 rounded-lg border font-semibold" :disabled="saving" @click="onSubmit">
          {{ saving ? t('client.metrics.saving') : formMode === 'create' ? t('client.metrics.saveMetric') : t('client.metrics.saveChanges') }}
        </button>
        <button class="px-4 py-2 rounded-lg border" :disabled="saving" @click="resetForm">{{ t('client.metrics.clear') }}</button>
      </div>

      <div v-if="formError" class="text-sm text-red-600">{{ formError }}</div>
      <div v-if="successMsg" class="text-sm text-green-700">{{ successMsg }}</div>
    </div>

    <!-- ==================== MIS MEDIDAS (solo cliente) ==================== -->
    <div
      v-if="activeTab === 'mymeasurements' && isClient"
      class="grid grid-cols-1 lg:grid-cols-2 gap-3"
    >
      <!-- Campos clave -->
      <div class="metrics-tile p-4 rounded-2xl border border-border/70 bg-background/50 space-y-3">
        <div class="font-semibold">{{ t('client.metrics.myMeasurements.title') }}</div>
        <div class="text-sm opacity-70">
          {{ t('client.metrics.myMeasurements.desc') }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm">
            {{ t('client.metrics.myMeasurements.weightKg') }}
            <input v-model="form.weightKg" type="number" step="0.1" placeholder="ej. 72.5"
              class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.myMeasurements.fatPct') }}
            <input v-model="form.bodyFatPct" type="number" step="0.1" placeholder="ej. 18.5"
              class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.myMeasurements.waist') }}
            <input v-model="form.waistCm" type="number" step="0.1" placeholder="ej. 78"
              class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.myMeasurements.abdomen') }}
            <input v-model="form.abdomenCm" type="number" step="0.1" placeholder="ej. 82"
              class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.myMeasurements.hips') }}
            <input v-model="form.hipsCm" type="number" step="0.1" placeholder="ej. 95"
              class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground" />
          </label>
          <label class="text-sm">
            {{ t('client.metrics.myMeasurements.chest') }}
            <input v-model="form.chestCm" type="number" step="0.1" placeholder="ej. 98"
              class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground" />
          </label>
        </div>
      </div>

      <!-- Extras + guardar -->
      <div class="metrics-tile p-4 rounded-2xl border border-border/70 bg-background/50 space-y-3">
        <div class="font-semibold">{{ t('client.metrics.myMeasurements.detailsTitle') }}</div>

        <label class="text-sm block">
          {{ t('client.metrics.record.date') }}
          <input
            :value="toYmdLocal(form.date)"
            type="date"
            class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground"
            @input="(e: any) => (form.date = parseYmdLocal(e.target.value))"
          />
        </label>

        <label class="text-sm block">
          {{ t('client.metrics.myMeasurements.notesOptional') }}
          <textarea v-model="form.notes" rows="3" class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground"
            :placeholder="t('client.metrics.myMeasurements.notesPlaceholder')" />
        </label>

        <label class="text-sm block">
          {{ t('client.metrics.myMeasurements.photosOptional') }}
          <textarea v-model="form.photosCsv" rows="2" class="mt-1 w-full border rounded-lg px-3 py-2 bg-background text-foreground"
            :placeholder="t('client.metrics.myMeasurements.photosPlaceholder')" />
        </label>
        <div class="rounded-xl border border-dashed border-border p-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subir fotos a Cloudflare R2
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            class="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary"
            :disabled="uploadingPhotos"
            @change="onPhotoFilesSelected"
          />
          <p v-if="uploadingPhotos" class="mt-2 text-xs text-muted-foreground">Subiendo imágenes...</p>
          <p v-else-if="uploadMsg" class="mt-2 text-xs text-success">{{ uploadMsg }}</p>
        </div>

        <div v-if="currentPhotoUrls.length" class="metrics-photo-masonry mt-2">
          <div
            v-for="(url, i) in currentPhotoUrls"
            :key="url + i"
            class="metrics-tile relative overflow-hidden rounded-xl border border-border/60"
          >
            <img :src="url" class="w-full object-cover" />
            <button
              type="button"
              class="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white"
              @click="removePhoto(i)"
            >
              ×
            </button>
          </div>
        </div>

        <div v-if="formError" class="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{{ formError }}</div>
        <div v-if="successMsg" class="rounded-lg bg-success/10 p-2 text-sm text-success">{{ successMsg }}</div>

        <div class="flex gap-2">
          <button
            class="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
            :disabled="saving"
            @click="onSubmit"
          >
            {{ saving ? t('client.metrics.saving') : t('client.metrics.saveMetric') }}
          </button>
          <button class="rounded-lg border px-4 py-2 text-sm" :disabled="saving" @click="resetForm">
            {{ t('client.metrics.clear') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== FOTOS ==================== -->
    <div v-if="activeTab === 'photos'" class="p-4 rounded-2xl border border-border/70 bg-background/50">
      <PhotoTimeline
        :client-id="props.clientId"
        type="progress"
        :can-upload="true"
      />
    </div>

    <!-- ==================== HISTORIAL ==================== -->
    <div v-if="activeTab === 'history'" class="p-4 rounded-2xl border border-border/70 bg-background/50 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <div class="font-semibold">{{ t('client.metrics.history.title') }}</div>
          <div v-if="!isClient" class="text-sm opacity-70">{{ t('client.metrics.history.clickToEdit') }}</div>
        </div>
        <!-- Trainer: ir a composición -->
        <button
          v-if="!isClient"
          class="px-3 py-2 rounded-lg border"
          @click="resetForm(); activeTab = 'composition';"
        >
          {{ t('client.metrics.history.newMetric') }}
        </button>
        <!-- Cliente: ir a "Mis medidas" -->
        <button
          v-else
          class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          @click="resetForm(); activeTab = 'mymeasurements';"
        >
          {{ t('client.metrics.history.registerMetric') }}
        </button>
      </div>

      <div v-if="!metricsSortedDesc.length" class="text-sm opacity-70">
        {{ t('client.metrics.history.noMetrics') }}
      </div>

      <div v-else class="overflow-x-auto border rounded-xl">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="bg-black/5">
            <tr>
              <th class="text-left p-2">{{ t('client.metrics.history.date') }}</th>
              <th class="text-left p-2">{{ t('client.metrics.history.weight') }}</th>
              <th class="text-left p-2">{{ t('client.metrics.history.fatPct') }}</th>
              <th class="text-left p-2">{{ t('client.metrics.history.waist') }}</th>
              <th class="text-left p-2">{{ t('client.metrics.history.abdomen') }}</th>
              <th class="text-left p-2">{{ t('client.metrics.history.hips') }}</th>
              <th v-if="!isClient" class="text-left p-2">{{ t('client.metrics.history.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in metricsSortedDesc"
              :key="row.id"
              class="border-t"
              :class="!isClient ? 'hover:bg-black/5 cursor-pointer' : ''"
              @click="() => handlrerTableSelect(row)"
            >
              <td class="p-2">{{ fmtDate(row.date) }}</td>
              <td class="p-2">{{ row.weightKg ?? '—' }}</td>
              <td class="p-2">{{ row.bodyFatPct ?? '—' }}</td>
              <td class="p-2">{{ row.waistCm ?? '—' }}</td>
              <td class="p-2">{{ row.abdomenCm ?? '—' }}</td>
              <td class="p-2">{{ row.hipsCm ?? '—' }}</td>
              <td v-if="!isClient" class="p-2">
                <button
                  class="px-2 py-1 rounded border"
                  @click.stop="fillFormFromEntry(row); activeTab = 'composition';"
                >
                  {{ t('common.edit') }}
                </button>
                <button
                  class="px-2 py-1 rounded border ml-2"
                  @click.stop="row.id && onDelete(row.id)"
                >
                  {{ t('common.delete') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="text-xs opacity-60">
        {{ t('client.metrics.history.tip') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-masonry {
  column-count: 1;
  column-gap: 0.9rem;
}

.metrics-photo-masonry {
  column-count: 2;
  column-gap: 0.6rem;
}

.metrics-tile {
  break-inside: avoid;
  margin-bottom: 0.9rem;
}

@media (min-width: 768px) {
  .metrics-masonry {
    column-count: 2;
  }
  .metrics-photo-masonry {
    column-count: 3;
  }
}

@media (min-width: 1200px) {
  .metrics-masonry {
    column-count: 3;
  }
}
</style>
