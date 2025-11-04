'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRegionalBranding, THEME_COLORS } from '@/contexts/RegionalBrandingContext'

interface BrandingSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BrandingSettingsModal({ isOpen, onClose }: BrandingSettingsModalProps) {
  const { branding, updateBranding, getThemeColors } = useRegionalBranding()
  const [formData, setFormData] = useState({
    theme: branding.theme,
    hospitalName: branding.hospitalName,
    hospitalTagline: branding.hospitalTagline,
    bannerText: branding.bannerText,
    logoUrl: branding.logoUrl || ''
  })

  const handleSave = () => {
    updateBranding(formData)
    onClose()
  }

  const handleReset = () => {
    const defaults = {
      theme: 'medical' as const,
      hospitalName: 'Regional Medical Center',
      hospitalTagline: 'Excellence in Healthcare',
      bannerText: 'Welcome to our Healthcare Portal',
      logoUrl: ''
    }
    setFormData(defaults)
    updateBranding(defaults)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Regional Branding Settings</h2>
              <p className="text-gray-600">Customize your region's hospital identity across all roles</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-8">
            {/* Theme Selection */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">🎨 Choose Regional Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(THEME_COLORS).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setFormData(prev => ({ ...prev, theme: key as any }))}
                    className={`relative p-4 rounded-xl transition-all ${
                      formData.theme === key
                        ? 'ring-4 ring-blue-500 ring-offset-2'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.primary} rounded-xl opacity-10`} />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{theme.name}</span>
                        {formData.theme === key && <span className="text-xl">✓</span>}
                      </div>
                      <div className="flex gap-1">
                        {theme.stats.map((color, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-8 rounded bg-gradient-to-br ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hospital Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🏥 Hospital Name
                </label>
                <input
                  type="text"
                  value={formData.hospitalName}
                  onChange={(e) => setFormData(prev => ({ ...prev, hospitalName: e.target.value }))}
                  placeholder="Regional Medical Center"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💬 Hospital Tagline
                </label>
                <input
                  type="text"
                  value={formData.hospitalTagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, hospitalTagline: e.target.value }))}
                  placeholder="Excellence in Healthcare"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Banner Text */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📢 Banner Message (displayed across all dashboards)
              </label>
              <input
                type="text"
                value={formData.bannerText}
                onChange={(e) => setFormData(prev => ({ ...prev, bannerText: e.target.value }))}
                placeholder="Welcome to our Healthcare Portal"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🖼️ Hospital Logo URL (optional)
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter a public URL to your hospital logo. Leave blank to use default icon.
              </p>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">👁️ Live Preview</h3>
              <div className={`relative overflow-hidden rounded-2xl shadow-lg p-6 ${THEME_COLORS[formData.theme].bgColor}`}>
                <div className={`absolute inset-0 bg-gradient-to-r ${THEME_COLORS[formData.theme].primary} opacity-10`} />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${THEME_COLORS[formData.theme].primary} shadow-md flex items-center justify-center`}>
                      <span className="text-3xl">🏥</span>
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold bg-gradient-to-r ${THEME_COLORS[formData.theme].primary} bg-clip-text text-transparent`}>
                        {formData.hospitalName || 'Hospital Name'}
                      </h2>
                      <p className="text-sm text-gray-600">{formData.hospitalTagline || 'Tagline'}</p>
                    </div>
                  </div>
                  {formData.bannerText && (
                    <div className={`px-6 py-3 rounded-xl bg-gradient-to-r ${THEME_COLORS[formData.theme].secondary} text-white shadow-lg`}>
                      <p className="text-sm font-semibold">{formData.bannerText}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">ℹ️</span>
                <div>
                  <h4 className="font-bold text-blue-900 mb-2">Regional Branding Application</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ Applies to ALL roles in your region (Doctor, Nurse, Manager, Patient, etc.)</li>
                    <li>✓ Banner appears at top of every dashboard</li>
                    <li>✓ Theme colors apply to all stats, buttons, and UI elements</li>
                    <li>✓ Settings saved and persist across sessions</li>
                    <li>✓ Changes take effect immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-gray-100">
            <button
              onClick={handleReset}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-semibold transition-colors"
            >
              Reset to Defaults
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`px-8 py-3 bg-gradient-to-r ${THEME_COLORS[formData.theme].primary} text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all`}
              >
                Save & Apply
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
