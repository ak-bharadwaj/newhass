"use client"

import { usePathname } from 'next/navigation'
import { SocketProvider } from '@/components/providers/SocketProvider'
import { MonitoringProvider } from '@/components/providers/MonitoringProvider'
import { SplashLoader } from '@/components/common/SplashLoader'
import { LastSessionRestore } from '@/components/providers/LastSessionRestore'
import PageTransition from '@/components/common/PageTransition'
import { MotionConfig } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/about',
  '/privacy',
  '/terms',
])

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  // Treat dynamic public routes conservatively
  const isPublic = pathname === null ? false : ([...PUBLIC_ROUTES].some(p => pathname === p || pathname.startsWith(p + '/')))

  if (isPublic || !isAuthenticated) {
    // Minimal frame for public pages and before auth is established
    // Still provide SocketProvider so client hooks don't fail during SSR/prerender
    return (
      <SocketProvider>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </SocketProvider>
    )
  }

  // Full app shell for authenticated areas
  return (
    <SocketProvider>
      <MonitoringProvider>
        <SplashLoader />
        <LastSessionRestore />
        <MotionConfig reducedMotion="user">
          <PageTransition>{children}</PageTransition>
        </MotionConfig>
      </MonitoringProvider>
    </SocketProvider>
  )
}
