'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout'
import { BackButton } from '@/components/common/BackButton'
import { useAuth } from '@/contexts/AuthContext'
import apiClient, { type Region } from '@/lib/api'

export default function RegionSettingsPage() {
  const { id } = useParams() as { id?: string }
  const regionId = id as string
  const router = useRouter()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [region, setRegion] = useState<Region | null>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token || !regionId) return
      setLoading(true)
      setError(null)
      try {
        const r = await apiClient.getRegion(regionId, token)
        if (!cancelled) {
          setRegion(r as Region)
          const ts = (r.theme_settings || {}) as any
          setLogoUrl(ts.logo_url || '')
          setPrimaryColor(ts.primary_color || '')
          setSecondaryColor(ts.secondary_color || '')
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, regionId])

  const onSave = async () => {
    if (!token || !regionId) return
    setSaving(true)
    setError(null)
    try {
      const theme = {
        logo_url: logoUrl || null,
        primary_color: primaryColor || undefined,
        secondary_color: secondaryColor || undefined,
      }
      const updated = await apiClient.updateRegionSettings(regionId, theme, token)
      setRegion(updated)
      router.push(`/dashboard/super_admin/regions/${regionId}`)
    } catch (e: any) {
      setError(e?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EnterpriseDashboardLayout role="super_admin">
      <div className="p-8">
        <BackButton fallbackUrl={`/dashboard/super_admin/regions/${regionId}`} />
        <h1 className="text-2xl font-bold mb-2">Region Settings</h1>
        <p className="text-gray-600 mb-6">Branding and theme</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="h-36 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <div className="max-w-xl space-y-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full rounded-xl border-2 border-gray-200 px-4 py-2 focus:border-indigo-500 focus:outline-none" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full rounded-xl border-2 border-gray-200 px-4 py-2 focus:border-indigo-500 focus:outline-none" placeholder="#2563eb" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                <input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-full rounded-xl border-2 border-gray-200 px-4 py-2 focus:border-indigo-500 focus:outline-none" placeholder="#9333ea" />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className={`px-5 py-2 rounded-xl text-white ${saving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} transition-colors`}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded-xl border bg-white hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </EnterpriseDashboardLayout>
  )
}