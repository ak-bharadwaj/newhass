import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { apiClient } from '@/lib/api'

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Test component that uses auth
const TestComponent = () => {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Not authenticated</div>

  return (
    <div>
      <div>Authenticated</div>
      <div>User: {user?.email}</div>
      <div>Role: {user?.role_name}</div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('shows loading state initially', () => {
      ;(apiClient.getCurrentUser as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows not authenticated when no token', async () => {
      ;(apiClient.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('No token')
      )

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication', () => {
    it('loads user when token exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        role_name: 'doctor',
        first_name: 'Test',
        last_name: 'User',
      }

      localStorageMock.setItem('token', 'test-token')
      ;(apiClient.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Authenticated')).toBeInTheDocument()
        expect(screen.getByText('User: test@test.com')).toBeInTheDocument()
        expect(screen.getByText('Role: doctor')).toBeInTheDocument()
      })
    })

    it('handles authentication errors gracefully', async () => {
      localStorageMock.setItem('token', 'invalid-token')
      ;(apiClient.getCurrentUser as jest.Mock).mockRejectedValue(
        new Error('Invalid token')
      )

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument()
      })
    })
  })

  describe('Role Checking', () => {
    it('correctly identifies user roles', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@test.com',
        role_name: 'super_admin',
        first_name: 'Admin',
        last_name: 'User',
      }

      localStorageMock.setItem('token', 'admin-token')
      ;(apiClient.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const RoleTest = () => {
        const { user } = useAuth()
        const isSuperAdmin = user?.role_name === 'super_admin'
        return <div>{isSuperAdmin ? 'Is Super Admin' : 'Not Super Admin'}</div>
      }

      render(
        <AuthProvider>
          <RoleTest />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Is Super Admin')).toBeInTheDocument()
      })
    })
  })

  describe('Token Management', () => {
    it('stores token in localStorage on login', async () => {
      const mockResponse = {
        access_token: 'new-token',
        token_type: 'Bearer',
      }

      const mockUser = {
        id: '1',
        email: 'test@test.com',
        role_name: 'doctor',
      }

      ;(apiClient.login as jest.Mock).mockResolvedValue(mockResponse)
      ;(apiClient.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const LoginTest = () => {
        const { login } = useAuth()

        return (
          <button
            onClick={() =>
              login('test@test.com', 'password')
            }
          >
            Login
          </button>
        )
      }

      render(
        <AuthProvider>
          <LoginTest />
        </AuthProvider>
      )

      const loginButton = screen.getByRole('button', { name: /login/i })
      loginButton.click()

      await waitFor(() => {
        expect(localStorageMock.getItem('token')).toBe('new-token')
      })
    })

    it('removes token from localStorage on logout', async () => {
      localStorageMock.setItem('token', 'test-token')
      ;(apiClient.logout as jest.Mock).mockResolvedValue({ message: 'Logged out' })

      const LogoutTest = () => {
        const { logout } = useAuth()

        return <button onClick={logout}>Logout</button>
      }

      render(
        <AuthProvider>
          <LogoutTest />
        </AuthProvider>
      )

      const logoutButton = screen.getByRole('button', { name: /logout/i })
      logoutButton.click()

      await waitFor(() => {
        expect(localStorageMock.getItem('token')).toBeNull()
      })
    })
  })
})
