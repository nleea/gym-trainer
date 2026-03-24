<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useEvidencesStore } from '../stores/evidences.store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
import { storeToRefs } from 'pinia';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const { logout } = authStore;
const evidencesStore = useEvidencesStore();

const isMobileMenuOpen = ref(false);
const sidebarCollapsed = ref(
  localStorage.getItem('sidebar-collapsed') === 'true',
);

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed.value));
}

const navigation = computed(() => [
  { name: t('nav.client.home'), path: '/client', icon: 'home' },
  {
    name: t('nav.client.training'),
    path: '/client/calendar',
    icon: 'training',
  },
  { name: t('nav.client.log'), path: '/client/daily-log', icon: 'dumbbell' },
  {
    name: t('nav.client.nutrition'),
    path: '/client/nutrition',
    icon: 'clipboard',
  },
  {
    name: t('nav.client.progress'),
    path: '/client/progress',
    icon: 'trending',
  },
  {
    name: t('nav.client.metrics'),
    path: '/client/metrics',
    icon: 'body',
  },
  {
    name: t('nav.client.settings'),
    path: '/client/settings',
    icon: 'settings',
  },
]);

const isActive = (path: string) => {
  if (path === '/client') return route.path === '/client';
  return route.path.startsWith(path);
};

const ownClientId = computed(() => user.value?.client_id ?? user.value?.uid ?? '')
const unviewedEvidenceCount = computed(
  () => evidencesStore.getPendingForClient(ownClientId.value).unviewed_responded || 0,
)

onMounted(async () => {
  if (!ownClientId.value) return
  await evidencesStore.loadPendingCount(ownClientId.value)
})

