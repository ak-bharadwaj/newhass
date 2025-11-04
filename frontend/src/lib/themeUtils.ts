// Reusable theme detection and color utility for consistent light/dark mode support
import { useEffect, useState } from 'react'

export const useTheme = () => {
  const [isDark, setIsDark] = useState<boolean>(true)

  useEffect(() => {
    const detect = () => {
      try {
        const isDocDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
        const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(Boolean(isDocDark || prefersDark))
      } catch (e) {
        setIsDark(true)
      }
    }
    detect()
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (mql && mql.addEventListener) {
      mql.addEventListener('change', () => detect())
    }
    return () => {
      if (mql && mql.removeEventListener) {
        mql.removeEventListener('change', detect)
      }
    }
  }, [])

  return { isDark }
}

// Theme-aware color generator with proper contrast for light/dark modes
export const getThemeColors = (isDark: boolean) => {
  return {
    // Background gradients
    bgGradient: isDark
      ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900'
      : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50',
    
    bgGradientAlt: isDark
      ? 'bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-pink-900/30'
      : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50',

    // Text colors
    textPrimary: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',

    // Card backgrounds
    cardBg: isDark
      ? 'bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90'
      : 'bg-white',
    
    cardBorder: isDark ? 'border-gray-700/50' : 'border-gray-200',

    // Form inputs
    inputBg: isDark ? 'bg-gray-800/50' : 'bg-white',
    inputText: isDark ? 'text-white' : 'text-gray-900',
    inputBorder: isDark ? 'border-white/10' : 'border-gray-300',
    inputFocusRing: isDark ? 'focus:ring-purple-500' : 'focus:ring-blue-500',

    // Buttons
    btnPrimary: isDark
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white',
    
    btnSecondary: isDark
      ? 'bg-gray-700 hover:bg-gray-600 text-white'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-900',

    // KPI Cards with better contrast
    kpiCard: (colorKey: string) => {
      const colors: Record<string, { light: string; dark: string }> = {
        primary: {
          light: 'bg-blue-500 text-white',
          dark: 'bg-blue-600 text-white'
        },
        success: {
          light: 'bg-emerald-500 text-white',
          dark: 'bg-emerald-600 text-white'
        },
        warning: {
          light: 'bg-amber-500 text-white',
          dark: 'bg-amber-600 text-white'
        },
        error: {
          light: 'bg-red-500 text-white',
          dark: 'bg-red-600 text-white'
        },
        secondary: {
          light: 'bg-purple-500 text-white',
          dark: 'bg-purple-600 text-white'
        }
      }
      const color = colors[colorKey] || colors.primary
      return isDark ? color.dark : color.light
    },

    // Icon colors with proper visibility
    iconColor: (colorKey: string) => {
      const lightColors: Record<string, string> = {
        purple: '#7C3AED', // purple-600
        blue: '#2563EB',   // blue-600
        green: '#059669',  // emerald-600
        cyan: '#0891B2',   // cyan-600
        amber: '#D97706',  // amber-600
        pink: '#DB2777',   // pink-600
        orange: '#EA580C', // orange-600
        emerald: '#059669',
        red: '#DC2626',
      }
      
      const darkColors: Record<string, string> = {
        purple: '#C084FC', // purple-400
        blue: '#60A5FA',   // blue-400  
        green: '#4ADE80',  // green-400
        cyan: '#22D3EE',   // cyan-400
        amber: '#FBBF24',  // amber-400
        pink: '#F472B6',   // pink-400
        orange: '#FB923C', // orange-400
        emerald: '#34D399',
        red: '#F87171',
      }
      
      return isDark ? (darkColors[colorKey] || '#60A5FA') : (lightColors[colorKey] || '#2563EB')
    }
  }
}
