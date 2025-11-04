/**
 * Voice Assistant Service for Doctors
 *
 * Natural language voice commands like:
 * - "Show last CT scan of patient 231"
 * - "Display vitals for John Doe"
 * - "Open patient 102948's chart"
 * - "Navigate to prescriptions"
 * - "Search for patients with diabetes"
 *
 * Uses Web Speech API for voice recognition
 * Powered by AI for command parsing and intent detection
 */

export interface VoiceCommand {
  intent: string
  entities: Record<string, string>
  confidence: number
  raw_text: string
}

interface VoiceAssistantOptions {
  language?: string
  continuous?: boolean
  onResult?: (command: VoiceCommand) => void
  onError?: (error: string) => void
  onListening?: (isListening: boolean) => void
}

export class VoiceAssistant {
  private recognition: any = null
  private isListening: boolean = false
  private options: VoiceAssistantOptions
  private commandHistory: VoiceCommand[] = []

  constructor(options: VoiceAssistantOptions = {}) {
    this.options = {
      language: options.language || 'en-US',
      continuous: options.continuous || false,
      onResult: options.onResult || (() => {}),
      onError: options.onError || (() => {}),
      onListening: options.onListening || (() => {}),
    }

    this.initializeSpeechRecognition()
  }

  private initializeSpeechRecognition() {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.error('Web Speech API not supported in this browser')
      this.options.onError?.('Voice recognition not supported in your browser. Please use Chrome or Edge.')
      return
    }

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = this.options.continuous
    this.recognition.interimResults = false
    this.recognition.maxAlternatives = 1
    this.recognition.lang = this.options.language

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true
      this.options.onListening?.(true)
    // console.log('Voice assistant listening...')
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.options.onListening?.(false)
    // console.log('Voice assistant stopped')
    }

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript
      const confidence = event.results[event.results.length - 1][0].confidence

    // console.log('Recognized:', transcript, 'Confidence:', confidence)

      // Parse command
      const command = this.parseCommand(transcript, confidence)
      this.commandHistory.push(command)

      // Execute command
      this.options.onResult?.(command)
      this.executeCommand(command)
    }

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)

      let errorMessage = 'Voice recognition error'
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check permissions.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please enable microphone access.'
          break
        case 'network':
          errorMessage = 'Network error. Please check your connection.'
          break
        default:
          errorMessage = `Voice recognition error: ${event.error}`
      }

      this.options.onError?.(errorMessage)
    }
  }

  /**
   * Start listening for voice commands
   */
  start(): void {
    if (!this.recognition) {
      this.options.onError?.('Voice recognition not initialized')
      return
    }

    if (this.isListening) {
    // console.log('Already listening')
      return
    }

    try {
      this.recognition.start()
    } catch (error: any) {
      console.error('Error starting recognition:', error)
      this.options.onError?.('Could not start voice recognition')
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  /**
   * Parse natural language command into structured intent
   */
  private parseCommand(text: string, confidence: number): VoiceCommand {
    const lowerText = text.toLowerCase()

    // Intent detection patterns
    const intents = {
      // Patient viewing
      'show_patient': [
        /(?:show|display|open|view)\s+(?:patient|chart|record|file)?\s*(?:for|of)?\s*(?:patient\s+)?(\d+|[a-z]+\s+[a-z]+)/i,
        /(?:patient|chart)\s+(?:number|#|mrn)?\s*(\d+)/i
      ],

      // Vitals viewing
      'show_vitals': [
        /(?:show|display|get)\s+(?:the\s+)?(?:vitals|vital\s+signs)\s+(?:for|of)\s+(?:patient\s+)?(.+)/i,
        /(?:what\s+are|check)\s+(?:the\s+)?vitals\s+(?:for|of)\s+(.+)/i
      ],

      // Lab results
      'show_labs': [
        /(?:show|display|get)\s+(?:lab|laboratory|test)\s+(?:results?|reports?)\s+(?:for|of)\s+(.+)/i,
        /(?:last|recent|latest)\s+(?:lab|test)\s+(?:for|of)\s+(.+)/i
      ],

      // Imaging (CT, MRI, X-ray)
      'show_imaging': [
        /(?:show|display|open)\s+(?:last|recent|latest)?\s*(ct|mri|x-ray|xray|scan|imaging)\s+(?:scan|image)?\s+(?:for|of)\s+(?:patient\s+)?(.+)/i
      ],

      // Prescriptions
      'show_prescriptions': [
        /(?:show|display|get)\s+(?:prescriptions?|medications?|meds)\s+(?:for|of)\s+(.+)/i
      ],

      // Navigation
      'navigate': [
        /(?:go\s+to|navigate\s+to|open)\s+(.+)/i,
        /(?:show|display)\s+(?:the\s+)?(.+)\s+(?:page|screen|dashboard)/i
      ],

      // Search
      'search': [
        /(?:search|find|look\s+for)\s+(?:patients?\s+)?(?:with|having|diagnosed\s+with)?\s+(.+)/i
      ],

      // Emergency
      'emergency': [
        /(?:emergency|urgent|critical|code\s+blue)/i
      ],

      // Dictation (for SOAP notes)
      'dictate': [
        /(?:dictate|record|take\s+note)/i
      ]
    }

    // Try to match each intent
    for (const [intent, patterns] of Object.entries(intents)) {
      for (const pattern of patterns) {
        const match = lowerText.match(pattern)
        if (match) {
          const entities = this.extractEntities(intent, match, lowerText)

          return {
            intent,
            entities,
            confidence,
            raw_text: text
          }
        }
      }
    }

    // No specific intent matched - general command
    return {
      intent: 'unknown',
      entities: { query: text },
      confidence,
      raw_text: text
    }
  }

  /**
   * Extract entities from matched pattern
   */
  private extractEntities(intent: string, match: RegExpMatchArray, text: string): Record<string, string> {
    const entities: Record<string, string> = {}

    switch (intent) {
      case 'show_patient':
        if (match[1]) {
          // Could be patient ID or name
          const value = match[1].trim()
          if (/^\d+$/.test(value)) {
            entities.patient_id = value
          } else {
            entities.patient_name = value
          }
        }
        break

      case 'show_vitals':
      case 'show_labs':
      case 'show_prescriptions':
        if (match[1]) {
          entities.patient_query = match[1].trim()
        }
        break

      case 'show_imaging':
        if (match[1]) {
          entities.imaging_type = match[1].toLowerCase()
        }
        if (match[2]) {
          entities.patient_query = match[2].trim()
        }
        break

      case 'navigate':
        if (match[1]) {
          entities.destination = match[1].trim()
        }
        break

      case 'search':
        if (match[1]) {
          entities.search_query = match[1].trim()
        }
        break
    }

    return entities
  }

  /**
   * Execute parsed command
   */
  private executeCommand(command: VoiceCommand): void {
    // console.log('Executing command:', command)

    // Emit custom event for application to handle
    const event = new CustomEvent('voiceCommand', { detail: command })
    window.dispatchEvent(event)
  }

  /**
   * Get command history
   */
  getHistory(): VoiceCommand[] {
    return [...this.commandHistory]
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = []
  }

  /**
   * Check if voice recognition is supported
   */
  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    )
  }

  /**
   * Get listening status
   */
  getListeningStatus(): boolean {
    return this.isListening
  }

  /**
   * Speak text (Text-to-Speech)
   */
  speak(text: string, options: { lang?: string; rate?: number; pitch?: number } = {}): void {
    if (!('speechSynthesis' in window)) {
      console.error('Text-to-Speech not supported')
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = options.lang || this.options.language || 'en-US'
    utterance.rate = options.rate || 1.0
    utterance.pitch = options.pitch || 1.0

    window.speechSynthesis.speak(utterance)
  }

  /**
   * Provide voice feedback
   */
  provideFeedback(command: VoiceCommand, success: boolean = true): void {
    if (success) {
      switch (command.intent) {
        case 'show_patient':
          this.speak(`Opening patient record for ${command.entities.patient_name || command.entities.patient_id}`)
          break
        case 'show_vitals':
          this.speak(`Displaying vital signs`)
          break
        case 'show_labs':
          this.speak(`Showing lab results`)
          break
        case 'show_imaging':
          this.speak(`Opening ${command.entities.imaging_type} scan`)
          break
        case 'navigate':
          this.speak(`Navigating to ${command.entities.destination}`)
          break
        case 'search':
          this.speak(`Searching for ${command.entities.search_query}`)
          break
        case 'emergency':
          this.speak('Activating emergency protocol', { rate: 1.2 })
          break
        default:
          this.speak('Command executed')
      }
    } else {
      this.speak('Sorry, I could not execute that command')
    }
  }
}

/**
 * React Hook for Voice Assistant
 */
export function useVoiceAssistant(options: VoiceAssistantOptions = {}) {
  const [isListening, setIsListening] = React.useState(false)
  const [lastCommand, setLastCommand] = React.useState<VoiceCommand | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const assistantRef = React.useRef<VoiceAssistant | null>(null)

  React.useEffect(() => {
    assistantRef.current = new VoiceAssistant({
      ...options,
      onListening: (listening) => {
        setIsListening(listening)
        options.onListening?.(listening)
      },
      onResult: (command) => {
        setLastCommand(command)
        setError(null)
        options.onResult?.(command)
      },
      onError: (err) => {
        setError(err)
        options.onError?.(err)
      }
    })

    return () => {
      assistantRef.current?.stop()
    }
  }, [])

  const start = () => assistantRef.current?.start()
  const stop = () => assistantRef.current?.stop()
  const speak = (text: string, options?: { lang?: string; rate?: number; pitch?: number }) => assistantRef.current?.speak(text, options || {})

  return {
    isListening,
    lastCommand,
    error,
    start,
    stop,
    speak,
    isSupported: VoiceAssistant.isSupported()
  }
}

// Import React for hook
import React from 'react'
