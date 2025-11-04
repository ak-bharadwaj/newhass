import { VoiceAssistant } from '../voiceAssistant'

describe('VoiceAssistant', () => {
  let voiceAssistant: VoiceAssistant
  let mockRecognition: any

  beforeEach(() => {
    // Mock SpeechRecognition
    mockRecognition = {
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      onstart: null,
      onend: null,
      onresult: null,
      onerror: null,
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      lang: 'en-US',
    }

    // @ts-ignore
    global.window = {
      SpeechRecognition: jest.fn(() => mockRecognition),
      webkitSpeechRecognition: jest.fn(() => mockRecognition),
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('creates voice assistant with default options', () => {
      voiceAssistant = new VoiceAssistant()
      expect(voiceAssistant).toBeDefined()
    })

    it('accepts custom language option', () => {
      voiceAssistant = new VoiceAssistant({ language: 'en-GB' })
      expect(voiceAssistant).toBeDefined()
    })

    it('handles missing SpeechRecognition API', () => {
      // @ts-ignore
      global.window = {} as any
      const onError = jest.fn()

      voiceAssistant = new VoiceAssistant({ onError })

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('not supported')
      )
    })
  })

  describe('Voice Recognition', () => {
    it('starts listening when start() is called', () => {
      voiceAssistant = new VoiceAssistant()
      voiceAssistant.start()

      expect(mockRecognition.start).toHaveBeenCalled()
    })

    it('stops listening when stop() is called', () => {
      voiceAssistant = new VoiceAssistant()
      voiceAssistant.stop()

      expect(mockRecognition.stop).toHaveBeenCalled()
    })

    it('calls onListening callback when listening state changes', () => {
      const onListening = jest.fn()
      voiceAssistant = new VoiceAssistant({ onListening })

      voiceAssistant.start()
      if (mockRecognition.onstart) {
        mockRecognition.onstart()
      }

      expect(onListening).toHaveBeenCalledWith(true)
    })

    it('calls onResult callback when speech is recognized', () => {
      const onResult = jest.fn()
      voiceAssistant = new VoiceAssistant({ onResult })

      const mockEvent = {
        results: [
          [
            {
              transcript: 'show patient 123',
              confidence: 0.95,
            },
          ],
        ],
      }

      if (mockRecognition.onresult) {
        mockRecognition.onresult(mockEvent)
      }

      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({
          raw_text: 'show patient 123',
          confidence: 0.95,
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('handles no-speech error', () => {
      const onError = jest.fn()
      voiceAssistant = new VoiceAssistant({ onError })

      const mockErrorEvent = {
        error: 'no-speech',
      }

      if (mockRecognition.onerror) {
        mockRecognition.onerror(mockErrorEvent)
      }

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('No speech detected')
      )
    })

    it('handles audio-capture error', () => {
      const onError = jest.fn()
      voiceAssistant = new VoiceAssistant({ onError })

      const mockErrorEvent = {
        error: 'audio-capture',
      }

      if (mockRecognition.onerror) {
        mockRecognition.onerror(mockErrorEvent)
      }

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Microphone not accessible')
      )
    })

    it('handles not-allowed error', () => {
      const onError = jest.fn()
      voiceAssistant = new VoiceAssistant({ onError })

      const mockErrorEvent = {
        error: 'not-allowed',
      }

      if (mockRecognition.onerror) {
        mockRecognition.onerror(mockErrorEvent)
      }

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('permission denied')
      )
    })

    it('handles network error', () => {
      const onError = jest.fn()
      voiceAssistant = new VoiceAssistant({ onError })

      const mockErrorEvent = {
        error: 'network',
      }

      if (mockRecognition.onerror) {
        mockRecognition.onerror(mockErrorEvent)
      }

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      )
    })
  })

  describe('Command Parsing', () => {
    it('parses patient navigation commands', () => {
      const onResult = jest.fn()
      voiceAssistant = new VoiceAssistant({ onResult })

      const mockEvent = {
        results: [
          [
            {
              transcript: 'show patient 123',
              confidence: 0.9,
            },
          ],
        ],
      }

      if (mockRecognition.onresult) {
        mockRecognition.onresult(mockEvent)
      }

      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({
          raw_text: 'show patient 123',
        })
      )
    })

    it('stores command history', () => {
      voiceAssistant = new VoiceAssistant()

      const mockEvent = {
        results: [
          [
            {
              transcript: 'navigate to prescriptions',
              confidence: 0.85,
            },
          ],
        ],
      }

      if (mockRecognition.onresult) {
        mockRecognition.onresult(mockEvent)
      }

      const history = voiceAssistant.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].raw_text).toBe('navigate to prescriptions')
    })
  })
})
