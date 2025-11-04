/**
 * React hook for Server-Sent Events (SSE) real-time alerts
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface SSEMessage {
  type: string
  [key: string]: any
}

export function useSSE(endpoint: string = '/api/v1/sse/alerts') {
  const { token } = useAuth()
  const [messages, setMessages] = useState<SSEMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!token) {
      setError('No authentication token available')
      return
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      // Note: EventSource doesn't support custom headers directly
      // For production, use a token query parameter or use fetch with ReadableStream
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${endpoint}?token=${token}`
      const eventSource = new EventSource(url)

      // Test-friendly: expose the created instance on the constructor and global EventSource
      // so Jest tests can grab it via (global.EventSource as any).mockInstance
      try {
        ;(eventSource as any).constructor.mockInstance = eventSource
      } catch {}
      try {
        ;(globalThis as any).EventSource.mockInstance = eventSource
      } catch {}

      eventSource.onopen = () => {
    // console.log('SSE connection established')
        setIsConnected(true)
        setError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setMessages((prev) => [...prev, data])
        } catch (err) {
          console.error('Failed to parse SSE message:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('SSE error:', err)
        setIsConnected(false)
        setError('Connection error')
        eventSource.close()
      }

      eventSourceRef.current = eventSource
    } catch (err) {
      console.error('Failed to create SSE connection:', err)
      setError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [token, endpoint])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  useEffect(() => {
    // Always invoke connect so the hook can surface errors when token is missing
    connect()

    return () => {
      disconnect()
    }
  }, [token, connect, disconnect])

  return {
    messages,
    isConnected,
    error,
    connect,
    disconnect,
    clearMessages,
  }
}

/**
 * Hook specifically for emergency vitals alerts
 */
export function useEmergencyAlerts() {
  const { messages, isConnected, clearMessages } = useSSE('/api/v1/sse/alerts')

  const emergencyAlerts = messages.filter(
    (msg) => msg.type === 'emergency_vitals' && msg.severity === 'critical'
  )

  return {
    emergencyAlerts,
    isConnected,
    clearAlerts: clearMessages,
    hasUnreadAlerts: emergencyAlerts.length > 0,
  }
}

/**
 * Hook for doctor notifications (lab results, AI drafts)
 */
export function useDoctorNotifications() {
  const { messages, isConnected, clearMessages } = useSSE('/api/v1/sse/doctor/notifications')

  const labResults = messages.filter((msg) => msg.type === 'lab_result_ready')
  const aiDrafts = messages.filter((msg) => msg.type === 'ai_draft_ready')

  return {
    labResults,
    aiDrafts,
    allNotifications: messages,
    isConnected,
    clearNotifications: clearMessages,
    unreadCount: messages.length,
  }
}
