"use client"

import { createApp } from 'vue'
import { useEffect, useRef } from 'react'
import App from '../vue/App.vue'
import router from '../vue/router'

export default function VueApp() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const app = createApp(App)
      app.use(router)
      app.mount(containerRef.current)
      
      return () => {
        app.unmount()
      }
    }
  }, [])

  return <div ref={containerRef} className="min-h-screen" />
}
