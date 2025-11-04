'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient, type Appointment } from '@/lib/api'

export default function ReceptionWaitingRoomPage() {
  const { token, user } = useAuth()
  const [queue, setQueue] = useState<Array<Appointment & { queueNumber: number; waitTime: number; uiStatus: 'waiting' | 'called' }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const appts = await apiClient.getAppointments(token, {
          status: 'scheduled',
          hospital_id: user?.hospital_id,
          limit: 25,
        })
        const enriched = appts
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
          .map((apt, index) => {
            const minutesUntil = Math.max(0, Math.ceil((new Date(apt.scheduled_at).getTime() - Date.now()) / 60000))
            return {
              ...apt,
              queueNumber: index + 1,
              waitTime: minutesUntil || (index * 5 + 5),
              uiStatus: (index < 1 ? 'called' : 'waiting') as 'called' | 'waiting',
            }
          })
        setQueue(enriched)
      } catch (e: any) {
        setError(e?.message || 'Failed to load waiting room queue')
      } finally {
        setLoading(false)
      }
    })()
  }, [token, user?.hospital_id])
  const [showCallModal, setShowCallModal] = useState(false)
  const [nextPatient, setNextPatient] = useState<(Appointment & { queueNumber: number; waitTime: number; uiStatus: 'waiting' | 'called' }) | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)

  const avgWait = useMemo(() => {
    if (!queue.length) return 0
    const total = queue.reduce((sum, q) => sum + (q.waitTime || 0), 0)
    return Math.round(total / queue.length)
  }, [queue])

  const callNext = () => {
    const waiting = queue.filter(q => q.uiStatus === 'waiting')
    if (waiting.length > 0) {
      setNextPatient(waiting[0])
      setShowCallModal(true)
      if (audioEnabled) {
        // Simulate audio announcement
        const utterance = new SpeechSynthesisUtterance(`Queue number ${waiting[0].queueNumber}, ${waiting[0].patient_name}, please proceed to the counter`)
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  const confirmCall = async () => {
    if (!token || !nextPatient) return
    try {
      // Mark as checked-in in backend to reflect that patient has arrived
      await apiClient.checkInAppointment(nextPatient.id, token)
    } catch {
      // Non-blocking: still mark locally if backend call fails
    }
    setQueue(prev => prev.map(item =>
      item.id === nextPatient.id
        ? { ...item, uiStatus: 'called' }
        : item
    ))
    setShowCallModal(false)
    setNextPatient(null)
  }

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id))
  }

  return (
    <EnterpriseDashboardLayout role="reception">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard/reception" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Waiting Room</h1>
              <p className="text-gray-600 mt-1">Manage patient queue</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-4 py-3 rounded-xl font-bold ${
                audioEnabled 
                  ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
              }`}
            >
              {audioEnabled ? '🔊 Audio On' : '🔇 Audio Off'}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={callNext}
              disabled={queue.filter(q => q.uiStatus === 'waiting').length === 0}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📢 Call Next Patient
            </motion.button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'In Queue', value: queue.filter(q => q.uiStatus === 'waiting').length, color: 'from-blue-500 to-indigo-500', icon: '⏳' },
            { label: 'Called', value: queue.filter(q => q.uiStatus === 'called').length, color: 'from-green-500 to-emerald-500', icon: '📢' },
            { label: 'Avg Wait Time', value: `${avgWait} min`, color: 'from-yellow-500 to-orange-500', icon: '⏱️' },
            { label: 'Total Today', value: queue.length, color: 'from-purple-500 to-pink-500', icon: '📊' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold">{stat.value}</p>
                </div>
                <span className="text-5xl opacity-20">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Queue Display */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Patient Queue</h2>
          </div>
          <div className="p-6 space-y-4">
            {(loading && queue.length === 0 ? Array.from({ length: 6 }) : queue).map((item: any, index) => (
              <motion.div
                key={item?.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-5 rounded-xl border-2 ${
                  item?.uiStatus === 'called' 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                {loading && queue.length === 0 ? (
                  <div className="animate-pulse h-12 bg-gray-100 rounded" />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                        item.uiStatus === 'called' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {item.queueNumber}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{item.patient_name}</h3>
                        <p className="text-sm text-gray-600">Dr. {item.doctor_name} | {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Wait Time</p>
                        <p className="text-lg font-bold text-orange-600">{item.waitTime} min</p>
                      </div>
                      {item.uiStatus === 'waiting' && (
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-bold"
                          title="Remove from queue"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Call Next Modal */}
        <AnimatePresence>
          {showCallModal && nextPatient && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-5xl">📢</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Calling Patient
                  </h2>
                  <div className="space-y-3 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Queue Number</p>
                      <p className="text-4xl font-bold text-green-600">{nextPatient.queueNumber}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Patient Name</p>
                      <p className="text-xl font-bold text-gray-900">{nextPatient.patient_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCallModal(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmCall}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </EnterpriseDashboardLayout>
  )
}
