/**
 * QR Code Generator Component
 *
 * Displays generated QR codes for patient check-in
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

interface QRGeneratorProps {
  patientId: string
  appointmentId?: string
  patientName: string
  onClose: () => void
}

interface QRCodeData {
  qr_code_image: string
  qr_code_data: string
  expires_at: string
  patient: {
    id: string
    mrn: string
    name: string
  }
}

export function QRGenerator({ patientId, appointmentId, patientName, onClose }: QRGeneratorProps) {
  const { token } = useAuth()
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiryHours, setExpiryHours] = useState(24)

  const generateQR = async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/qr/generate/patient-checkin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            patient_id: patientId,
            appointment_id: appointmentId || null,
            expires_in_hours: expiryHours,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate QR code')
      }

      const data: QRCodeData = await response.json()
      setQrCode(data)
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!qrCode) return

    const link = document.createElement('a')
    link.href = qrCode.qr_code_image
    link.download = `qr-${qrCode.patient.mrn}-${Date.now()}.png`
    link.click()
  }

  const printQR = () => {
    if (!qrCode) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Check-in QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .patient-info {
              margin: 20px 0;
              font-size: 16px;
            }
            .qr-code {
              margin: 30px 0;
            }
            .expires {
              color: #666;
              font-size: 14px;
              margin-top: 20px;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <h1>Patient Check-in QR Code</h1>
          <div class="patient-info">
            <strong>${qrCode.patient.name}</strong><br>
            MRN: ${qrCode.patient.mrn}
          </div>
          <div class="qr-code">
            <img src="${qrCode.qr_code_image}" alt="QR Code" style="max-width: 400px;" />
          </div>
          <div class="expires">
            Valid until: ${new Date(qrCode.expires_at).toLocaleString()}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Generate Check-in QR Code</h2>
            <p className="text-primary-100 text-sm mt-1">{patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!qrCode && !loading && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Validity
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={1}>1 hour</option>
                  <option value={4}>4 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours (default)</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  QR code will expire after this duration
                </p>
              </div>

              <button
                onClick={generateQR}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Generate QR Code
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-600">Generating QR code...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
              <div className="flex items-center gap-2 text-error-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold">Error</p>
              </div>
              <p className="text-sm text-error-600 mt-1">{error}</p>
              <button
                onClick={generateQR}
                className="mt-3 text-sm text-error-700 font-semibold hover:text-error-800"
              >
                Try Again
              </button>
            </div>
          )}

          {qrCode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* QR Code Display */}
              <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
                <img
                  src={qrCode.qr_code_image}
                  alt="Patient Check-in QR Code"
                  className="w-64 h-64"
                />
              </div>

              {/* Patient Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Patient:</strong> {qrCode.patient.name}
                </p>
                <p className="text-sm text-blue-900 mt-1">
                  <strong>MRN:</strong> {qrCode.patient.mrn}
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Expires:</strong> {new Date(qrCode.expires_at).toLocaleString()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadQR}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={printQR}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>

              <button
                onClick={() => {
                  setQrCode(null)
                  setError(null)
                }}
                className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Generate New QR Code
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default QRGenerator
