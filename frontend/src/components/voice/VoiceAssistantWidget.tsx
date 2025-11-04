/**
 * Voice Assistant Widget
 *
 * Floating voice assistant button that doctors can activate
 * with voice commands to navigate and perform actions
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useVoiceAssistant } from '@/services/voiceAssistant'
import type { VoiceCommand } from '@/services/voiceAssistant'

interface VoiceAssistantWidgetProps {
  onCommand?: (command: VoiceCommand) => void
}

export function VoiceAssistantWidget({ onCommand }: VoiceAssistantWidgetProps) {
  const router = useRouter()
  const [showTranscript, setShowTranscript] = useState(false)
  const [commandLog, setCommandLog] = useState<VoiceCommand[]>([])

  const {
    isListening,
    lastCommand,
    error,
    start,
    stop,
    speak,
    isSupported
  } = useVoiceAssistant({
    onResult: (command) => {
      // Add to log
      setCommandLog(prev => [command, ...prev].slice(0, 5))

      // Handle command
      handleVoiceCommand(command)

      // Callback
      onCommand?.(command)
    }
  })

  const handleVoiceCommand = (command: VoiceCommand) => {
    // console.log('Voice command:', command)

    switch (command.intent) {
      case 'show_patient':
        // Navigate to patient record
        if (command.entities.patient_id) {
          router.push(`/dashboard/doctor/patient/${command.entities.patient_id}`)
          speak(`Opening patient ${command.entities.patient_id}`)
        } else if (command.entities.patient_name) {
          // Would need to search for patient by name
          speak(`Searching for patient ${command.entities.patient_name}`)
        }
        break

      case 'show_vitals':
        speak('Displaying vital signs')
        // Scroll to vitals section or switch tab
        document.getElementById('vitals-section')?.scrollIntoView({ behavior: 'smooth' })
        break

      case 'show_labs':
        speak('Showing laboratory results')
        document.getElementById('labs-section')?.scrollIntoView({ behavior: 'smooth' })
        break

      case 'show_imaging':
        const imagingType = command.entities.imaging_type || 'scan'
        speak(`Opening ${imagingType} images`)
        document.getElementById('imaging-section')?.scrollIntoView({ behavior: 'smooth' })
        break

      case 'show_prescriptions':
        speak('Displaying prescriptions')
        document.getElementById('prescriptions-section')?.scrollIntoView({ behavior: 'smooth' })
        break

      case 'navigate':
        const dest = command.entities.destination?.toLowerCase()
        if (dest) {
          if (dest.includes('dashboard')) {
            router.push('/dashboard/doctor')
            speak('Going to dashboard')
          } else if (dest.includes('patient')) {
            router.push('/dashboard/doctor/patients')
            speak('Opening patient list')
          } else if (dest.includes('schedule') || dest.includes('appointment')) {
            router.push('/dashboard/doctor/appointments')
            speak('Opening appointments')
          }
        }
        break

      case 'search':
        // Would trigger search functionality
        speak(`Searching for ${command.entities.search_query}`)
        break

      case 'emergency':
        speak('Activating emergency protocol', { rate: 1.3 })
        // Trigger emergency view
        break

      case 'dictate':
        speak('Ready for dictation')
        // Switch to dictation mode
        break

      case 'unknown':
        speak('I did not understand that command. Please try again.')
        break
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }

  if (!isSupported) {
    return null // Don't show widget if not supported
  }

  return (
    <>
      {/* Main Voice Assistant Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.button
          onClick={toggleListening}
          onMouseEnter={() => setShowTranscript(true)}
          onMouseLeave={() => !isListening && setShowTranscript(false)}
          className={`relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-gradient-to-r from-error-500 to-error-600 animate-pulse'
              : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Microphone Icon */}
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isListening ? (
              // Stop icon when listening
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            ) : (
              // Microphone icon when not listening
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            )}
          </svg>

          {/* Listening pulse effect */}
          {isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-error-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-error-400"
                animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
              />
            </>
          )}

          {/* Status indicator */}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            isListening ? 'bg-error-500' : 'bg-success-500'
          }`} />
        </motion.button>

        {/* Helper Text */}
        <AnimatePresence>
          {!isListening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 right-0 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg"
            >
              🎤 Voice Assistant
              <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Transcript Panel */}
      <AnimatePresence>
        {(showTranscript || isListening) && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-24 right-6 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-40"
          >
            {/* Header */}
            <div className={`p-4 ${isListening ? 'bg-error-50' : 'bg-primary-50'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-error-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isListening ? 'Listening...' : 'Voice Commands'}
                </h3>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-72 overflow-y-auto">
              {/* Current Command */}
              {lastCommand && (
                <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    "{lastCommand.raw_text}"
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="px-2 py-0.5 bg-primary-100 rounded">
                      {lastCommand.intent.replace('_', ' ')}
                    </span>
                    <span>
                      {(lastCommand.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
                  <p className="text-sm text-error-700">{error}</p>
                </div>
              )}

              {/* Command History */}
              {commandLog.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">Recent Commands</h4>
                  {commandLog.slice(0, 5).map((cmd, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-gray-50 rounded border border-gray-100 text-xs"
                    >
                      <p className="text-gray-700">"{cmd.raw_text}"</p>
                      <p className="text-gray-500 mt-1">
                        → {cmd.intent.replace('_', ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Sample Commands */}
              {!lastCommand && commandLog.length === 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Try Saying:</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• "Show patient 231"</p>
                    <p>• "Display vitals for John Doe"</p>
                    <p>• "Open last CT scan"</p>
                    <p>• "Show lab results"</p>
                    <p>• "Navigate to dashboard"</p>
                    <p>• "Search for patients with diabetes"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Click microphone or press{' '}
                <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">
                  Ctrl + Space
                </kbd>{' '}
                to {isListening ? 'stop' : 'start'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut */}
      <KeyboardShortcut onTrigger={toggleListening} />
    </>
  )
}

/**
 * Keyboard Shortcut Handler (Ctrl/Cmd + Space)
 */
function KeyboardShortcut({ onTrigger }: { onTrigger: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        onTrigger()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onTrigger])

  return null
}
