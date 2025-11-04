/**
 * QR Code Scanner Component
 *
 * Camera-based QR code scanner for patient check-in
 * Uses html5-qrcode library
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { useAuth } from '@/contexts/AuthContext'

interface QRScannerProps {
  onScanSuccess: (result: QRScanResult) => void
  onError?: (error: string) => void
  onClose: () => void
}

interface QRScanResult {
  valid: boolean
  patient?: {
    id: string
    mrn: string
    first_name: string
    last_name: string
    date_of_birth: string
    phone?: string
    email?: string
  }
  appointment?: {
    id: string
    appointment_date: string
    doctor_id: string
    status: string
  }
  error?: string
}

export function QRScanner({ onScanSuccess, onError, onClose }: QRScannerProps) {
  const { token } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerElementId = 'qr-scanner-region'

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      scannerElementId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      false
    )

    scannerRef.current = scanner

    const onScanSuccessCallback = async (decodedText: string) => {
      setScanning(false)
      setValidating(true)

      // Stop scanner
      scanner.pause(true)

      try {
        // Validate QR code with backend
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/qr/validate/checkin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ qr_data: decodedText }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'QR code validation failed')
        }

        const result: QRScanResult = await response.json()

        setValidating(false)
        onScanSuccess(result)

        // Clean up scanner
        scanner.clear()
      } catch (err: any) {
        setValidating(false)
        setError(err.message || 'Validation failed')
        if (onError) {
          onError(err.message)
        }

        // Resume scanner for retry
        scanner.resume()
        setScanning(true)
      }
    }

    const onScanFailureCallback = (error: string) => {
      // Don't log every scan failure (too noisy)
      // Only log if it's a real error
      if (!error.includes('No MultiFormat Readers')) {
    // console.debug('QR scan attempt:', error)
      }
    }

    scanner.render(onScanSuccessCallback, onScanFailureCallback)
    setScanning(true)

    // Cleanup
    return () => {
      scanner.clear().catch(console.error)
    }
  }, [token, onScanSuccess, onError])

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
    }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Scan Patient QR Code</h2>
            <p className="text-primary-100 text-sm mt-1">
              Position QR code within the frame
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            aria-label="Close scanner"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          <div id={scannerElementId} className="rounded-lg overflow-hidden" />

          {/* Status Messages */}
          <AnimatePresence mode="wait">
            {scanning && !validating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">Scanning...</p>
                    <p className="text-sm text-blue-700">Point camera at QR code</p>
                  </div>
                </div>
              </motion.div>
            )}

            {validating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-900">Validating...</p>
                    <p className="text-sm text-yellow-700">Checking patient information</p>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-error-50 border border-error-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-error-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-error-900">Validation Failed</p>
                    <p className="text-sm text-error-700">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-error-700 hover:text-error-900"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Allow camera access when prompted</li>
              <li>• Hold QR code 6-8 inches from camera</li>
              <li>• Ensure good lighting</li>
              <li>• Keep QR code steady within the frame</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default QRScanner
