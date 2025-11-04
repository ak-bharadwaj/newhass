"use client"

import React from 'react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/components/charts/LazyRecharts'
import { Cell } from 'recharts'
import { colorForIndex, chartStyles, gradientIdFor } from '@/components/charts/chartTheme'

// mode derived from html.dark if available
const getMode = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

interface SuperAdminChartsProps {
  analyticsData: any
  selectedMetric?: string
  colorsMap?: Record<string, string>
}

export default function SuperAdminCharts({ analyticsData, selectedMetric = 'all', colorsMap }: SuperAdminChartsProps) {
  if (!analyticsData) return null
  const renderChart = (type: string, data: any[], chartType: string, title: string, dataKeys: any) => {
    const MODE = getMode()
    const commonProps = { data, margin: { top: 20, right: 30, left: 20, bottom: 20 } }

    const chartContent = () => {
      switch (chartType) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} opacity={0.4} />
              <XAxis dataKey="date" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
              <Legend />
              {dataKeys.map((key: any, idx: number) => {
                const fallback = colorForIndex(idx, MODE)
                const c = colorsMap?.[key.colorKey || Object.keys(colorsMap || {})[idx]] || fallback
                return <Line key={key.dataKey} type="monotone" dataKey={key.dataKey} stroke={c} strokeWidth={2} dot={{ r: 3 }} />
              })}
            </LineChart>
          )

        case 'bar':
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} opacity={0.4} />
              <XAxis dataKey={dataKeys[0]?.xKey || 'date'} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
              <Legend />
              {dataKeys.map((key: any, idx: number) => {
                const fallback = colorForIndex(idx, MODE)
                const c = colorsMap?.[key.colorKey || Object.keys(colorsMap || {})[idx]] || fallback
                return <Bar key={key.dataKey} dataKey={key.dataKey} fill={c} radius={[8, 8, 0, 0]} />
              })}
            </BarChart>
          )

        case 'area':
          return (
            <AreaChart {...commonProps}>
              <defs>
                {dataKeys.map((key: any, idx: number) => {
                  const fallback = colorForIndex(idx, MODE)
                  const c = colorsMap?.[key.colorKey || Object.keys(colorsMap || {})[idx]] || fallback
                  const gid = gradientIdFor(key.dataKey)
                  return (
                    <linearGradient key={key.dataKey} id={gid} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={c} stopOpacity={0.1} />
                    </linearGradient>
                  )
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} opacity={0.4} />
              <XAxis dataKey="date" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
              <Legend />
              {dataKeys.map((key: any, idx: number) => {
                const fallback = colorForIndex(idx, MODE)
                const c = colorsMap?.[key.colorKey || Object.keys(colorsMap || {})[idx]] || fallback
                return <Area key={key.dataKey} type="monotone" dataKey={key.dataKey} stroke={c} strokeWidth={2} fill={`url(#${gradientIdFor(key.dataKey)})`} />
              })}
            </AreaChart>
          )

        case 'pie':
          return (
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={120} fill="#8884d8" dataKey="value">
                {data.map((entry: any, index: number) => {
                  const fallback = colorForIndex(index, MODE)
                  const c = colorsMap?.[entry.colorKey || Object.keys(colorsMap || {})[index]] || fallback
                  return <Cell key={`cell-${index}`} fill={c} />
                })}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: chartStyles[MODE].tooltipBg, border: `1px solid ${chartStyles[MODE].tooltipBorder}`, color: chartStyles[MODE].tooltipText }} />
            </PieChart>
          )

        default:
          return null
      }
    }

    return (
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-900/90 dark:via-gray-800/80 dark:to-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          {chartContent() || <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No data available</div>}
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {renderChart('patients', analyticsData.patientData || [], 'line', 'Patient Analytics', [{ dataKey: 'admissions', colorKey: 'blue' }, { dataKey: 'discharges', colorKey: 'purple' }, { dataKey: 'visits', colorKey: 'green' }])}
      {renderChart('appointments', analyticsData.appointmentData || [], 'bar', 'Appointment Analytics', [{ dataKey: 'scheduled', colorKey: 'cyan' }, { dataKey: 'completed', colorKey: 'green' }, { dataKey: 'cancelled', colorKey: 'red' }])}
      {renderChart('revenue', analyticsData.revenueData || [], 'area', 'Revenue Analytics', [{ dataKey: 'revenue', colorKey: 'amber' }, { dataKey: 'expenses', colorKey: 'orange' }, { dataKey: 'profit', colorKey: 'emerald' }])}
      {renderChart('bedOccupancy', analyticsData.bedOccupancyData || [], 'bar', 'Bed Occupancy Analytics', [{ dataKey: 'occupied', colorKey: 'pink' }, { dataKey: 'available', colorKey: 'green' }])}
      {renderChart('hospitals', analyticsData.hospitalComparison || [], 'bar', 'Hospital Comparison', [{ dataKey: 'patients', xKey: 'name', colorKey: 'blue' }, { dataKey: 'occupancy', xKey: 'name', colorKey: 'amber' }])}
      {renderChart('regions', analyticsData.regionComparison || [], 'pie', 'Region Comparison', [{ dataKey: 'value', colorKey: 'purple' }])}
    </div>
  )
}
