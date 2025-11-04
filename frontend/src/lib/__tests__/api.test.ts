import { ApiClient } from '../api'

describe('ApiClient', () => {
  let apiClient: ApiClient
  const mockToken = 'test-token-123'

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:8000')
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Error Handling', () => {
    it('handles 401 unauthorized error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ detail: 'Unauthorized' }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(
        apiClient.getCurrentUser(mockToken)
      ).rejects.toThrow('Unauthorized - Please log in again')
    })

    it('handles 403 forbidden error', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: jest.fn().mockRejectedValue(new Error('Parse error')),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(
        apiClient.getCurrentUser(mockToken)
      ).rejects.toThrow('Forbidden - You do not have permission')
    })

    it('handles 404 not found error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockRejectedValue(new Error('Parse error')),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(
        apiClient.getPatient('123', mockToken)
      ).rejects.toThrow('Resource not found')
    })

    it('handles 500 server error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('Parse error')),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(
        apiClient.getCurrentUser(mockToken)
      ).rejects.toThrow('Internal server error')
    })

    it('handles 503 service unavailable error', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        json: jest.fn().mockRejectedValue(new Error('Parse error')),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await expect(
        apiClient.getCurrentUser(mockToken)
      ).rejects.toThrow('Service temporarily unavailable')
    })

    it('includes status code in error object', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockRejectedValue(new Error('Parse error')),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      try {
        await apiClient.getCurrentUser(mockToken)
      } catch (error: any) {
        expect(error.status).toBe(404)
      }
    })
  })

  describe('Authentication', () => {
    it('includes authorization header in authenticated requests', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await apiClient.getCurrentUser(mockToken)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )
    })

    it('includes credentials in requests', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'token' }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await apiClient.login({ email: 'test@test.com', password: 'password' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })

  describe('Request Methods', () => {
    it('makes GET requests correctly', async () => {
      const mockData = { id: '1', name: 'Test Patient' }
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const result = await apiClient.getPatient('1', mockToken)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/patients/1'),
        expect.objectContaining({
          method: undefined, // GET is default
        })
      )
      expect(result).toEqual(mockData)
    })

    it('makes POST requests with body', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'token' }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const credentials = { email: 'test@test.com', password: 'password' }
      await apiClient.login(credentials)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials),
        })
      )
    })
  })

  describe('Content Type', () => {
    it('sets application/json content type', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'token' }),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      await apiClient.login({ email: 'test@test.com', password: 'password' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })
  })
})
