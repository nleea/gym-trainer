import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from "./stores/auth";
import { registerSW } from 'virtual:pwa-register'
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import { setupCalendar } from 'v-calendar'
import { i18n } from './plugins/i18n'
import '../app/globals.css'

registerSW({
  onNeedRefresh() {
    console.log('Nueva versión disponible')
  },
  onOfflineReady() {
    console.log('Listo para offline')
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
});
app.use(ToastService);
app.use(setupCalendar, {})
const authStore = useAuthStore()
authStore.initAuthListener()

app.mount('#app')
