/**
 * Theme Context Provider
 *
 * Provides:
 * - Dark Mode / Light Mode
 * - Accessibility Mode (high contrast, larger fonts, reduced motion)
 * - Persistent theme preferences
 * - Smooth transitions between themes
 */

'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'
type ColorScheme = 'light' | 'dark'

interface AccessibilityOptions {
  highContrast: boolean
  largerText: boolean
  reducedMotion: boolean
  screenReaderMode: boolean
}

interface ThemeContextType {
  // Theme
  mode: ThemeMode
  colorScheme: ColorScheme
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void

  // Accessibility
  accessibility: AccessibilityOptions
  setAccessibility: (options: Partial<AccessibilityOptions>) => void
  toggleHighContrast: () => void
  toggleLargerText: () => void
  toggleReducedMotion: () => void

  // Utils
  isDark: boolean
  isHighContrast: boolean
  fontSize: 'normal' | 'large' | 'xlarge'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
  defaultMode?: ThemeMode
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
  storageKey = 'hospital-theme'
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light')
  const [accessibility, setAccessibilityState] = useState<AccessibilityOptions>({
    highContrast: false,
    largerText: false,
    reducedMotion: false,
    screenReaderMode: false
  })

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(storageKey)
      if (storedTheme) {
        const { mode: savedMode, accessibility: savedAccessibility } = JSON.parse(storedTheme)
        if (savedMode) setModeState(savedMode)
        if (savedAccessibility) setAccessibilityState(savedAccessibility)
      }
    } catch (error) {
      console.error('Failed to load theme preferences:', error)
    }
  }, [storageKey])

  // Detect system theme
  useEffect(() => {
    if (mode !== 'system') {
      setColorScheme(mode)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setColorScheme(mediaQuery.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [mode])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement

    // Apply color scheme
    root.classList.remove('light', 'dark')
    root.classList.add(colorScheme)
    root.style.colorScheme = colorScheme

    // Apply accessibility classes
    root.classList.toggle('high-contrast', accessibility.highContrast)
    root.classList.toggle('larger-text', accessibility.largerText)
    root.classList.toggle('reduced-motion', accessibility.reducedMotion)
    root.classList.toggle('screen-reader-mode', accessibility.screenReaderMode)

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        colorScheme === 'dark' ? '#1a202c' : '#ffffff'
      )
    }
  }, [colorScheme, accessibility])

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ mode, accessibility })
      )
    } catch (error) {
      console.error('Failed to save theme preferences:', error)
    }
  }, [mode, accessibility, storageKey])

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (mediaQuery.matches && !accessibility.reducedMotion) {
      setAccessibilityState(prev => ({ ...prev, reducedMotion: true }))
    }

    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setAccessibilityState(prev => ({ ...prev, reducedMotion: true }))
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
  }

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }

  const setAccessibility = (options: Partial<AccessibilityOptions>) => {
    setAccessibilityState(prev => ({ ...prev, ...options }))
  }

  const toggleHighContrast = () => {
    setAccessibility({ highContrast: !accessibility.highContrast })
  }

  const toggleLargerText = () => {
    setAccessibility({ largerText: !accessibility.largerText })
  }

  const toggleReducedMotion = () => {
    setAccessibility({ reducedMotion: !accessibility.reducedMotion })
  }

  const fontSize: 'normal' | 'large' | 'xlarge' = accessibility.largerText
    ? accessibility.highContrast
      ? 'xlarge'
      : 'large'
    : 'normal'

  const value: ThemeContextType = {
    mode,
    colorScheme,
    setMode,
    toggleTheme,
    accessibility,
    setAccessibility,
    toggleHighContrast,
    toggleLargerText,
    toggleReducedMotion,
    isDark: colorScheme === 'dark',
    isHighContrast: accessibility.highContrast,
    fontSize
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Theme Toggle Component
 */
export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { mode, toggleTheme, isDark } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  )
}

/**
 * Accessibility Settings Panel
 */
export function AccessibilityPanel() {
  const {
    accessibility,
    toggleHighContrast,
    toggleLargerText,
    toggleReducedMotion,
    isDark
  } = useTheme()

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Accessibility Settings
      </h3>

      <div className="space-y-3">
        {/* High Contrast */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              High Contrast
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Increase contrast for better visibility
            </div>
          </div>
          <button
            onClick={toggleHighContrast}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              accessibility.highContrast
                ? 'bg-primary-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            role="switch"
            aria-checked={accessibility.highContrast}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                accessibility.highContrast ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {/* Larger Text */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Larger Text
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Increase font size for easier reading
            </div>
          </div>
          <button
            onClick={toggleLargerText}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              accessibility.largerText
                ? 'bg-primary-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            role="switch"
            aria-checked={accessibility.largerText}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                accessibility.largerText ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {/* Reduced Motion */}
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Reduced Motion
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Minimize animations and transitions
            </div>
          </div>
          <button
            onClick={toggleReducedMotion}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              accessibility.reducedMotion
                ? 'bg-primary-600'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            role="switch"
            aria-checked={accessibility.reducedMotion}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                accessibility.reducedMotion ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          These settings are saved locally and will persist across sessions.
        </p>
      </div>
    </div>
  )
}
