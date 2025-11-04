"use client";

import { motion } from 'framer-motion'

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {Number.isFinite(value) ? value : 0}
    </motion.span>
  )
}
