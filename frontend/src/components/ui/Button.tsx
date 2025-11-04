"use client"

import * as React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, iconLeft, iconRight, className, children, disabled, ...props },
    ref
  ) => {
    const base = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 select-none'

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md hover:shadow-lg',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    }

    const sizes: Record<ButtonSize, string> = {
      sm: 'text-sm px-3 py-2',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-5 py-3',
    }

    const MotionButton = motion.button as any
    return (
      <MotionButton
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        className={clsx(base, variants[variant], sizes[size], 'disabled:opacity-60 disabled:cursor-not-allowed', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
            <path className="opacity-75" d="M4 12a8 8 0 018-8V0" strokeWidth="4" />
          </svg>
        )}
        {iconLeft && <span className="mr-2">{iconLeft}</span>}
        <span>{children}</span>
        {iconRight && <span className="ml-2">{iconRight}</span>}
      </MotionButton>
    )
  }
)
Button.displayName = 'Button'
