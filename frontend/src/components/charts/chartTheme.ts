// Centralized accessible chart color theme and helpers
// Palette: Okabe–Ito (colorblind-safe) + extensions

export type ThemeMode = 'light' | 'dark'

// Okabe–Ito palette (base)
const OKABE_ITO = [
  '#0072B2', // blue
  '#E69F00', // orange
  '#009E73', // bluish green
  '#D55E00', // vermillion
  '#CC79A7', // reddish purple
  '#56B4E9', // sky blue
  '#F0E442', // yellow
  '#000000', // black
]

// Extended palette for more series, tuned for contrast on light backgrounds
const LIGHT_EXTENDED = [
  '#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9', '#F0E442', '#000000',
  '#5E3C99', // purple (deep)
  '#4DAF4A', // green (vivid)
  '#984EA3', // purple (alt)
  '#377EB8', // blue (alt)
  '#FF7F00', // orange (alt)
  '#A6CEE3', // light blue
  '#1F78B4', // dark blue
  '#B2DF8A', // light green
]

// Dark mode palette: brighten tones and avoid low-contrast yellows on dark bg
const DARK_EXTENDED = [
  '#60A5FA', // blue-400
  '#F59E0B', // amber-500
  '#34D399', // emerald-400
  '#F97316', // orange-500
  '#F472B6', // pink-400
  '#22D3EE', // cyan-400
  '#EAB308', // yellow-500
  '#F3F4F6', // gray-100
  '#A78BFA', // violet-400
  '#4ADE80', // green-400
  '#C084FC', // violet-400
  '#93C5FD', // blue-300
  '#FCA5A5', // red-300
  '#67E8F9', // cyan-300
  '#86EFAC', // green-300
  '#F9A8D4', // pink-300
]

export function getChartPalette(mode: ThemeMode = 'light'): string[] {
  return mode === 'dark' ? DARK_EXTENDED : LIGHT_EXTENDED
}

// Deterministic color by index
export function colorForIndex(index: number, mode: ThemeMode = 'light'): string {
  const pal = getChartPalette(mode)
  return pal[(index ?? 0) % pal.length]
}

// Deterministic color by key (stable hash)
export function colorForKey(key: string | number, mode: ThemeMode = 'light'): string {
  const str = String(key)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const pal = getChartPalette(mode)
  const idx = Math.abs(hash) % pal.length
  return pal[idx]
}

export const chartStyles = {
  light: {
    axis: '#374151', // gray-700
    axisTick: '#374151',
    grid: '#E5E7EB', // gray-200
    legend: '#374151',
    tooltipBg: 'rgba(255,255,255,0.97)',
    tooltipBorder: '#E5E7EB',
    tooltipText: '#111827',
  },
  dark: {
    axis: '#D1D5DB', // gray-300
    axisTick: '#D1D5DB',
    grid: '#374151', // gray-700
    legend: '#D1D5DB',
    tooltipBg: 'rgba(17,24,39,0.95)',
    tooltipBorder: 'rgba(148, 163, 184, 0.35)', // slate-400/35
    tooltipText: '#F9FAFB',
  },
} as const

// Convenience: gradient id for Areas
export function gradientIdFor(key: string) {
  return `gradient-${key}`
}
