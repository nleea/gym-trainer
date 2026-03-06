import { ref, onUnmounted } from 'vue'

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // AudioContext not available (SSR or blocked)
  }
}

export function useRestTimer() {
  const remaining = ref(0)
  const total = ref(0)
  const isRunning = ref(false)
  const isDone = ref(false)

  let interval: ReturnType<typeof setInterval> | null = null

  function clear() {
    if (interval !== null) {
      clearInterval(interval)
      interval = null
    }
  }

  function start(seconds: number) {
    clear()
    isDone.value = false
    const secs = Math.max(1, Math.round(seconds))
    total.value = secs
    remaining.value = secs
    isRunning.value = true

    interval = setInterval(() => {
      remaining.value--
      if (remaining.value <= 0) {
        remaining.value = 0
        isRunning.value = false
        isDone.value = true
        clear()
        playBeep()
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(200)
        }
        // Auto-hide "¡Listo!" after 2s
        setTimeout(() => { isDone.value = false }, 2000)
      }
    }, 1000)
  }

  function skip() {
    clear()
    remaining.value = 0
    isRunning.value = false
    isDone.value = false
  }

  function reset(seconds?: number) {
    clear()
    isRunning.value = false
    isDone.value = false
    remaining.value = seconds !== undefined ? Math.max(1, Math.round(seconds)) : 0
  }

  onUnmounted(clear)

  return { remaining, total, isRunning, isDone, start, skip, reset }
}
