'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Prescription } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { infoFeedback, promiseFeedback } from '@/lib/activityFeedback'

interface MedicineBentoProps {
  prescriptions: Prescription[]
}

// Utility: parse time-of-day buckets from a free-form frequency string
function parseTimes(frequency?: string) {
  const f = (frequency || '').toLowerCase()
  const buckets: Array<'morning' | 'afternoon' | 'night' | 'anytime'> = []
  if (!f) return ['anytime'] as const
  if (/(morning|breakfast|am|morn)/.test(f)) buckets.push('morning')
  if (/(noon|lunch|afternoon|midday|pm)/.test(f)) buckets.push('afternoon')
  if (/(night|bedtime|evening)/.test(f)) buckets.push('night')

  // common counts
  if (buckets.length === 0) {
    if (/once|od|qd|daily|1x|q24h/.test(f)) return ['anytime'] as const
    if (/twice|bd|2x|bid|q12h/.test(f)) return ['morning', 'night'] as const
    if (/thrice|tds|3x|tid|q8h/.test(f)) return ['morning', 'afternoon', 'night'] as const
  }
  return (buckets.length ? buckets : (['anytime'] as const))
}

function daysProgress(start?: string, duration_days?: number) {
  if (!start || !duration_days || duration_days <= 0) return { percent: 0, daysLeft: null as number | null }
  const s = new Date(start).getTime()
  const now = Date.now()
  const end = s + duration_days * 24 * 60 * 60 * 1000
  const total = end - s
  const elapsed = Math.max(0, Math.min(now - s, total))
  const percent = Math.round((elapsed / total) * 100)
  const daysLeft = Math.ceil((end - now) / (24 * 60 * 60 * 1000))
  return { percent: isFinite(percent) ? percent : 0, daysLeft }
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const size = 64
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${c}` }}
        animate={{ strokeDasharray: `${dash} ${c - dash}` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

export function MedicineBento({ prescriptions }: MedicineBentoProps) {
  const { token, user } = useAuth()
  const active = (prescriptions || []).filter(p => p.status === 'active' || p.status === 'dispensed')
  const soon = active.filter(p => {
    if (!p.end_date) return false
    const { daysLeft } = daysProgress(p.start_date, p.duration_days)
    return daysLeft !== null && daysLeft <= 3
  })

  const [selected, setSelected] = useState<Prescription | null>(null)

  // Today buckets
  const today: Record<string, Prescription[]> = { morning: [], afternoon: [], night: [], anytime: [] }
  active.forEach(p => {
    const buckets = parseTimes(p.frequency)
    buckets.forEach(b => {
      if (!today[b]) today[b] = []
      today[b].push(p)
    })
  })

  const [showRings, setShowRings] = useState(true)
  const [showToday, setShowToday] = useState(true)

  async function handleMarkTaken(p: Prescription) {
    if (!token) return infoFeedback('Please login again to continue.', 'warning')
    // Optimistic UI update minimal
    await promiseFeedback(
      (async () => {
        try {
          // Primary: use administerMedication endpoint
          await apiClient.administerMedication(p.id, token, 'patient portal mark-taken')
        } catch (e: any) {
          // Fallback: create a nurse log entry if permission denied
          await apiClient.createNurseLog({
            patient_id: p.patient_id,
            visit_id: p.visit_id,
            log_type: 'patient_medication_taken',
            content: `Patient marked dose as taken for ${p.medication_name} (${p.dosage}, ${p.frequency}).`,
            logged_at: new Date().toISOString(),
          }, token)
        }
        // Mark local adherence for nearest upcoming slot
        const target = nextDoseTarget(p)
        if (target) setTaken(p, target.slot)
      })(),
      {
        loading: 'Recording dose…',
        success: 'Marked as taken',
        error: 'Failed to record dose',
      }
    )
  }

  async function handleRefillRequest(p: Prescription) {
    if (!token) return infoFeedback('Please login again to continue.', 'warning')
    await promiseFeedback(
      apiClient.createNurseLog({
        patient_id: p.patient_id,
        visit_id: p.visit_id,
        log_type: 'refill_request',
        content: `Patient requested refill for ${p.medication_name} (${p.dosage}).`,
        logged_at: new Date().toISOString(),
      }, token),
      {
        loading: 'Sending refill request…',
        success: 'Refill request sent to care team',
        error: 'Failed to send refill request',
      }
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Animated Pill Stack: visual, playful, shows total meds */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-soft-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🧋</span>
          <h3 className="text-lg font-bold">Medicine Stack</h3>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {active.length} active
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative w-28 h-28 flex items-end justify-center">
            {active.slice(0, 8).map((p, i) => (
              <motion.div
                key={p.id}
                role="button"
                onClick={() => setSelected(p)}
                initial={{ y: 8, opacity: 0, rotate: (i % 2 === 0 ? -4 : 4) }}
                animate={{ y: -i * 6, opacity: 1, rotate: (i % 2 === 0 ? -2 : 2) }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 18 }}
                className={`absolute bottom-0 w-20 h-6 rounded-full shadow-md flex items-center justify-center text-xs font-semibold text-white ${i % 3 === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : i % 3 === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-green-500 to-teal-400'}`}
                style={{ transformOrigin: 'center bottom' }}
              >
                {p.medication_name.split(' ').slice(0,1)[0]}
              </motion.div>
            ))}
            {active.length > 8 && (
              <div className="absolute bottom-0 w-20 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 shadow">+{active.length - 8}</div>
            )}
          </div>
          <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
            <p className="font-semibold">Visual guide to your current medicines</p>
            <p className="text-xs mt-1">Stack shows a playful pill for each medication. Tap Medicines to view full details. Refill alerts shown on Bento.</p>
            <div className="mt-3 text-xs text-gray-500">
              {soon.length > 0 ? `${soon.length} meds ending soon` : 'No immediate refills needed'}
            </div>
          </div>
        </div>
      </motion.div>
      {/* Progress Rings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-soft-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">💊</span>
          <h3 className="text-lg font-bold">Your Medicines</h3>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {active.length} active
            </span>
            <button onClick={() => setShowRings(v => !v)} className="text-xs text-gray-600 dark:text-gray-300 hover:underline">
              {showRings ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {active.length === 0 ? (
          <div className="text-sm text-gray-500">No active prescriptions</div>
        ) : showRings ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {active.slice(0, 6).map((p, i) => {
              const { percent, daysLeft } = daysProgress(p.start_date, p.duration_days)
              const color = percent < 50 ? '#22c55e' : percent < 85 ? '#f59e0b' : '#ef4444'
              const next = nextDoseCountdown(p)
              return (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-md bg-white dark:bg-gray-800"
                  onClick={() => setSelected(p)}
                >
                  <Ring percent={percent} color={color} />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.medication_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.dosage} • {p.frequency}</p>
                    {daysLeft !== null && (
                      <p className={`text-xs font-medium ${daysLeft <= 3 ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}`}>{daysLeft <= 0 ? 'Ends today' : `${daysLeft} days left`}</p>
                    )}
                    {next && (
                      <p className="text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">Next dose {next.label}</p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : null}
      </motion.div>

      {/* Today schedule capsules */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-soft-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">⏰</span>
          <h3 className="text-lg font-bold">Today</h3>
          <button onClick={() => setShowToday(v => !v)} className="ml-auto text-xs text-gray-600 dark:text-gray-300 hover:underline">
            {showToday ? 'Hide' : 'Show'}
          </button>
        </div>
        {showToday && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          {(['morning','afternoon','night'] as const).map((slot) => (
            <div key={slot} className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              <p className="uppercase text-[11px] font-bold text-gray-500 mb-2">{slot}</p>
              <div className="flex flex-wrap gap-1">
                {today[slot].length === 0 ? (
                  <span className="text-gray-400 text-xs">—</span>
                ) : (
                  today[slot].slice(0, 6).map((p) => {
                    const taken = isTaken(p, slot)
                    return (
                      <motion.button key={p.id} whileHover={{ scale: 1.06 }} onClick={() => setSelected(p)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${taken ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800'}`}
                      >
                        {taken ? '✔' : '💊'} {p.medication_name}
                        {!taken && (() => { const n = nextDoseCountdown(p); return n ? <span className="ml-1 text-[10px] text-blue-600/80">{n.short}</span> : null })()}
                      </motion.button>
                    )
                  })
                )}
              </div>
            </div>
          ))}
          <div className="col-span-3">
            <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
              {today.anytime.length > 0 ? (
                <span>Anytime: {today.anytime.slice(0, 6).map(p => p.medication_name).join(', ')}{today.anytime.length > 6 ? '…' : ''}</span>
              ) : (
                <span>No anytime doses</span>
              )}
            </div>
          </div>
        </div>
        )}
      </motion.div>

      {/* Refill soon / tips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-soft-xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">✨</span>
          <h3 className="text-lg font-bold">Smart Tips</h3>
        </div>
        {soon.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">You are all set. No immediate refills needed.</div>
        ) : (
          <div className="space-y-3">
            {soon.slice(0, 3).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="p-3 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
              >
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <span className="animate-pulse">⚠️</span>
                  <p className="text-sm font-semibold">{p.medication_name}: refill soon</p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Ends within 3 days. If needed, request an extension.</p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Inline Modal for prescription details */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">💊</div>
              <div className="min-w-0">
                <h4 className="text-lg font-bold truncate">{selected.medication_name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prescribed by {selected.prescribed_by_name || 'Doctor'} • {new Date(selected.start_date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">✕</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">Dosage</p>
                <p className="font-semibold">{selected.dosage}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">Frequency</p>
                <p className="font-semibold">{selected.frequency}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">Route</p>
                <p className="font-semibold">{selected.route}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-semibold">{selected.duration_days ? `${selected.duration_days} days` : '—'}</p>
              </div>
            </div>

            {selected.instructions && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-sm">
                <p className="text-xs text-blue-700 dark:text-blue-300">Instructions</p>
                <p className="font-medium text-blue-900 dark:text-blue-100">{selected.instructions}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600">Status: {selected.status}</span>
                {(() => { const n = nextDoseCountdown(selected); return n ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Next: {n.label}</span> : null })()}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRefillRequest(selected)} className="px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700">Request refill</button>
                <button onClick={() => handleMarkTaken(selected)} className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Mark taken</button>
                <button onClick={() => setSelected(null)} className="ml-2 text-blue-700 hover:underline">Close</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default MedicineBento

// Helpers
function todayKey() {
  return new Date().toISOString().slice(0,10)
}

type TakenMap = Record<string, Record<string, Record<string, boolean>>> // date -> rxId -> slot -> taken

function readTaken(): TakenMap {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('rx_taken') || '{}') } catch { return {} }
}

function writeTaken(map: TakenMap) {
  if (typeof window === 'undefined') return
  localStorage.setItem('rx_taken', JSON.stringify(map))
}

function setTaken(p: Prescription, slot: 'morning'|'afternoon'|'night') {
  const d = todayKey()
  const m = readTaken()
  if (!m[d]) m[d] = {}
  if (!m[d][p.id]) m[d][p.id] = {}
  m[d][p.id][slot] = true
  writeTaken(m)
}

function isTaken(p: Prescription, slot: 'morning'|'afternoon'|'night') {
  const d = todayKey()
  const m = readTaken()
  return Boolean(m?.[d]?.[p.id]?.[slot])
}

function bucketsFor(p: Prescription): Array<'morning'|'afternoon'|'night'|'anytime'> {
  if (p.times_of_day && p.times_of_day.length) {
    // Map explicit times to slots
    const slots = new Set<'morning'|'afternoon'|'night'>()
    p.times_of_day.forEach(t => {
      const [hh, mm] = t.split(':').map(Number)
      const h = Number(hh)
      if (isFinite(h) && h < 12) slots.add('morning')
      else if (isFinite(h) && h < 18) slots.add('afternoon')
      else slots.add('night')
    })
    const arr = Array.from(slots)
    return (arr.length ? arr : ['anytime']) as any
  }
  return parseTimes(p.frequency) as any
}

function nextDoseCountdown(p: Prescription): { label: string; short: string } | null {
  const bucketsList = bucketsFor(p) as string[]
  const day = new Date()
  const times: Record<string, number> = { morning: 9, afternoon: 14, night: 21 }
  const now = day.getTime()

  const candidates: Array<{ when: number; slot: 'morning'|'afternoon'|'night' }> = []
  ;(['morning','afternoon','night'] as const).forEach(slot => {
    if (bucketsList.includes(slot)) {
      if (isTaken(p, slot)) return
      const d = new Date(day)
      d.setHours(times[slot], slot === 'night' ? 30 : 0, 0, 0)
      candidates.push({ when: d.getTime(), slot })
    }
  })

  const upcoming = candidates.filter(c => c.when >= now).sort((a,b) => a.when - b.when)
  const target = upcoming[0]
  if (!target) return null

  const ms = target.when - now
  const mins = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const label = mins <= 0 ? 'due now' : (h > 0 ? `in ${h}h ${m}m` : `in ${m}m`)
  const short = mins <= 0 ? 'now' : (h > 0 ? `${h}h ${m}m` : `${m}m`)
  return { label, short }
}

function nextDoseTarget(p: Prescription): { slot: 'morning'|'afternoon'|'night', when: number } | null {
  const bucketsList = bucketsFor(p) as string[]
  const day = new Date()
  const times: Record<string, number> = { morning: 9, afternoon: 14, night: 21 }
  const now = day.getTime()
  const candidates: Array<{ when: number; slot: 'morning'|'afternoon'|'night' }> = []
  ;(['morning','afternoon','night'] as const).forEach(slot => {
    if (bucketsList.includes(slot)) {
      if (isTaken(p, slot)) return
      const d = new Date(day)
      d.setHours(times[slot], slot === 'night' ? 30 : 0, 0, 0)
      candidates.push({ when: d.getTime(), slot })
    }
  })
  const upcoming = candidates.filter(c => c.when >= now).sort((a,b) => a.when - b.when)
  return upcoming[0] || null
}
