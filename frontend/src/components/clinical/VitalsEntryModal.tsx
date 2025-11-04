'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreateVitalsData } from '@/lib/api'

const vitalsSchema = z.object({
  temperature: z.coerce
    .number()
    .min(30, 'Temperature must be at least 30°C')
    .max(45, 'Temperature cannot exceed 45°C')
    .optional()
    .or(z.literal('')),
  heart_rate: z.coerce
    .number()
    .int()
    .min(20, 'Heart rate must be at least 20 bpm')
    .max(250, 'Heart rate cannot exceed 250 bpm')
    .optional()
    .or(z.literal('')),
  blood_pressure_systolic: z.coerce
    .number()
    .int()
    .min(50, 'Systolic BP must be at least 50 mmHg')
    .max(250, 'Systolic BP cannot exceed 250 mmHg')
    .optional()
    .or(z.literal('')),
  blood_pressure_diastolic: z.coerce
    .number()
    .int()
    .min(30, 'Diastolic BP must be at least 30 mmHg')
    .max(150, 'Diastolic BP cannot exceed 150 mmHg')
    .optional()
    .or(z.literal('')),
  respiratory_rate: z.coerce
    .number()
    .int()
    .min(5, 'Respiratory rate must be at least 5 breaths/min')
    .max(60, 'Respiratory rate cannot exceed 60 breaths/min')
    .optional()
    .or(z.literal('')),
  spo2: z.coerce
    .number()
    .int()
    .min(0, 'SpO₂ must be at least 0%')
    .max(100, 'SpO₂ cannot exceed 100%')
    .optional()
    .or(z.literal('')),
  weight: z.coerce
    .number()
    .min(0.5, 'Weight must be at least 0.5 kg')
    .max(500, 'Weight cannot exceed 500 kg')
    .optional()
    .or(z.literal('')),
  height: z.coerce
    .number()
    .min(20, 'Height must be at least 20 cm')
    .max(300, 'Height cannot exceed 300 cm')
    .optional()
    .or(z.literal('')),
  notes: z.string().optional(),
})

type VitalsFormData = z.infer<typeof vitalsSchema>

interface VitalsEntryModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  visitId: string
  patientName: string
  onSubmit: (data: CreateVitalsData) => Promise<void>
}

export function VitalsEntryModal({
  isOpen,
  onClose,
  patientId,
  visitId,
  patientName,
  onSubmit,
}: VitalsEntryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<VitalsFormData>({
    resolver: zodResolver(vitalsSchema),
  })

  const weight = watch('weight')
  const height = watch('height')

  // Calculate BMI if both weight and height are provided
  const calculateBMI = () => {
    if (weight && height && typeof weight === 'number' && typeof height === 'number') {
      const heightInMeters = height / 100
      return (weight / (heightInMeters * heightInMeters)).toFixed(2)
    }
    return null
  }

  const bmi = calculateBMI()

  const handleFormSubmit = async (data: VitalsFormData) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // Filter out empty values
      const vitalsData: CreateVitalsData = {
        patient_id: patientId,
        visit_id: visitId,
        ...(data.temperature && typeof data.temperature === 'number' && { temperature: data.temperature }),
        ...(data.heart_rate && typeof data.heart_rate === 'number' && { heart_rate: data.heart_rate }),
        ...(data.blood_pressure_systolic &&
          typeof data.blood_pressure_systolic === 'number' && {
            blood_pressure_systolic: data.blood_pressure_systolic,
          }),
        ...(data.blood_pressure_diastolic &&
          typeof data.blood_pressure_diastolic === 'number' && {
            blood_pressure_diastolic: data.blood_pressure_diastolic,
          }),
        ...(data.respiratory_rate &&
          typeof data.respiratory_rate === 'number' && { respiratory_rate: data.respiratory_rate }),
        ...(data.spo2 && typeof data.spo2 === 'number' && { spo2: data.spo2 }),
        ...(data.weight && typeof data.weight === 'number' && { weight: data.weight }),
        ...(data.height && typeof data.height === 'number' && { height: data.height }),
        ...(bmi && { bmi: parseFloat(bmi) }),
        ...(data.notes && { notes: data.notes }),
      }

      await onSubmit(vitalsData)
      reset()
      onClose()
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to record vitals')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setErrorMessage(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Record Vitals</h2>
                    <p className="text-sm text-gray-600 mt-1">Patient: {patientName}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isSubmitting}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
                {/* Error message */}
                {errorMessage && (
                  <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
                    {errorMessage}
                  </div>
                )}

                {/* Vital signs grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('temperature')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.temperature ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="36.5"
                    />
                    {errors.temperature && (
                      <p className="text-error-500 text-xs mt-1">{errors.temperature.message}</p>
                    )}
                  </div>

                  {/* Heart Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heart Rate (bpm)
                    </label>
                    <input
                      type="number"
                      {...register('heart_rate')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.heart_rate ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="72"
                    />
                    {errors.heart_rate && (
                      <p className="text-error-500 text-xs mt-1">{errors.heart_rate.message}</p>
                    )}
                  </div>

                  {/* Blood Pressure Systolic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BP Systolic (mmHg)
                    </label>
                    <input
                      type="number"
                      {...register('blood_pressure_systolic')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.blood_pressure_systolic ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="120"
                    />
                    {errors.blood_pressure_systolic && (
                      <p className="text-error-500 text-xs mt-1">{errors.blood_pressure_systolic.message}</p>
                    )}
                  </div>

                  {/* Blood Pressure Diastolic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BP Diastolic (mmHg)
                    </label>
                    <input
                      type="number"
                      {...register('blood_pressure_diastolic')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.blood_pressure_diastolic ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="80"
                    />
                    {errors.blood_pressure_diastolic && (
                      <p className="text-error-500 text-xs mt-1">{errors.blood_pressure_diastolic.message}</p>
                    )}
                  </div>

                  {/* Respiratory Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Respiratory Rate (breaths/min)
                    </label>
                    <input
                      type="number"
                      {...register('respiratory_rate')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.respiratory_rate ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="16"
                    />
                    {errors.respiratory_rate && (
                      <p className="text-error-500 text-xs mt-1">{errors.respiratory_rate.message}</p>
                    )}
                  </div>

                  {/* SpO2 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SpO₂ (%)
                    </label>
                    <input
                      type="number"
                      {...register('spo2')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.spo2 ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="98"
                    />
                    {errors.spo2 && <p className="text-error-500 text-xs mt-1">{errors.spo2.message}</p>}
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('weight')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.weight ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="70.5"
                    />
                    {errors.weight && <p className="text-error-500 text-xs mt-1">{errors.weight.message}</p>}
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('height')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.height ? 'border-error-500' : 'border-gray-300'
                      }`}
                      placeholder="170"
                    />
                    {errors.height && <p className="text-error-500 text-xs mt-1">{errors.height.message}</p>}
                  </div>
                </div>

                {/* BMI Display */}
                {bmi && (
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-primary-900">
                      Calculated BMI: <span className="text-lg font-bold">{bmi}</span>
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Additional observations or notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Recording...
                      </>
                    ) : (
                      'Record Vitals'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
