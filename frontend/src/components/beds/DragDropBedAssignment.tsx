/**
 * Drag-and-Drop Bed Assignment Component
 *
 * Drag patients to available beds with animated transitions
 * Uses @dnd-kit for drag and drop functionality
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '@/contexts/AuthContext'

interface Patient {
  id: string
  first_name: string
  last_name: string
  mrn: string
  age?: number
  gender?: string
  priority?: string
}

interface Bed {
  id: string
  bed_number: string
  ward: string
  floor?: string
  bed_type: string
  status: string
  assigned_patient_id?: string
  assigned_patient?: Patient
}

interface DragDropBedAssignmentProps {
  beds: Bed[]
  waitingPatients: Patient[]
  onAssignBed: (bedId: string, patientId: string) => Promise<void>
  onReleaseBed: (bedId: string) => Promise<void>
}

// Sortable Patient Card
function SortablePatientCard({ patient }: { patient: Patient }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: patient.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PatientCard patient={patient} />
    </div>
  )
}

// Patient Card Component
function PatientCard({ patient }: { patient: Patient }) {
  const priorityColors = {
    emergency: 'border-error-500 bg-error-50',
    high: 'border-warning-500 bg-warning-50',
    normal: 'border-gray-300 bg-white',
  }

  const priorityColor = priorityColors[patient.priority as keyof typeof priorityColors] || priorityColors.normal

  return (
    <div
      className={`p-4 rounded-lg border-2 ${priorityColor} cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-900">
            {patient.first_name} {patient.last_name}
          </h3>
          <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
          {patient.age && (
            <p className="text-xs text-gray-500 mt-1">
              {patient.age} years • {patient.gender}
            </p>
          )}
        </div>
        {patient.priority && (
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              patient.priority === 'emergency'
                ? 'bg-error-600 text-white'
                : patient.priority === 'high'
                ? 'bg-warning-600 text-white'
                : 'bg-gray-600 text-white'
            }`}
          >
            {patient.priority}
          </span>
        )}
      </div>
    </div>
  )
}

// Droppable Bed Slot
function BedSlot({
  bed,
  isOver,
  onRelease,
}: {
  bed: Bed
  isOver?: boolean
  onRelease: (bedId: string) => void
}) {
  const statusColors = {
    available: 'border-success-300 bg-success-50',
    occupied: 'border-gray-300 bg-gray-50',
    maintenance: 'border-warning-300 bg-warning-50',
    reserved: 'border-blue-300 bg-blue-50',
  }

  const statusColor = statusColors[bed.status as keyof typeof statusColors] || statusColors.available
  const highlightColor = isOver ? 'border-primary-500 bg-primary-100' : ''

  return (
    <div
      className={`p-4 rounded-lg border-2 ${highlightColor || statusColor} transition-all min-h-[100px] relative`}
    >
      {/* Bed Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-bold text-gray-900">{bed.bed_number}</h4>
          <p className="text-xs text-gray-600">{bed.ward}</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            bed.status === 'available'
              ? 'bg-success-600 text-white'
              : bed.status === 'occupied'
              ? 'bg-gray-600 text-white'
              : bed.status === 'maintenance'
              ? 'bg-warning-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {bed.status}
        </span>
      </div>

      {/* Assigned Patient or Drop Zone */}
      {bed.status === 'occupied' && bed.assigned_patient ? (
        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {bed.assigned_patient.first_name} {bed.assigned_patient.last_name}
              </p>
              <p className="text-xs text-gray-600">MRN: {bed.assigned_patient.mrn}</p>
            </div>
            <button
              onClick={() => onRelease(bed.id)}
              className="text-error-600 hover:text-error-700 p-1"
              title="Release bed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : bed.status === 'available' ? (
        <div
          className={`mt-2 p-3 border-2 border-dashed ${
            isOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
          } rounded-lg flex items-center justify-center min-h-[60px]`}
        >
          <p className="text-xs text-gray-500 text-center">
            {isOver ? 'Drop patient here' : 'Drag patient here to assign'}
          </p>
        </div>
      ) : (
        <div className="mt-2 p-3 bg-gray-100 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 text-center">{bed.status}</p>
        </div>
      )}
    </div>
  )
}

export function DragDropBedAssignment({
  beds,
  waitingPatients,
  onAssignBed,
  onReleaseBed,
}: DragDropBedAssignmentProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [patients, setPatients] = useState(waitingPatients)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)

    if (!over) return

    const patientId = active.id as string
    const bedId = over.id as string

    // Check if dropping on a bed
    const targetBed = beds.find((bed) => bed.id === bedId)
    if (!targetBed) return

    // Only allow dropping on available beds
    if (targetBed.status !== 'available') {
      setError('This bed is not available')
      setTimeout(() => setError(null), 3000)
      return
    }

    // Assign bed
    setProcessing(true)
    setError(null)

    try {
      await onAssignBed(bedId, patientId)

      // Remove patient from waiting list (optimistic update)
      setPatients((prev) => prev.filter((p) => p.id !== patientId))
    } catch (err: any) {
      setError(err.message || 'Failed to assign bed')
    } finally {
      setProcessing(false)
    }
  }

  const handleReleaseBed = async (bedId: string) => {
    setProcessing(true)
    setError(null)

    try {
      await onReleaseBed(bedId)
    } catch (err: any) {
      setError(err.message || 'Failed to release bed')
    } finally {
      setProcessing(false)
    }
  }

  const activePatient = patients.find((p) => p.id === activeId)

  // Group beds by ward
  const bedsByWard = beds.reduce((acc, bed) => {
    if (!acc[bed.ward]) {
      acc[bed.ward] = []
    }
    acc[bed.ward].push(bed)
    return acc
  }, {} as Record<string, Bed[]>)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Patients */}
        <div className="lg:col-span-1">
          <div className="glass bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Waiting for Bed
              <span className="ml-auto px-2 py-1 bg-primary-100 text-primary-800 text-xs font-semibold rounded-full">
                {patients.length}
              </span>
            </h3>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700"
              >
                {error}
              </motion.div>
            )}

            <SortableContext items={patients.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {patients.map((patient) => (
                  <SortablePatientCard key={patient.id} patient={patient} />
                ))}
              </div>
            </SortableContext>

            {patients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">No patients waiting for beds</p>
              </div>
            )}
          </div>
        </div>

        {/* Beds by Ward */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {Object.entries(bedsByWard).map(([ward, wardBeds]) => (
              <div key={ward} className="glass bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  {ward}
                  <span className="ml-auto px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                    {wardBeds.filter((b) => b.status === 'available').length} / {wardBeds.length} available
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wardBeds.map((bed) => (
                    <BedSlot key={bed.id} bed={bed} onRelease={handleReleaseBed} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activePatient ? (
          <div className="opacity-80">
            <PatientCard patient={activePatient} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-semibold">Processing...</p>
          </div>
        </div>
      )}
    </DndContext>
  )
}

export default DragDropBedAssignment
