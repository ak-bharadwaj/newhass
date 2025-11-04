'use client'

import { motion } from 'framer-motion'
import { Bed, PatientWithVitals } from '@/lib/api'

interface BedBoardProps {
  beds: Bed[]
  onBedClick: (bed: Bed) => void
  onAssign?: (bedId: string) => void
  onRelease?: (bedId: string) => void
}

export function BedBoard({ beds, onBedClick, onAssign, onRelease }: BedBoardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success-100 border-success-300 hover:border-success-500'
      case 'occupied':
        return 'bg-error-100 border-error-300 hover:border-error-500'
      case 'maintenance':
        return 'bg-warning-100 border-warning-300 hover:border-warning-500'
      case 'reserved':
        return 'bg-blue-100 border-blue-300 hover:border-blue-500'
      default:
        return 'bg-gray-100 border-gray-300 hover:border-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return '✓'
      case 'occupied':
        return '👤'
      case 'maintenance':
        return '🔧'
      case 'reserved':
        return '🔒'
      default:
        return '?'
    }
  }

  const getBedTypeIcon = (type: string) => {
    switch (type) {
      case 'icu':
        return '🏥'
      case 'isolation':
        return '🚫'
      default:
        return '🛏️'
    }
  }

  // Group beds by ward
  const bedsByWard = beds.reduce((groups, bed) => {
    if (!groups[bed.ward]) {
      groups[bed.ward] = []
    }
    groups[bed.ward].push(bed)
    return groups
  }, {} as Record<string, Bed[]>)

  const wards = Object.keys(bedsByWard).sort()

  if (beds.length === 0) {
    return (
      <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bed Board</h3>
        <div className="text-center py-12">
          <p className="text-gray-500">No beds configured</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Bed Management</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success-500"></div>
              <span>Available: {beds.filter(b => b.status === 'available').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-error-500"></div>
              <span>Occupied: {beds.filter(b => b.status === 'occupied').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning-500"></div>
              <span>Maintenance: {beds.filter(b => b.status === 'maintenance').length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {wards.map((ward) => (
          <div key={ward} className="space-y-3">
            <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-lg">{ward}</span>
              <span className="text-sm text-gray-600">
                ({bedsByWard[ward].length} beds)
              </span>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {bedsByWard[ward].map((bed, index) => (
                <motion.div
                  key={bed.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onBedClick(bed)}
                  className={`
                    relative cursor-pointer rounded-lg p-4 border-2 transition-all
                    ${getStatusColor(bed.status)}
                    hover:shadow-lg
                  `}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      {getBedTypeIcon(bed.bed_type)}
                    </div>
                    <p className="font-bold text-gray-900 mb-1">{bed.bed_number}</p>
                    {bed.floor && (
                      <p className="text-xs text-gray-600 mb-2">Floor {bed.floor}</p>
                    )}
                    <div className="text-xs font-medium text-gray-700 mb-2 capitalize">
                      {bed.bed_type}
                    </div>

                    {bed.status === 'occupied' && bed.assigned_patient_name && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {bed.assigned_patient_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {bed.assigned_patient_mrn}
                        </p>
                      </div>
                    )}

                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/50 rounded text-xs font-medium">
                        <span>{getStatusIcon(bed.status)}</span>
                        <span className="capitalize">{bed.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  {bed.status === 'available' && onAssign && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAssign(bed.id)
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-success-600 text-white rounded hover:bg-success-700 transition-colors opacity-0 group-hover:opacity-100"
                      title="Assign bed"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}

                  {bed.status === 'occupied' && onRelease && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRelease(bed.id)
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors opacity-0 group-hover:opacity-100"
                      title="Release bed"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
