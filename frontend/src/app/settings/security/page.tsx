'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

export default function SecuritySettingsPage() {
  const { user, token, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [initiated, setInitiated] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const isEnabled = !!user?.two_factor_enabled

  const handleInitiate = async () => {
    if (!token) return toast.error('Not authenticated')
    setLoading(true)
    try {
      const res = await apiClient.initiateTwoFactor(token)
      setSecret(res.secret)
      setOtpauthUrl(res.otpauth_url)
      setInitiated(true)
      toast.success('2FA setup initiated')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to initiate 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!token) return toast.error('Not authenticated')
    if (!confirmCode) return toast.error('Enter the code from your app')
    setLoading(true)
    try {
      await apiClient.confirmTwoFactor(confirmCode, token)
      await refreshUser()
      toast.success('Two-factor authentication enabled')
      setInitiated(false)
      setConfirmCode('')
      setSecret(null)
      setOtpauthUrl(null)
    } catch (e: any) {
      toast.error(e?.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!token) return toast.error('Not authenticated')
    if (!disableCode) return toast.error('Enter your current code to disable')
    setLoading(true)
    try {
      await apiClient.disableTwoFactor(disableCode, token)
      await refreshUser()
      toast.success('Two-factor authentication disabled')
      setDisableCode('')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const qrUrl = otpauthUrl
    ? `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(otpauthUrl)}`
    : null

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Security</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Two-Factor Authentication (TOTP)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Protect your account with a one-time code from an authenticator app. We support Google Authenticator, 1Password, Authy, and others.
        </p>

        {!isEnabled && !initiated && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">2FA is currently <span className="font-semibold">disabled</span>.</p>
            <button
              onClick={handleInitiate}
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Starting…' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {!isEnabled && initiated && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-2">Scan this QR</h3>
              {qrUrl ? (
                <img src={qrUrl} alt="2FA QR Code" className="rounded-md border" />
              ) : (
                <div className="text-sm text-gray-600">QR unavailable</div>
              )}
            </div>
            <div>
              <h3 className="font-medium mb-2">Or enter this key</h3>
              <div className="flex items-center gap-2">
                <code className="rounded-md bg-gray-100 px-2 py-1 text-sm break-all">{secret}</code>
                <button
                  type="button"
                  className="text-sm rounded-md border px-2 py-1 hover:bg-gray-50"
                  onClick={() => {
                    if (secret) navigator.clipboard.writeText(secret)
                    toast.success('Secret copied to clipboard')
                  }}
                >Copy</button>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Enter code from your app</label>
                <input
                  value={confirmCode}
                  onChange={e => setConfirmCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  className="w-full rounded-md border px-3 py-2"
                />
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="mt-3 inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Confirm & Enable'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isEnabled && (
          <div className="mt-4">
            <p className="text-sm text-gray-700">2FA is <span className="font-semibold text-green-700">enabled</span>.</p>
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Enter current code to disable</label>
              <input
                value={disableCode}
                onChange={e => setDisableCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                className="w-full rounded-md border px-3 py-2"
              />
              <button
                onClick={handleDisable}
                disabled={loading}
                className="mt-3 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? 'Disabling…' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
