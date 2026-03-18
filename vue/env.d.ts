/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'canvas-confetti' {
  const confetti: (options?: Record<string, unknown>) => Promise<null>
  export default confetti
}
