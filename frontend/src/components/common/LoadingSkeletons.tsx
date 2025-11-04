'use client';

import { motion } from 'framer-motion';

// Skeleton animation
const shimmer = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-xl ${className}`}
      variants={shimmer}
      initial="initial"
      animate="animate"
    />
  );
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      variants={shimmer}
      initial="initial"
      animate="animate"
    />
  );
}

export function SkeletonCircle({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <motion.div
      className={`${sizes[size]} rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]`}
      variants={shimmer}
      initial="initial"
      animate="animate"
    />
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonText className="w-48 h-8" />
          <SkeletonText className="w-32 h-4" />
        </div>
        <SkeletonCard className="w-32 h-10" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard className="lg:col-span-2 h-96" />
        <SkeletonCard className="h-96" />
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonText key={i} className="flex-1 h-6" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {[1, 2, 3, 4].map((j) => (
            <SkeletonText key={j} className="flex-1 h-10" />
          ))}
        </div>
      ))}
    </div>
  );
}

// List skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonCircle size="md" />
          <div className="flex-1 space-y-2">
            <SkeletonText className="w-3/4" />
            <SkeletonText className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonText className="w-24 h-4" />
          <SkeletonCard className="h-10" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <SkeletonCard className="flex-1 h-10" />
        <SkeletonCard className="flex-1 h-10" />
      </div>
    </div>
  );
}