const handleLogout = async () => {
  await logout();
  await router.replace('/auth/login');
};
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- ── Mobile Header ────────────────────────────────────────────── -->
    <header
      class="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"
        >
          <svg
            class="h-4 w-4 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <span class="text-lg font-bold text-foreground">FitCoach</span>
      </div>

      <div class="flex items-center gap-2">
        <div class="hidden sm:flex items-center gap-2 mr-1">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
          >
            <span class="text-xs font-semibold">{{
              user?.name?.charAt(0) || 'C'
            }}</span>
          </div>
          <span class="text-sm font-medium text-foreground">{{
            user?.name?.split(' ')[0] || 'Cliente'
          }}</span>
        </div>
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="rounded-lg p-2 hover:bg-muted transition-colors"
        >
          <svg
            v-if="!isMobileMenuOpen"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            v-else
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- ── Mobile Dropdown Menu ──────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-if="isMobileMenuOpen"
        class="sticky top-[57px] z-30 max-h-[calc(100dvh-57px)] overflow-y-auto border-b border-border bg-card shadow-lg lg:hidden"
      >
        <nav class="space-y-1 px-4 py-2">
          <RouterLink
            v-for="item in navigation"
            :key="item.path"
            :to="item.path"
            @click="isMobileMenuOpen = false"
            class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            :class="
              isActive(item.path)
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            "
          >
            <!-- icons inline -->
            <svg
              class="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                v-if="item.icon === 'home'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
              <path
                v-else-if="item.icon === 'training'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
              <path
                v-else-if="item.icon === 'dumbbell'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6M9 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 106 0 3 3 0 00-6 0M3 12h2m14 0h2"
              />
              <path
                v-else-if="item.icon === 'clipboard'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
              <path
                v-else-if="item.icon === 'trending'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />

              <path
                v-else-if="item.icon === 'settings'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />

              <path
                v-if="item.icon === 'body'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm0 5v4m0 0l-3 3m3-3l3 3m-3-3v7m-3-4l-2 5m8-5l2 5"
              />
            </svg>
            <span>{{ item.name }}</span>
            <span
              v-if="item.path === '/client/daily-log' && unviewedEvidenceCount > 0"
              class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground"
            >
              {{ unviewedEvidenceCount }}
            </span>
          </RouterLink>
        </nav>
        <div class="border-t border-border px-4 py-3">
          <button
            @click="handleLogout"
            class="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <svg
              class="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- ── Desktop Sidebar ───────────────────────────────────────────── -->
    <aside
      class="fixed left-0 top-0 bottom-0 z-30 hidden flex-col border-r border-border bg-card transition-all duration-300 ease-in-out lg:flex"
      :class="sidebarCollapsed ? 'w-16' : 'w-64'"
    >
      <!-- Brand -->
      <div class="flex h-14 shrink-0 items-center border-b border-border px-3">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary"
        >
          <svg
            class="h-4 w-4 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <span
          class="ml-3 overflow-hidden whitespace-nowrap text-base font-bold text-foreground transition-all duration-300"
          :class="sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
          >FitCoach</span
        >
      </div>

      <!-- Nav items -->
      <nav class="flex-1 overflow-hidden px-2 py-4 space-y-1">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :title="sidebarCollapsed ? item.name : ''"
          class="group flex items-center rounded-lg px-2 py-2.5 transition-colors"
          :class="
            isActive(item.path)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          "
        >
          <svg
            class="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              v-if="item.icon === 'home'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
            <path
              v-else-if="item.icon === 'training'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
            <path
              v-else-if="item.icon === 'dumbbell'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6M9 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 106 0 3 3 0 00-6 0M3 12h2m14 0h2"
            />
            <path
              v-else-if="item.icon === 'clipboard'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
            <path
              v-else-if="item.icon === 'trending'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
            <path
              v-else-if="item.icon === 'settings'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              v-if="item.icon === 'body'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm0 5v4m0 0l-3 3m3-3l3 3m-3-3v7m-3-4l-2 5m8-5l2 5"
            />
          </svg>
          <span
            class="ml-3 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300"
            :class="sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >{{ item.name }}</span
          >
          <span
            v-if="item.path === '/client/daily-log' && unviewedEvidenceCount > 0 && !sidebarCollapsed"
            class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground"
          >
            {{ unviewedEvidenceCount }}
          </span>
        </RouterLink>
      </nav>

      <!-- User + Logout -->
      <div class="shrink-0 space-y-1 border-t border-border px-2 py-3">
        <!-- User info -->
        <div
          class="flex items-center rounded-lg px-2 py-2"
          :title="sidebarCollapsed ? user?.name || 'Cliente' : ''"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground"
          >
            {{ user?.name?.charAt(0) || 'C' }}
          </div>
          <div
            class="ml-3 overflow-hidden transition-all duration-300"
            :class="sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
          >
            <p
              class="whitespace-nowrap text-sm font-semibold text-foreground leading-none"
            >
              {{ user?.name?.split(' ')[0] || 'Cliente' }}
            </p>
            <p
              class="mt-0.5 whitespace-nowrap text-xs text-muted-foreground truncate max-w-[140px]"
            >
              {{ user?.email || '' }}
            </p>
          </div>
        </div>

        <!-- Logout -->
        <button
          @click="handleLogout"
          :title="sidebarCollapsed ? 'Cerrar sesión' : ''"
          class="group flex w-full items-center rounded-lg px-2 py-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <svg
            class="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span
            class="ml-3 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300"
            :class="sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >{{ t('nav.client.logout') }}</span
          >
        </button>

        <!-- Collapse toggle -->
        <button
          @click="toggleSidebar"
          :title="sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'"
          class="flex w-full items-center rounded-lg px-2 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg
            class="h-5 w-5 shrink-0 transition-transform duration-300"
            :class="sidebarCollapsed ? 'rotate-180' : ''"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
          <span
            class="ml-3 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300"
            :class="sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
            >Colapsar menú</span
          >
        </button>
      </div>
    </aside>

    <!-- ── Main Content ──────────────────────────────────────────────── -->
    <main
      class="min-h-screen pb-24 transition-all duration-300 ease-in-out lg:pb-8"
      :class="sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'"
    >
      <div class="mx-auto w-[90%] py-5 sm:py-6">
        <RouterView />
      </div>
    </main>

    <!-- ── Bottom Navigation (Mobile) ───────────────────────────────── -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div class="flex overflow-x-auto px-1">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          class="relative flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 px-1 py-2 transition-colors"
          :class="
            isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
          "
        >
          <svg
            class="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              v-if="item.icon === 'home'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
            <path
              v-else-if="item.icon === 'training'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
            <path
              v-else-if="item.icon === 'dumbbell'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6M9 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 106 0 3 3 0 00-6 0M3 12h2m14 0h2"
            />
            <path
              v-else-if="item.icon === 'clipboard'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
            <path
              v-else-if="item.icon === 'trending'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span class="text-[10px] font-medium truncate">{{ item.name }}</span>
          <span
            v-if="item.path === '/client/daily-log' && unviewedEvidenceCount > 0"
            class="absolute -top-0.5 right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground"
          >
            {{ unviewedEvidenceCount }}
          </span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>
