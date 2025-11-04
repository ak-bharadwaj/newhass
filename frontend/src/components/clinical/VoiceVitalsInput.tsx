/**
 * Voice-to-Text Vitals Input Component
 *
 * Record vitals using voice input with automatic parsing
 * Fallback to manual entry if voice not available
 */

'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

interface VoiceVitalsInputProps {
  onVitalsParsed: (vitals: ParsedVitals) => void
  onClose: () => void
}

interface ParsedVitals {
  temperature?: number
  heart_rate?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  respiratory_rate?: number
  spo2?: number
  pain_score?: number
}

interface VoiceResult {
  transcription: string
  vitals: ParsedVitals
  parsed_count: number
  formatted_output: string
}

export function VoiceVitalsInput({ onVitalsParsed, onClose }: VoiceVitalsInputProps) {
  const { token } = useAuth()
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcription, setTranscription] = useState<string>('')
  const [parsedVitals, setParsedVitals] = useState<ParsedVitals | null>(null)
  const [formattedOutput, setFormattedOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Automatically process the audio
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setRecording(true)
      setError(null)
    } catch (err: any) {
      setError('Microphone access denied. Please allow microphone permissions.')
      console.error('Error accessing microphone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const processAudio = async (blob: Blob) => {
    if (!token) {
      setError('Authentication required')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio_file', blob, 'vitals.webm')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/voice-to-text/transcribe-and-parse-vitals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to process audio')
      }

      const result: VoiceResult = await response.json()

      setTranscription(result.transcription)
      setParsedVitals(result.vitals)
      setFormattedOutput(result.formatted_output)

      if (result.parsed_count === 0) {
        setError('No vitals detected in the recording. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process audio')
    } finally {
      setProcessing(false)
    }
  }

  const confirmVitals = () => {
    if (parsedVitals) {
      onVitalsParsed(parsedVitals)
      onClose()
    }
  }

  const reset = () => {
    setTranscription('')
    setParsedVitals(null)
    setFormattedOutput('')
    setError(null)
    setAudioBlob(null)
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
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Voice Vitals Entry</h2>
            <p className="text-primary-100 text-sm mt-1">
              Speak vitals clearly into your microphone
            </p>
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
        <div className="p-6 space-y-6">
          {/* Recording Controls */}
          {!transcription && (
            <div className="flex flex-col items-center">
              <AnimatePresence mode="wait">
                {!recording ? (
                  <motion.button
                    key="start"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    onClick={startRecording}
                    className="w-24 h-24 bg-error-600 hover:bg-error-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
                    disabled={processing}
                  >
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </motion.button>
                ) : (
                  <motion.button
                    key="stop"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    onClick={stopRecording}
                    className="w-24 h-24 bg-error-600 rounded-full flex items-center justify-center shadow-lg animate-pulse"
                  >
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>

              <p className="mt-4 text-lg font-semibold text-gray-900">
                {recording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>

              {processing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-center gap-3"
                >
                  <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600">Processing audio...</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!transcription && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Speak clearly and slowly</li>
                <li>• Example: "Temperature 98.6 Fahrenheit, heart rate 72, blood pressure 120 over 80, SpO2 98"</li>
                <li>• You can say vitals in any order</li>
                <li>• Supported: temperature, heart rate, blood pressure, respiratory rate, SpO2, pain score</li>
              </ul>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-error-50 border border-error-200 rounded-lg"
            >
              <div className="flex items-center gap-2 text-error-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold">Error</p>
              </div>
              <p className="text-sm text-error-600 mt-1">{error}</p>
              <button
                onClick={reset}
                className="mt-3 text-sm text-error-700 font-semibold hover:text-error-800"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Results Display */}
          {transcription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Transcription */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Transcription:</h3>
                <p className="text-gray-700">{transcription}</p>
              </div>

              {/* Parsed Vitals */}
              {parsedVitals && Object.keys(parsedVitals).length > 0 && (
                <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                  <h3 className="font-semibold text-success-900 mb-2">Extracted Vitals:</h3>
                  <div className="whitespace-pre-line text-success-800 text-sm">
                    {formattedOutput}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Record Again
                </button>
                <button
                  onClick={confirmVitals}
                  disabled={!parsedVitals || Object.keys(parsedVitals).length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use These Vitals
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default VoiceVitalsInput
