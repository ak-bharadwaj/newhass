"use client";

import { clsx } from 'clsx'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800", className)} />
  )
}
