"use client"

import * as React from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className={clsx('w-full', className)}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div
          className={clsx(
            'relative flex items-center rounded-xl border-2 transition-all bg-white',
            error ? 'border-red-400 focus-within:border-red-500' : 'border-gray-200 focus-within:border-blue-500',
            'focus-within:ring-4 focus-within:ring-blue-100'
          )}
        >
          {leftIcon && <span className="pl-3 text-gray-400">{leftIcon}</span>}
          <input
            id={inputId}
            ref={ref}
            className={clsx('w-full px-4 py-2.5 rounded-xl outline-none bg-transparent', leftIcon && 'pl-2', rightIcon && 'pr-8')}
            aria-invalid={!!error}
            aria-describedby={hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && <span className="absolute right-3 text-gray-400">{rightIcon}</span>}
        </div>
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-gray-500">
            {hint}
          </p>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
