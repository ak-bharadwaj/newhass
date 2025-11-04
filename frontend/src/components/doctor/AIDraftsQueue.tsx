'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { promiseFeedback } from '@/lib/activityFeedback'
import { staggerItemVariants } from '@/lib/animations'

interface AIDraft {
  id: string
  patient_id: string
  patient_name: string
  draft_type: string
  content: any
  created_at: string
  status: string
}

export function AIDraftsQueue() {
  const { token } = useAuth()
  const [drafts, setDrafts] = useState<AIDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDraft, setSelectedDraft] = useState<AIDraft | null>(null)
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    loadDrafts()
    // Refresh every 30 seconds
    const interval = setInterval(loadDrafts, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDrafts = async () => {
    if (!token) return
    try {
      const data = await apiClient.getAIDrafts(token)
      setDrafts(data.filter((d: AIDraft) => d.status === 'pending'))
    } catch (error) {
      console.error('Failed to load AI drafts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (draftId: string) => {
    if (!token) return
    setIsApproving(true)
    await promiseFeedback(apiClient.approveAIDraft(draftId, token), {
      loading: 'Approving draft...',
      success: 'Draft approved',
      error: 'Failed to approve draft',
    })
    setDrafts((prev) => prev.filter((d) => d.id !== draftId))
    setSelectedDraft(null)
    setIsApproving(false)
  }

  const handleReject = async (draftId: string) => {
    if (!token) return
    await promiseFeedback(apiClient.rejectAIDraft(draftId, token), {
      loading: 'Rejecting draft...',
      success: 'Draft rejected',
      error: 'Failed to reject draft',
    })
    setDrafts((prev) => prev.filter((d) => d.id !== draftId))
    setSelectedDraft(null)
  }

  const getDraftIcon = (type: string) => {
    switch (type) {
      case 'risk_score':
        return '📊'
      case 'discharge_summary':
        return '📝'
      case 'treatment_plan':
        return '💊'
      case 'anomaly_alert':
        return '⚠️'
      default:
        return '🤖'
    }
  }

  const getDraftTitle = (type: string) => {
    switch (type) {
      case 'risk_score':
        return 'Risk Assessment'
      case 'discharge_summary':
        return 'Discharge Summary'
      case 'treatment_plan':
        return 'Treatment Plan'
      case 'anomaly_alert':
        return 'Anomaly Alert'
      default:
        return 'AI Draft'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🤖 AI Drafts Pending Review
            {drafts.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {drafts.length}
              </span>
            )}
          </h3>
        </div>
      </div>

      <div className="p-6">
        {drafts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-500 text-lg">No pending AI drafts</p>
            <p className="text-gray-400 text-sm mt-2">
              AI-generated content will appear here for your review
            </p>
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <AnimatePresence>
              {drafts.map((draft) => (
                <motion.div
                  key={draft.id}
                  variants={staggerItemVariants}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedDraft(draft)}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getDraftIcon(draft.draft_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {getDraftTitle(draft.draft_type)}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Patient: <span className="font-medium">{draft.patient_name}</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Generated {new Date(draft.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove(draft.id)
                            }}
                            disabled={isApproving}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReject(draft.id)
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Draft Preview Modal */}
      <AnimatePresence>
        {selectedDraft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDraft(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    {getDraftIcon(selectedDraft.draft_type)} {getDraftTitle(selectedDraft.draft_type)}
                  </h3>
                  <button
                    onClick={() => setSelectedDraft(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Patient: {selectedDraft.patient_name}
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">
                    {JSON.stringify(selectedDraft.content, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleReject(selectedDraft.id)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedDraft.id)}
                    disabled={isApproving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isApproving ? 'Approving...' : 'Approve & Apply'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
