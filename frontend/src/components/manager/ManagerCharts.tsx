"use client"

import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from '@/components/charts/LazyRecharts'
import { Cell } from 'recharts'
import { chartStyles, colorForIndex } from '@/components/charts/chartTheme'

interface ManagerChartsProps {
  occupancyData: any[]
  appointmentsByHour: any[]
  appointments7Day: any[]
  todayStatusData: any[]
  occupancyRate?: number
  totalAppointments?: number
}

export default function ManagerCharts({ occupancyData, appointmentsByHour, appointments7Day, todayStatusData }: ManagerChartsProps) {
  const MODE: 'light' | 'dark' = 'light'
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bed Occupancy</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={occupancyData} innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorForIndex(index, MODE)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today’s Appointments by Hour</h3>
            <span className="text-sm text-gray-500">Total: {appointmentsByHour.reduce((s, a) => s + (a.count || 0), 0)}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentsByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="hour" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis allowDecimals={false} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Bar dataKey="count" fill={colorForIndex(0, MODE)} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">7-Day Appointment Trend</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointments7Day}>
                <defs>
                  <linearGradient id="apptColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorForIndex(0, MODE)} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={colorForIndex(0, MODE)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} />
                <XAxis dataKey="label" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <YAxis allowDecimals={false} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
                <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                <Area type="monotone" dataKey="count" stroke={colorForIndex(0, MODE)} fillOpacity={1} fill="url(#apptColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {todayStatusData && todayStatusData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Today’s Workload Status</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={todayStatusData} innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {todayStatusData.map((_, i) => (
                      <Cell key={i} fill={colorForIndex(i, MODE)} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
