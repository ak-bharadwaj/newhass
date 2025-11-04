'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { FeedbackButton } from '@/components/common/FeedbackButton'

interface ApiKeyItem {
  id: string
  name: string
  prefix: string
  scopes: string[]
  is_active: boolean
  created_at: string
}

export default function ApiKeysPage() {
  const { user, token, hasRole } = useAuth()
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScopes, setNewScopes] = useState('read:patients,write:patients')
  const [newSecret, setNewSecret] = useState<string | null>(null)

  const isAdmin = hasRole('super_admin','regional_admin','hospital_admin')

  useEffect(() => {
    if (!token) return
    loadKeys()
  }, [token])

  const loadKeys = async () => {
    try {
      setLoading(true)
      const data = await apiClient.listApiKeys(token!)
      setKeys(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setCreating(true)
      setNewSecret(null)
      const scopes = newScopes.split(',').map(s => s.trim()).filter(Boolean)
      const created = await apiClient.createApiKey({ name: newName, scopes }, token!)
      // Show the secret once
      setNewSecret(created.secret)
      setNewName('')
      await loadKeys()
    } catch (e: any) {
      setError(e?.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    await apiClient.revokeApiKey(id, token!)
    await loadKeys()
  }

  const handleRotate = async (id: string) => {
    const rotated = await apiClient.rotateApiKey(id, token!)
    setNewSecret(rotated.secret)
    await loadKeys()
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only admins can manage API keys.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create API Key</h2>
          {newSecret && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              <strong>Copy this secret now:</strong>
              <div className="mt-1 font-mono break-all">{newSecret}</div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Integration name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scopes (comma separated)</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={newScopes}
                onChange={(e) => setNewScopes(e.target.value)}
                placeholder="read:*,write:*"
              />
            </div>
          </div>
          <div className="mt-4">
            <FeedbackButton onClickAsync={handleCreate} loadingText="Creating..." successText="Created!" disabled={!newName || creating}>
              Create API Key
            </FeedbackButton>
          </div>
        </div>

        <div className="glass bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Existing Keys</h2>
            <FeedbackButton onClickAsync={loadKeys} variant="ghost">Refresh</FeedbackButton>
          </div>
          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="text-gray-600">No API keys yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Prefix</th>
                    <th className="py-2 pr-4">Scopes</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(k => (
                    <tr key={k.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{k.name}</td>
                      <td className="py-2 pr-4 font-mono">{k.prefix}</td>
                      <td className="py-2 pr-4">{k.scopes?.join(', ')}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-1 rounded text-xs ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {k.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 space-x-2">
                        <FeedbackButton size="sm" variant="secondary" onClickAsync={() => handleRotate(k.id)}>Rotate</FeedbackButton>
                        <FeedbackButton size="sm" variant="error" onClickAsync={() => handleRevoke(k.id)}>Revoke</FeedbackButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {error && <div className="mt-3 p-2 bg-red-50 text-red-700 rounded">{error}</div>}
        </div>
      </div>
    </div>
  )
}
