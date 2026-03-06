import { useToast } from 'primevue/usetoast'

export type ToastType = 'success' | 'info' | 'warn' | 'error'

interface ToastOptions {
  type?: ToastType
  summary?: string
  detail: string
  life?: number
  group?: string
}

export function useAppToast() {
  const toast = useToast()

  function show({
    type = 'info',
    summary,
    detail,
    life = 3000,
    group
  }: ToastOptions) {
    toast.add({
      severity: type,
      summary: summary ?? defaultSummary(type),
      detail,
      life,
      group
    })
  }

  function success(detail: string, life = 3000) {
    show({ type: 'success', detail, life })
  }

  function error(detail: string, life = 4000) {
    show({ type: 'error', detail, life })
  }

  function warn(detail: string, life = 3500) {
    show({ type: 'warn', detail, life })
  }

  function info(detail: string, life = 3000) {
    show({ type: 'info', detail, life })
  }

  function defaultSummary(type: ToastType) {
    switch (type) {
      case 'success':
        return 'Éxito'
      case 'error':
        return 'Error'
      case 'warn':
        return 'Advertencia'
      case 'info':
      default:
        return 'Información'
    }
  }

  return {
    show,
    success,
    error,
    warn,
    info
  }
}