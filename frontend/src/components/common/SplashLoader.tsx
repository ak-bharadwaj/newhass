"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function SplashLoader() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black"
          role="dialog"
          aria-label="Loading"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-600 shadow-2xl flex items-center justify-center text-white text-3xl">
              🏥
            </div>
            <p className="mt-4 text-gray-800 dark:text-gray-100 font-semibold">Hospital Automation</p>
            <motion.div
              className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
              initial={{}}
            >
              <motion.div
                className="h-full w-1/3 bg-blue-600"
                animate={{ x: ['0%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
