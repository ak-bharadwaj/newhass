'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface BackButtonProps {
  className?: string
  label?: string
  fallbackUrl?: string
}

export function BackButton({ className = '', label = 'Back', fallbackUrl }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // Check if there's browser history to go back to
    if (window.history.length > 1) {
      router.back()
    } else if (fallbackUrl) {
      // Fallback to a specific URL if no history
      router.push(fallbackUrl)
    } else {
      // Default fallback to home/dashboard
      router.push('/')
    }
  }

  return (
    <motion.button
      onClick={handleBack}
      whileHover={{ scale: 1.02, x: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-all shadow-sm hover:shadow-md ${className}`}
    >
      <svg 
        className="w-5 h-5 text-gray-700 dark:text-gray-300" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M10 19l-7-7m0 0l7-7m-7 7h18" 
        />
      </svg>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </motion.button>
  )
}
