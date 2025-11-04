'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, UserResponse } from '@/lib/api'
import {
  getAccessToken,
  getAccessExpiry,
  setAccessToken,
  setAccessExpiry,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from '@/lib/auth'

interface AuthContextType {
  user: UserResponse | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, otpCode?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  const scheduleRefresh = useCallback((expiresInSeconds: number) => {
    clearRefreshTimer()
    // refresh a bit early to avoid race conditions
    const earlySeconds = Math.min(60, Math.max(10, Math.floor(expiresInSeconds * 0.1)))
    const delayMs = Math.max(5_000, (expiresInSeconds - earlySeconds) * 1000)
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const rt = getRefreshToken()
        if (!rt) throw new Error('No refresh token')
        const refreshed = await apiClient.refreshToken(rt)
        setAccessToken(refreshed.access_token)
        setRefreshToken(refreshed.refresh_token)
        setAccessExpiry(Date.now() + refreshed.expires_in * 1000)
        setToken(refreshed.access_token)
        // keep cookie aligned for middleware/protected routes in dev
        try {
          const maxAge = Math.max(60, Math.min(60 * 60 * 24, (refreshed.expires_in || 1800)))
          document.cookie = `access_token=${refreshed.access_token}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
        } catch {}
        // Optionally refresh user profile silently
        try {
          const userData = await apiClient.getCurrentUser(refreshed.access_token)
          setUser(userData)
        } catch {}
        scheduleRefresh(refreshed.expires_in)
      } catch (e) {
        console.error('Auto refresh failed:', e)
        // If refresh fails, clear tokens and force login
        clearTokens()
        setUser(null)
        setToken(null)
        try { document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax' } catch {}
        router.push('/login')
      }
    }, delayMs)
  }, [router])

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    const currentToken = getAccessToken()
    if (!currentToken) return

    try {
      const userData = await apiClient.getCurrentUser(currentToken)
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }, [])

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      const accessToken = getAccessToken()
      const accessExpiry = getAccessExpiry()
      const refreshToken = getRefreshToken()

      if (accessToken) {
        setToken(accessToken)
        // schedule refresh based on stored expiry if available
        if (accessExpiry && accessExpiry > Date.now()) {
          const remainingSec = Math.floor((accessExpiry - Date.now()) / 1000)
          scheduleRefresh(remainingSec)
        } else if (refreshToken) {
          // access token present but expiry unknown/elapsed, try refresh once
          try {
            const refreshed = await apiClient.refreshToken(refreshToken)
            setAccessToken(refreshed.access_token)
            setRefreshToken(refreshed.refresh_token)
            setAccessExpiry(Date.now() + refreshed.expires_in * 1000)
            setToken(refreshed.access_token)
            scheduleRefresh(refreshed.expires_in)
          } catch (e) {
            clearTokens()
            setToken(null)
          }
        }
        // Fetch fresh user data
        try {
          const userData = await apiClient.getCurrentUser(accessToken)
          setUser(userData)
        } catch (error) {
          // Token invalid, clear everything
    // console.log('Token expired or invalid, clearing session')
          clearTokens()
          setToken(null)
          setUser(null)
          // Try refresh if refresh token exists
          if (refreshToken) {
            try {
              const refreshed = await apiClient.refreshToken(refreshToken)
              setAccessToken(refreshed.access_token)
              setRefreshToken(refreshed.refresh_token)
              setAccessExpiry(Date.now() + refreshed.expires_in * 1000)
              setToken(refreshed.access_token)
              scheduleRefresh(refreshed.expires_in)
              const userData = await apiClient.getCurrentUser(refreshed.access_token)
              setUser(userData)
            } catch (e) {
              // give up
            }
          }
        }
      }
      // No access token but have refresh token: attempt session restore
      if (!accessToken && refreshToken) {
        try {
          const refreshed = await apiClient.refreshToken(refreshToken)
          setAccessToken(refreshed.access_token)
          setRefreshToken(refreshed.refresh_token)
          setAccessExpiry(Date.now() + refreshed.expires_in * 1000)
          setToken(refreshed.access_token)
          scheduleRefresh(refreshed.expires_in)
          const userData = await apiClient.getCurrentUser(refreshed.access_token)
          setUser(userData)
        } catch (e) {
          // silent
        }
      }
      setLoading(false)
    }

    loadUser()
    return () => clearRefreshTimer()
  }, [scheduleRefresh])

  const login = useCallback(async (email: string, password: string, otpCode?: string) => {
    try {
      const tokens = await apiClient.login({ email, password, otp_code: otpCode })

      // Store tokens
      setAccessToken(tokens.access_token)
      setRefreshToken(tokens.refresh_token)
      setAccessExpiry(Date.now() + tokens.expires_in * 1000)
      setToken(tokens.access_token)
      scheduleRefresh(tokens.expires_in)

      // Also set a cookie so middleware/protected routes recognize auth immediately
      // Note: HttpOnly cookies must be set by the server. For local dev/E2E, we set a client cookie.
      // Align max-age with access token expiry when available.
      try {
        const maxAge = Math.max(60, Math.min(60 * 60 * 24, (tokens.expires_in || 1800))) // at least 1m, cap 1d
        document.cookie = `access_token=${tokens.access_token}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      } catch (e) {
        // ignore cookie set errors
      }

      // Fetch user data
      const userData = await apiClient.getCurrentUser(tokens.access_token)
      setUser(userData)

      // Redirect based on role
      const dashboardPath = `/dashboard/${userData.role_name}`
      router.push(dashboardPath)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }, [router])

  const logout = useCallback(async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      clearRefreshTimer()
      clearTokens()
      setUser(null)
      setToken(null)
      // Clear the access_token cookie for middleware
      try {
        document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax'
      } catch {}
      router.push('/login')
    }
  }, [router])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !user.permissions) return false
    return user.permissions[permission] === true
  }, [user])

  const hasRole = useCallback((...roles: string[]): boolean => {
    if (!user) return false
    return roles.includes(user.role_name)
  }, [user])

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    hasPermission,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
