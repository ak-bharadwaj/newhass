/**
 * Skeleton loading components for better perceived performance
 */
import React from 'react';

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 ${className}`}>
    <div className="h-4 bg-white/10 rounded w-3/4 mb-4 animate-shimmer"></div>
    <div className="h-8 bg-white/10 rounded w-1/2 animate-shimmer"></div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex space-x-4 pb-3 border-b border-white/10">
      {Array(columns).fill(0).map((_, i) => (
        <div key={`header-${i}`} className="h-4 bg-white/10 rounded flex-1 animate-shimmer"></div>
      ))}
    </div>
    {/* Rows */}
    {Array(rows).fill(0).map((_, i) => (
      <div key={`row-${i}`} className="animate-pulse flex space-x-4 py-3">
        {Array(columns).fill(0).map((_, j) => (
          <div key={`cell-${i}-${j}`} className="h-8 bg-white/10 rounded flex-1 animate-shimmer"></div>
        ))}
      </div>
    ))}
  </div>
);

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="animate-pulse bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10" style={{ height }}>
    <div className="h-6 bg-white/10 rounded w-1/3 mb-6 animate-shimmer"></div>
    <div className="flex items-end space-x-2 h-full">
      {Array(12).fill(0).map((_, i) => (
        <div 
          key={i} 
          className="bg-gradient-to-t from-blue-500/30 to-purple-500/30 rounded-t flex-1 animate-shimmer"
          style={{ height: `${Math.random() * 80 + 20}%` }}
        ></div>
      ))}
    </div>
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="animate-pulse bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
    <div className="flex items-center justify-between mb-4">
      <div className="h-10 w-10 bg-white/10 rounded-xl animate-shimmer"></div>
      <div className="h-6 w-16 bg-white/10 rounded animate-shimmer"></div>
    </div>
    <div className="h-8 bg-white/10 rounded w-1/2 mb-2 animate-shimmer"></div>
    <div className="h-4 bg-white/10 rounded w-3/4 animate-shimmer"></div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-4">
    {Array(items).fill(0).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
        <div className="h-12 w-12 bg-white/10 rounded-full animate-shimmer"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded w-3/4 animate-shimmer"></div>
          <div className="h-3 bg-white/10 rounded w-1/2 animate-shimmer"></div>
        </div>
      </div>
    ))}
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 6 }) => (
  <div className="space-y-6">
    {Array(fields).fill(0).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-2 animate-shimmer"></div>
        <div className="h-12 bg-white/10 rounded w-full animate-shimmer"></div>
      </div>
    ))}
    <div className="flex gap-4 pt-4">
      <div className="h-12 bg-white/10 rounded flex-1 animate-shimmer"></div>
      <div className="h-12 bg-white/10 rounded flex-1 animate-shimmer"></div>
    </div>
  </div>
);

// Dashboard Grid Skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats Row */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array(4).fill(0).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton height={300} />
      <ChartSkeleton height={300} />
    </div>
    {/* Table */}
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      <TableSkeleton rows={5} columns={5} />
    </div>
  </div>
);
