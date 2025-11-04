/**
 * Unit tests for SSE (Server-Sent Events) hooks
 *
 * Run with: npm test useSSE.test.ts
 *
 * Note: These tests use mock EventSource implementation
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useSSE, useEmergencyAlerts, useDoctorNotifications } from '@/hooks/useSSE'
import { useAuth } from '@/contexts/AuthContext'

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

// Mock EventSource
class MockEventSource {
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  readyState: number = 0

  constructor(url: string) {
    this.url = url
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  close() {
    this.readyState = 2
  }

  // Helper method for tests to simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      })
      this.onmessage(event)
    }
  }

  // Helper method for tests to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Replace global EventSource with mock
global.EventSource = MockEventSource as any

describe('useSSE Hook', () => {
  const mockToken = 'test-token-123'

  beforeEach(() => {
    ;(useAuth as jest.Mock).mockReturnValue({
      token: mockToken
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should connect to SSE endpoint when token is available', async () => {
    const { result } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })

  it('should not connect when token is not available', () => {
    ;(useAuth as jest.Mock).mockReturnValue({ token: null })

    const { result } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBe('No authentication token available')
  })

  it('should receive and store messages', async () => {
    const { result } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    // Get the EventSource instance
    const eventSource = (global.EventSource as any).mockInstance

    // Simulate receiving a message
    act(() => {
      eventSource.simulateMessage({
        type: 'test_message',
        data: { foo: 'bar' }
      })
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0]).toEqual({
        type: 'test_message',
        data: { foo: 'bar' }
      })
    })
  })

  it('should accumulate multiple messages', async () => {
    const { result } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    const eventSource = (global.EventSource as any).mockInstance

    act(() => {
      eventSource.simulateMessage({ type: 'message1' })
      eventSource.simulateMessage({ type: 'message2' })
      eventSource.simulateMessage({ type: 'message3' })
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3)
    })
  })

  it('should clear messages when clearMessages is called', async () => {
    const { result } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    const eventSource = (global.EventSource as any).mockInstance

    act(() => {
      eventSource.simulateMessage({ type: 'test' })
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toHaveLength(0)
  })

  it('should handle connection errors', async () => {
    const { result } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    const eventSource = (global.EventSource as any).mockInstance

    act(() => {
      eventSource.simulateError()
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection error')
    })
  })

  it('should disconnect on unmount', async () => {
    const { result, unmount } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    unmount()

    // EventSource should be closed
    const eventSource = (global.EventSource as any).mockInstance
    expect(eventSource.readyState).toBe(2) // CLOSED
  })

  it('should reconnect when token changes', async () => {
    const { result, rerender } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    // Change token
    ;(useAuth as jest.Mock).mockReturnValue({ token: 'new-token' })
    rerender()

    await waitFor(() => {
      // Should reconnect with new token
      expect(result.current.isConnected).toBe(true)
    })
  })
})

describe('useEmergencyAlerts Hook', () => {
  const mockToken = 'test-token-123'

  beforeEach(() => {
    ;(useAuth as jest.Mock).mockReturnValue({ token: mockToken })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should filter only emergency vitals alerts', async () => {
    const { result } = renderHook(() => useEmergencyAlerts())

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    const eventSource = (global.EventSource as any).mockInstance

    act(() => {
      // Send various message types
      eventSource.simulateMessage({
        type: 'emergency_vitals',
        severity: 'critical',
        patient_name: 'John Doe',
        vital_type: 'Heart Rate',
        vital_value: 150
      })
      eventSource.simulateMessage({
        type: 'lab_result_ready',
        data: {}
      })
      eventSource.simulateMessage({
        type: 'emergency_vitals',
        severity: 'warning', // Not critical
        patient_name: 'Jane Doe'
      })
    })

    await waitFor(() => {
      // Should only have 1 emergency alert (critical severity)
      expect(result.current.emergencyAlerts).toHaveLength(1)
      expect(result.current.emergencyAlerts[0].patient_name).toBe('John Doe')
    })
  })

  it('should track unread alerts status', async () => {
    const { result } = renderHook(() => useEmergencyAlerts())

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    expect(result.current.hasUnreadAlerts).toBe(false)

    const eventSource = (global.EventSource as any).mockInstance

    act(() => {
      eventSource.simulateMessage({
        type: 'emergency_vitals',
        severity: 'critical'
      })
    })

    await waitFor(() => {
      expect(result.current.hasUnreadAlerts).toBe(true)
    })

    act(() => {
      result.current.clearAlerts()
    })

    expect(result.current.hasUnreadAlerts).toBe(false)
  })
})

describe('useDoctorNotifications Hook', () => {
  const mockToken = 'test-token-123'

  beforeEach(() => {
    ;(useAuth as jest.Mock).mockReturnValue({ token: mockToken })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should separate lab results and AI drafts', async () => {
    const { result } = renderHook(() => useDoctorNotifications())

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    const eventSource = (global.EventSource as any).mockInstance

    act(() => {
      eventSource.simulateMessage({
        type: 'lab_result_ready',
        patient_name: 'John Doe',
        test_type: 'Blood Test'
      })
      eventSource.simulateMessage({
        type: 'ai_draft_ready',
        draft_type: 'discharge_summary',
        patient_name: 'Jane Doe'
      })
      eventSource.simulateMessage({
        type: 'lab_result_ready',
        patient_name: 'Bob Smith',
        test_type: 'X-Ray'
      })
    })

    await waitFor(() => {
      expect(result.current.labResults).toHaveLength(2)
      expect(result.current.aiDrafts).toHaveLength(1)
      expect(result.current.allNotifications).toHaveLength(3)
      expect(result.current.unreadCount).toBe(3)
    })
  })

  it('should track unread notification count', async () => {
    const { result } = renderHook(() => useDoctorNotifications())

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    expect(result.current.unreadCount).toBe(0)

    const eventSource = (global.EventSource as any).mockInstance

    act(() => {
      eventSource.simulateMessage({ type: 'lab_result_ready' })
      eventSource.simulateMessage({ type: 'ai_draft_ready' })
    })

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2)
    })

    act(() => {
      result.current.clearNotifications()
    })

    expect(result.current.unreadCount).toBe(0)
  })
})

describe('SSE Reconnection Logic', () => {
  const mockToken = 'test-token-123'

  beforeEach(() => {
    ;(useAuth as jest.Mock).mockReturnValue({ token: mockToken })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should attempt reconnection on disconnect', async () => {
    const { result } = renderHook(() => useSSE('/api/v1/sse/alerts'))

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    const eventSource = (global.EventSource as any).mockInstance

    // Simulate connection loss
    act(() => {
      eventSource.simulateError()
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
    })

    // Manual reconnect
    act(() => {
      result.current.connect()
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })
})
