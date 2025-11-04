'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@/components/charts/LazyRecharts'
import { chartStyles, colorForKey } from '@/components/charts/chartTheme'
import { Vitals } from '@/lib/api'

interface VitalsChartProps {
  vitals: Vitals[]
  metric: 'temperature' | 'heart_rate' | 'blood_pressure' | 'spo2' | 'respiratory_rate'
}

export function VitalsChart({ vitals, metric }: VitalsChartProps) {
  const getMetricConfig = () => {
    switch (metric) {
      case 'temperature':
        return {
          title: 'Temperature',
          unit: '°C',
          dataKey: 'temperature',
          color: '#ef4444',
          normalRange: { min: 36.1, max: 37.2 },
        }
      case 'heart_rate':
        return {
          title: 'Heart Rate',
          unit: 'bpm',
          dataKey: 'heart_rate',
          color: '#3b82f6',
          normalRange: { min: 60, max: 100 },
        }
      case 'blood_pressure':
        return {
          title: 'Blood Pressure',
          unit: 'mmHg',
          dataKey: 'blood_pressure_systolic',
          dataKey2: 'blood_pressure_diastolic',
          color: '#8b5cf6',
          color2: '#d946ef',
          normalRange: { systolic: { min: 90, max: 120 }, diastolic: { min: 60, max: 80 } },
        }
      case 'spo2':
        return {
          title: 'SpO₂',
          unit: '%',
          dataKey: 'spo2',
          color: '#10b981',
          normalRange: { min: 95, max: 100 },
        }
      case 'respiratory_rate':
        return {
          title: 'Respiratory Rate',
          unit: 'breaths/min',
          dataKey: 'respiratory_rate',
          color: '#f59e0b',
          normalRange: { min: 12, max: 20 },
        }
    }
  }

  const config = getMetricConfig()

  // Format data for chart
  const chartData = vitals
    .map((v) => ({
      recorded_at: new Date(v.recorded_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: new Date(v.recorded_at).getTime(),
      [config.dataKey]: v[config.dataKey as keyof Vitals] || null,
      ...(config.dataKey2 && { [config.dataKey2]: v[config.dataKey2 as keyof Vitals] || null }),
      is_abnormal: v.is_abnormal,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (chartData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{config.title}</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No vitals data available</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
        <div className="text-sm text-gray-600">
          {chartData.length} reading{chartData.length !== 1 ? 's' : ''}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.light.grid} />
          <XAxis
            dataKey="recorded_at"
            stroke={chartStyles.light.axis}
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke={chartStyles.light.axis} style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: any) => [`${value} ${config.unit}`, config.title]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={config.dataKey}
            stroke={colorForKey(config.dataKey, 'light')}
            strokeWidth={2}
            dot={{ fill: colorForKey(config.dataKey, 'light'), r: 4 }}
            activeDot={{ r: 6 }}
            name={config.title}
          />
          {config.dataKey2 && (
            <Line
              type="monotone"
              dataKey={config.dataKey2}
              stroke={colorForKey(config.dataKey2, 'light')}
              strokeWidth={2}
              dot={{ fill: colorForKey(config.dataKey2, 'light'), r: 4 }}
              activeDot={{ r: 6 }}
              name={metric === 'blood_pressure' ? 'Diastolic' : config.dataKey2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Normal range indicator */}
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-success-500" />
          <span>Normal range:</span>
        </div>
        {metric === 'blood_pressure' && config.normalRange.systolic && config.normalRange.diastolic ? (
          <span>
            {config.normalRange.systolic.min}-{config.normalRange.systolic.max}/
            {config.normalRange.diastolic.min}-{config.normalRange.diastolic.max} {config.unit}
          </span>
        ) : (
          <span>
            {config.normalRange.min}-{config.normalRange.max} {config.unit}
          </span>
        )}
      </div>
    </motion.div>
  )
}
