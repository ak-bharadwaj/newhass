'use client'

import React, { useMemo } from 'react'
import type { Appointment } from '@/lib/api'

interface DayScheduleChartProps {
  date?: Date
  appointments: Appointment[]
  className?: string
}

function formatHM(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function DayScheduleChart({ date = new Date(), appointments, className = '' }: DayScheduleChartProps) {
  // Determine visible window (default 08:00-18:00), but expand to fit appointments
  const { startMinutes, endMinutes, slots, events, nowMinutes, lanesCount } = useMemo(() => {
    const day = new Date(date)
    day.setHours(0, 0, 0, 0)

    const toMinutes = (d: Date) => Math.floor((d.getTime() - day.getTime()) / 60000)

    let minM = 8 * 60 // 08:00
    let maxM = 18 * 60 // 18:00

    const parsed = appointments.map((a) => {
      const start = new Date(a.scheduled_at)
      const duration = Math.max(a.duration_minutes || 30, 5)
      const end = new Date(start.getTime() + duration * 60000)
      return { a, start, end, startM: toMinutes(start), endM: toMinutes(end) }
    })

    if (parsed.length > 0) {
      minM = Math.min(minM, ...parsed.map(p => Math.floor(p.startM / 30) * 30))
      maxM = Math.max(maxM, ...parsed.map(p => Math.ceil(p.endM / 30) * 30))
      // Clamp to a reasonable day span
      minM = Math.max(minM, 6 * 60)
      maxM = Math.min(maxM, 22 * 60)
    }

    // Generate 30-min slots
    const slotsArr: { label: string; minute: number }[] = []
    for (let m = minM; m <= maxM; m += 30) {
      const t = new Date(day.getTime() + m * 60000)
      const label = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      slotsArr.push({ label, minute: m })
    }

    const now = new Date()
    const nowM = now.toDateString() === day.toDateString() ? toMinutes(now) : -1

    // Allocate lanes for overlaps: greedy assign by earliest finishing last in lane
    const byStart = [...parsed].sort((x, y) => x.startM - y.startM)
    const laneEnds: number[] = [] // endM per lane
    const laneIndex: number[] = [] // lane index per event in byStart
    byStart.forEach((evt) => {
      let placed = false
      for (let i = 0; i < laneEnds.length; i++) {
        if (evt.startM >= laneEnds[i]) {
          laneEnds[i] = evt.endM
          laneIndex.push(i)
          placed = true
          break
        }
      }
      if (!placed) {
        laneEnds.push(evt.endM)
        laneIndex.push(laneEnds.length - 1)
      }
    })
    // Map back to original parsed order keeping lane info
    const eventsWithLane = parsed.map((evt) => {
      const idx = byStart.indexOf(byStart.find(b => b.a.id === evt.a.id)!)
      return { ...evt, lane: laneIndex[idx] }
    })

    return {
      startMinutes: minM,
      endMinutes: maxM,
      slots: slotsArr,
      events: eventsWithLane,
      nowMinutes: nowM,
      lanesCount: Math.max(1, laneEnds.length),
    }
  }, [appointments, date])

  const totalMinutes = endMinutes - startMinutes || 1
  const pxPerMinute = 0.7 // 30 min = 21px; compact by default
  const timeColWidth = 64
  const contentPaddingRight = 8

  const statusClasses = (status?: string) => {
    const s = (status || 'scheduled').toLowerCase()
    if (s === 'completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (s === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-200'
    if (s === 'checked_in') return 'bg-amber-100 text-amber-800 border-amber-200'
    if (s === 'cancelled' || s === 'no_show') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-2xl">
        <div className="text-sm font-semibold text-gray-800">Day Schedule (30m)</div>
        <div className="text-xs text-gray-500">{date.toLocaleDateString()}</div>
      </div>
      <div className="relative" style={{ height: Math.max(200, totalMinutes * pxPerMinute) }}>
        {/* Time column and grid */}
        <div className="absolute inset-0 flex">
          <div style={{ width: timeColWidth }} className="border-r bg-white/60" />
          <div className="flex-1 relative">
            {slots.map((slot, idx) => (
              <div
                key={slot.minute}
                className={`absolute left-0 right-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                style={{ top: (slot.minute - startMinutes) * pxPerMinute, height: 30 * pxPerMinute }}
              >
                <div className="absolute left-0 right-0 border-t border-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Time labels */}
        {slots.map((slot) => (
          <div
            key={`label-${slot.minute}`}
            className="absolute text-[10px] text-gray-500 pr-1"
            style={{ top: (slot.minute - startMinutes) * pxPerMinute - 6, left: 0, width: timeColWidth, textAlign: 'right' }}
          >
            {slot.label}
          </div>
        ))}

        {/* Now marker */}
        {nowMinutes >= startMinutes && nowMinutes <= endMinutes && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: (nowMinutes - startMinutes) * pxPerMinute }}
          >
            <div className="absolute" style={{ left: timeColWidth, right: 0 }}>
              <div className="h-[1.5px] bg-orange-500" />
            </div>
          </div>
        )}

        {/* Events */}
        {events.map(({ a, startM, endM, lane }) => {
          const top = (startM - startMinutes) * pxPerMinute
          const height = Math.max((endM - startM) * pxPerMinute, 16)
          const contentLeft = timeColWidth
          const contentRight = contentPaddingRight
          const contentWidth = `calc(100% - ${contentLeft + contentRight}px)`
          const laneWidthPct = 100 / lanesCount
          const leftPct = laneWidthPct * (lane || 0)
          return (
            <div
              key={a.id}
              className="absolute pr-2"
              style={{
                top,
                left: `calc(${contentLeft}px + ${leftPct}%)`,
                width: `calc(${contentWidth} * ${laneWidthPct / 100})`,
                height,
              }}
            >
              <div className={`h-full border rounded-lg px-2 py-1 overflow-hidden ${statusClasses(a.status)} shadow-sm`}> 
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold truncate">{formatHM(new Date(a.scheduled_at))} • {a.patient_name}</div>
                  <div className="text-[10px] uppercase tracking-wide opacity-80 truncate">{a.appointment_type}</div>
                </div>
                {a.reason && <div className="text-[10px] opacity-80 truncate">{a.reason}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DayScheduleChart
