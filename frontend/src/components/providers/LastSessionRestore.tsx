"use client";

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function LastSessionRestore() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  // Persist last visited route
  useEffect(() => {
    if (!pathname) return
    try {
      // Avoid saving auth routes
      if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
        localStorage.setItem('lastRoute', pathname)
      }
    } catch {}
  }, [pathname])

  // Restore last route on first mount if landing on root
  useEffect(() => {
    if (!user) return
    try {
      const last = localStorage.getItem('lastRoute')
      if (last && (pathname === '/' || pathname === '/dashboard')) {
        router.replace(last)
      }
    } catch {}
  // run once after auth
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return null
}
