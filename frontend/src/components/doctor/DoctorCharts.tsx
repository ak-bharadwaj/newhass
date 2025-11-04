"use client"

import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from '@/components/charts/LazyRecharts'
import { chartStyles, colorForIndex, colorForKey } from '@/components/charts/chartTheme'

interface DoctorChartsProps {
  rxTrend: Array<any>
  vitalsSpark: Array<any>
}

export default function DoctorCharts({ rxTrend, vitalsSpark }: DoctorChartsProps) {
  const MODE: 'light' | 'dark' = 'light'
  return (
    <>
      <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescriptions (7 days)</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            {/* @ts-ignore - Recharts ResponsiveContainer expects a single child element */}
            <BarChart data={rxTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
              <XAxis dataKey="label" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <YAxis allowDecimals={false} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
              <Bar dataKey="pending" stackId="a" fill={colorForIndex(0, MODE)} name="Pending" />
              <Bar dataKey="dispensed" stackId="a" fill={colorForIndex(1, MODE)} name="Dispensed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vitals Sparkline</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            {/* @ts-ignore - Recharts ResponsiveContainer expects a single child element */}
            <LineChart data={vitalsSpark}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
              <XAxis dataKey="t" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
              <Line type="monotone" dataKey="hr" name="HR" stroke={colorForKey('hr', MODE)} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="spo2" name="SpO₂" stroke={colorForKey('spo2', MODE)} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="temp" name="Temp" stroke={colorForKey('temp', MODE)} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
