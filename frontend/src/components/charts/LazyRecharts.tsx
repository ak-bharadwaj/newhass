"use client";

import dynamic from 'next/dynamic'

// Core cartesian components
export const ResponsiveContainer = dynamic<any>(() => import('recharts').then(m => m.ResponsiveContainer as any), { ssr: false }) as any
export const CartesianGrid = dynamic<any>(() => import('recharts').then(m => m.CartesianGrid as any), { ssr: false }) as any
export const Tooltip = dynamic<any>(() => import('recharts').then(m => m.Tooltip as any), { ssr: false }) as any
export const Legend = dynamic<any>(() => import('recharts').then(m => m.Legend as any), { ssr: false }) as any
export const XAxis = dynamic<any>(() => import('recharts').then(m => m.XAxis as any), { ssr: false }) as any
export const YAxis = dynamic<any>(() => import('recharts').then(m => m.YAxis as any), { ssr: false }) as any

// Line charts
export const LineChart = dynamic<any>(() => import('recharts').then(m => m.LineChart as any), { ssr: false }) as any
export const Line = dynamic<any>(() => import('recharts').then(m => m.Line as any), { ssr: false }) as any

// Bar charts
export const BarChart = dynamic<any>(() => import('recharts').then(m => m.BarChart as any), { ssr: false }) as any
export const Bar = dynamic<any>(() => import('recharts').then(m => m.Bar as any), { ssr: false }) as any

// Area charts
export const AreaChart = dynamic<any>(() => import('recharts').then(m => m.AreaChart as any), { ssr: false }) as any
export const Area = dynamic<any>(() => import('recharts').then(m => m.Area as any), { ssr: false }) as any

// Pie charts
export const PieChart = dynamic<any>(() => import('recharts').then(m => m.PieChart as any), { ssr: false }) as any
export const Pie = dynamic<any>(() => import('recharts').then(m => m.Pie as any), { ssr: false }) as any
export const Cell = dynamic<any>(() => import('recharts').then(m => (m as any).Cell), { ssr: false }) as any

// Radar charts (used in some admin analytics)
export const RadarChart = dynamic<any>(() => import('recharts').then(m => m.RadarChart as any), { ssr: false }) as any
export const Radar = dynamic<any>(() => import('recharts').then(m => m.Radar as any), { ssr: false }) as any
export const PolarGrid = dynamic<any>(() => import('recharts').then(m => m.PolarGrid as any), { ssr: false }) as any
export const PolarAngleAxis = dynamic<any>(() => import('recharts').then(m => m.PolarAngleAxis as any), { ssr: false }) as any
export const PolarRadiusAxis = dynamic<any>(() => import('recharts').then(m => m.PolarRadiusAxis as any), { ssr: false }) as any
