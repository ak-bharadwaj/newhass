'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
  fallbackUrl?: string
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  fallbackUrl = '/login',
}: ProtectedRouteProps) {
  const { user, loading, hasPermission, hasRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Check if user is authenticated
    if (!user) {
      router.push(fallbackUrl)
      return
    }

    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
      if (!hasRole(...requiredRoles)) {
        router.push('/unauthorized')
        return
      }
    }

    // Check permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(perm =>
        hasPermission(perm)
      )
      if (!hasAllPermissions) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, loading, requiredRoles, requiredPermissions, hasPermission, hasRole, router, fallbackUrl])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Don't render children if not authenticated or authorized
  if (!user) {
    return null
  }

  if (requiredRoles && requiredRoles.length > 0 && !hasRole(...requiredRoles)) {
    return null
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(perm =>
      hasPermission(perm)
    )
    if (!hasAllPermissions) {
      return null
    }
  }

  return <>{children}</>
}
