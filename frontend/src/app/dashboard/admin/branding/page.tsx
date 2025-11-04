'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

export default function AdminBrandingPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [branding, setBranding] = useState({
    hospital_name: '',
    logo_url: '',
    primary_color: '#2563eb',
    secondary_color: '#d946ef',
    accent_color: '#f59e0b',
    tagline: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    website: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    loadBranding();
  }, [token]);

  const loadBranding = async () => {
    if (!token || !user?.hospital_id) return;
    
    setLoading(true);
    try {
      const hospital = await apiClient.getHospital(user.hospital_id.toString(), token);
      setBranding({
        hospital_name: hospital.name || '',
        logo_url: hospital.logo_url || '',
        primary_color: hospital.primary_color || '#2563eb',
        secondary_color: hospital.secondary_color || '#d946ef',
        accent_color: hospital.accent_color || '#f59e0b',
        tagline: hospital.tagline || '',
        contact_email: hospital.contact_email || '',
        contact_phone: hospital.contact_phone || '',
        address: hospital.address || '',
        website: hospital.website || '',
      });
      setLogoPreview(hospital.logo_url || '');
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user?.hospital_id) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // If there's a new logo file, upload it first
      let logoUrl = branding.logo_url;
      if (logoFile) {
        // TODO: Implement file upload to MinIO or use hospital logo update endpoint
        // For now, we'll use the preview as a placeholder
        logoUrl = logoPreview;
      }

      // Update hospital branding
      await apiClient.updateHospital(
        user.hospital_id.toString(),
        {
          name: branding.hospital_name,
          logo_url: logoUrl,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color,
          tagline: branding.tagline,
          contact_email: branding.contact_email,
          contact_phone: branding.contact_phone,
          address: branding.address,
          website: branding.website,
        },
        token
      );

      setSuccess('Branding settings saved successfully! Refresh the page to see changes.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 mt-4">Loading branding settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-primary-600 bg-clip-text text-transparent mb-2"
        >
          Hospital Branding
        </motion.h1>
        <p className="text-gray-600">Customize your hospital's visual identity and information</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Logo Section */}
        <div className="card-modern p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            Hospital Logo
          </h2>

          <div className="flex items-start gap-8">
            <div className="flex-shrink-0">
              {logoPreview ? (
                <div className="w-48 h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center p-4 overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">No logo</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="input-modern"
              />
              <p className="text-xs text-gray-500 mt-2">
                Recommended: Square image, minimum 200x200px, PNG or SVG format
              </p>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Or enter Logo URL</label>
                <input
                  type="url"
                  value={branding.logo_url}
                  onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="input-modern"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="card-modern p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hospital Name *</label>
              <input
                type="text"
                value={branding.hospital_name}
                onChange={(e) => setBranding({ ...branding, hospital_name: e.target.value })}
                required
                className="input-modern"
                placeholder="City General Hospital"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tagline</label>
              <input
                type="text"
                value={branding.tagline}
                onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                className="input-modern"
                placeholder="Caring for your health, every step of the way"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Email</label>
              <input
                type="email"
                value={branding.contact_email}
                onChange={(e) => setBranding({ ...branding, contact_email: e.target.value })}
                className="input-modern"
                placeholder="info@hospital.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={branding.contact_phone}
                onChange={(e) => setBranding({ ...branding, contact_phone: e.target.value })}
                className="input-modern"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={branding.address}
                onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                className="input-modern"
                placeholder="123 Medical Center Drive, City, State, ZIP"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Website</label>
              <input
                type="url"
                value={branding.website}
                onChange={(e) => setBranding({ ...branding, website: e.target.value })}
                className="input-modern"
                placeholder="https://www.hospital.com"
              />
            </div>
          </div>
        </div>

        {/* Color Theme */}
        <div className="card-modern p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            Color Theme
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={branding.primary_color}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="input-modern"
                    placeholder="#2563eb"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for buttons, links</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Secondary Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={branding.secondary_color}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="input-modern"
                    placeholder="#d946ef"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for accents, highlights</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Accent Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={branding.accent_color}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-200"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={branding.accent_color}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    className="input-modern"
                    placeholder="#f59e0b"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for warnings, badges</p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-6 bg-gray-50 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Color Preview</h3>
            <div className="flex gap-4">
              <div className="flex-1 h-24 rounded-xl shadow-soft" style={{ backgroundColor: branding.primary_color }}></div>
              <div className="flex-1 h-24 rounded-xl shadow-soft" style={{ backgroundColor: branding.secondary_color }}></div>
              <div className="flex-1 h-24 rounded-xl shadow-soft" style={{ backgroundColor: branding.accent_color }}></div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={loadBranding}
            className="btn-secondary"
          >
            Reset Changes
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Branding Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
