"use client"

import * as React from 'react'

interface Chip {
  label: string
  color?: 'blue' | 'gray' | 'green' | 'purple' | 'amber' | 'red'
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  chips?: Chip[]
  className?: string
  actions?: React.ReactNode
}

const chipStyles: Record<NonNullable<Chip['color']>, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function SectionHeader({ title, subtitle, chips = [], className = '', actions }: SectionHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-1">
            {title}
          </h1>
          {subtitle && <p className="text-gray-500 text-sm md:text-base">{subtitle}</p>}

          {chips.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {chips.map((chip, idx) => (
                <span
                  key={`${chip.label}-${idx}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${chipStyles[chip.color || 'gray']} shadow-sm`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {actions && (
          <div className="ml-4 flex items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}

export default SectionHeader
