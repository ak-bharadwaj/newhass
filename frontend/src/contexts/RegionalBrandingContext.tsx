'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Versioned storage key to prevent stale branding persisting across deployments
const BRANDING_STORAGE_KEY = 'regionalBranding_v2'
const LEGACY_BRANDING_STORAGE_KEY = 'regionalBranding'
// Hard lock to enforce only the new professional UI across deployments
const LOCK_BRANDING = true

export interface RegionalBranding {
  theme: 'ocean' | 'forest' | 'sunset' | 'royal' | 'medical'
  hospitalName: string
  hospitalTagline: string
  bannerText: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  adminRegionId?: string
}

export const THEME_COLORS = {
  ocean: {
    name: '🌊 Ocean Blue',
    primary: 'from-blue-600 to-cyan-600',
    secondary: 'from-blue-500 to-indigo-500',
    accent: 'from-cyan-500 to-blue-600',
    stats: [
      'from-blue-500 to-indigo-500',
      'from-cyan-500 to-blue-500',
      'from-indigo-500 to-purple-500',
      'from-blue-600 to-cyan-600'
    ],
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-200'
  },
  forest: {
    name: '🌲 Forest Green',
    primary: 'from-green-600 to-emerald-600',
    secondary: 'from-emerald-500 to-teal-500',
    accent: 'from-teal-500 to-green-600',
    stats: [
      'from-green-500 to-emerald-500',
      'from-emerald-500 to-teal-500',
      'from-teal-500 to-cyan-500',
      'from-green-600 to-emerald-600'
    ],
    bgColor: 'bg-green-50',
    textColor: 'text-green-900',
    borderColor: 'border-green-200'
  },
  sunset: {
    name: '🌅 Sunset Orange',
    primary: 'from-orange-600 to-red-600',
    secondary: 'from-yellow-500 to-orange-500',
    accent: 'from-red-500 to-pink-500',
    stats: [
      'from-orange-500 to-red-500',
      'from-yellow-500 to-orange-500',
      'from-red-500 to-pink-500',
      'from-orange-600 to-red-600'
    ],
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-900',
    borderColor: 'border-orange-200'
  },
  royal: {
    name: '👑 Royal Purple',
    primary: 'from-purple-600 to-pink-600',
    secondary: 'from-indigo-500 to-purple-500',
    accent: 'from-pink-500 to-rose-500',
    stats: [
      'from-purple-500 to-pink-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-purple-600 to-pink-600'
    ],
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-200'
  },
  medical: {
    name: '⚕️ Medical Classic',
    primary: 'from-blue-600 to-purple-600',
    secondary: 'from-teal-500 to-blue-500',
    accent: 'from-indigo-500 to-purple-500',
    stats: [
      'from-blue-500 to-indigo-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-yellow-500 to-orange-500'
    ],
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-900',
    borderColor: 'border-indigo-200'
  }
}

const DEFAULT_BRANDING: RegionalBranding = {
  theme: 'medical',
  hospitalName: 'Regional Medical Center',
  hospitalTagline: 'Excellence in Healthcare',
  bannerText: 'Welcome to our Healthcare Portal',
  primaryColor: 'from-blue-600 to-purple-600',
  secondaryColor: 'from-teal-500 to-blue-500',
  accentColor: 'from-indigo-500 to-purple-500'
}

interface RegionalBrandingContextType {
  branding: RegionalBranding
  updateBranding: (updates: Partial<RegionalBranding>) => void
  getThemeColors: () => typeof THEME_COLORS[keyof typeof THEME_COLORS]
  resetBranding: () => void
}

const RegionalBrandingContext = createContext<RegionalBrandingContextType | undefined>(undefined)

export function RegionalBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<RegionalBranding>(DEFAULT_BRANDING)

  useEffect(() => {
    // Always clear any persisted branding to prevent old UI resurfacing
    try {
      localStorage.removeItem(BRANDING_STORAGE_KEY)
      localStorage.removeItem(LEGACY_BRANDING_STORAGE_KEY)
    } catch {}

    // Keep default branding (Medical professional theme)
    setBranding(DEFAULT_BRANDING)
  }, [])

  const updateBranding = (updates: Partial<RegionalBranding>) => {
    setBranding(prev => {
      // When locked, ignore attempts to switch away from the professional theme
      if (LOCK_BRANDING) {
        return { ...DEFAULT_BRANDING }
      }
      const newBranding = { ...prev, ...updates }
      
      // Update theme colors if theme changed
      if (updates.theme && THEME_COLORS[updates.theme]) {
        const colors = THEME_COLORS[updates.theme]
        newBranding.primaryColor = colors.primary
        newBranding.secondaryColor = colors.secondary
        newBranding.accentColor = colors.accent
      }
      
      // Save to localStorage under versioned key (only if not locked)
      if (!LOCK_BRANDING) {
        localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(newBranding))
      }
      
      return newBranding
    })
  }

  const getThemeColors = () => {
    return THEME_COLORS[branding.theme] || THEME_COLORS.medical
  }

  const resetBranding = () => {
    setBranding(DEFAULT_BRANDING)
    try {
      localStorage.removeItem(BRANDING_STORAGE_KEY)
      localStorage.removeItem(LEGACY_BRANDING_STORAGE_KEY)
    } catch {}
  }

  return (
    <RegionalBrandingContext.Provider value={{ branding, updateBranding, getThemeColors, resetBranding }}>
      {children}
    </RegionalBrandingContext.Provider>
  )
}

export function useRegionalBranding() {
  const context = useContext(RegionalBrandingContext)
  if (context === undefined) {
    throw new Error('useRegionalBranding must be used within a RegionalBrandingProvider')
  }
  return context
}
