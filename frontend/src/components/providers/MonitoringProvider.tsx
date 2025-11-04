"use client";

import { useEffect } from 'react'

function initSentrySafe() {
  try {
    const enabled = process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true'
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!enabled || !dsn || typeof window === 'undefined') return
    // Placeholder: real Sentry init would go here.
    // Keeping this a no-op to avoid adding dependencies during this pass.
    // Example (when package installed):
    // const Sentry = await import('@sentry/nextjs')
    // Sentry.init({ dsn, tracesSampleRate: 0.2 })
    console.info('[monitoring] Sentry would initialize with DSN:', dsn)
  } catch (e) {
    // Swallow any monitoring init errors
    // console.warn('[monitoring] init failed:', e)
  }
}

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentrySafe()
  }, [])
  return <>{children}</>
}
