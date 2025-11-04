"use client"

import React, { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { CommandPalette } from '@/components/ui/CommandPalette'

export function UIProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K to open global search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const event = new CustomEvent('ui:commandk')
        window.dispatchEvent(event)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: 'rgba(17,25,40,0.9)',
            color: '#fff',
            backdropFilter: 'blur(12px) saturate(180%)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <CommandPalette />
      {children}
    </>
  )
}
