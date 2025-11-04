"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface SocketContextType {
  connected: boolean
  subscribe: (channel: string, handler: (msg: any) => void) => () => void
  publish: (channel: string, payload: any) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<Map<string, Set<(msg: any) => void>>>(new Map())

  const enabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_SOCKETS === 'true'
  const urlBase = process.env.NEXT_PUBLIC_WS_URL || ''

  useEffect(() => {
    if (!enabled || !token || !urlBase) return

    const url = `${urlBase}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data)
        const { channel, data } = parsed
        const set = handlersRef.current.get(channel)
        if (set) for (const h of set) h(data)
      } catch {
        // ignore malformed messages
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
      setConnected(false)
    }
  }, [enabled, token, urlBase])

  const value = useMemo<SocketContextType>(() => ({
    connected,
    subscribe: (channel, handler) => {
      let set = handlersRef.current.get(channel)
      if (!set) {
        set = new Set()
        handlersRef.current.set(channel, set)
      }
      set.add(handler)
      return () => {
        const s = handlersRef.current.get(channel)
        if (s) {
          s.delete(handler)
          if (s.size === 0) handlersRef.current.delete(channel)
        }
      }
    },
    publish: (channel, payload) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      try {
        ws.send(JSON.stringify({ channel, data: payload }))
      } catch {
        // no-op
      }
    }
  }), [connected])

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
