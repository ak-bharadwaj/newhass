'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { FeedbackButton } from '@/components/common/FeedbackButton'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'

interface Thread {
  id: string
  created_at: string
  updated_at: string
  participant_user_ids: string[]
  last_message_preview?: string
}

interface Message {
  id: string
  thread_id: string
  sender_id: string
  content: string
  created_at: string
}

export default function MessagesPage() {
  const { user, token } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    loadThreads()
  }, [token])

  const loadThreads = async () => {
    try {
      setLoading(true)
      const data = await apiClient.listMessageThreads(token!)
      setThreads(data)
      if (data.length > 0) {
        selectThread(data[0])
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load threads')
    } finally {
      setLoading(false)
    }
  }

  const selectThread = async (t: Thread) => {
    setSelectedThread(t)
    try {
      const msgs = await apiClient.listThreadMessages(t.id, token!)
      setMessages(msgs)
    } catch (e) {
      console.error('Failed to load messages')
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedThread) return
    try {
      await apiClient.sendMessage(selectedThread.id, newMessage.trim(), token!)
      setNewMessage('')
      const msgs = await apiClient.listThreadMessages(selectedThread.id, token!)
      setMessages(msgs)
    } catch (e) {
      console.error('Failed to send message')
    }
  }

  if (!user) return null

  const roleForLayout = user.role_name === 'regional_admin' ? 'admin' : (user.role_name || 'user')

  return (
    <EnterpriseDashboardLayout role={roleForLayout}>
      <div className="container mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Threads</h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-gray-500">Loading...</div>
              ) : threads.length === 0 ? (
                <div className="p-4 text-gray-500">No threads yet</div>
              ) : (
                <ul>
                  {threads.map((t) => (
                    <li key={t.id}>
                      <button
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                          selectedThread?.id === t.id ? 'bg-gray-50' : ''
                        }`}
                        onClick={() => selectThread(t)}
                      >
                        <div className="text-sm font-medium text-gray-900">Thread {t.id.slice(0, 8)}</div>
                        <div className="text-xs text-gray-500">Updated {new Date(t.updated_at).toLocaleString()}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Messages</h2>
              {selectedThread && (
                <div className="text-xs text-gray-500">Thread {selectedThread.id.slice(0, 8)}</div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {error && <div className="p-2 bg-red-50 text-red-700 rounded">{error}</div>}
              {selectedThread ? (
                messages.length === 0 ? (
                  <div className="text-gray-500">No messages yet</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`max-w-[80%] p-3 rounded-xl shadow ${m.sender_id === user.id ? 'bg-primary-50 ml-auto' : 'bg-white'}`}>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{m.content}</div>
                      <div className="mt-1 text-[10px] text-gray-500">{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )
              ) : (
                <div className="text-gray-500">Select a thread to view messages</div>
              )}
            </div>
            <div className="p-3 border-t border-gray-200">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <FeedbackButton type="submit" variant="primary">Send</FeedbackButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </EnterpriseDashboardLayout>
  )
}
