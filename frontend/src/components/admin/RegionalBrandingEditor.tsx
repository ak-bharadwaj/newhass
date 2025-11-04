'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api';

interface RegionalBrandingEditorProps {
  regionId: string;
  regionName: string;
  currentBranding?: {
    logo_url?: string;
    banner_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  token: string;
  onUpdateSuccess: (newBranding: any) => void;
}

export default function RegionalBrandingEditor({
  regionId,
  regionName,
  currentBranding = {},
  token,
  onUpdateSuccess,
}: RegionalBrandingEditorProps) {
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [branding, setBranding] = useState(currentBranding);
  const [colorSaving, setColorSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File, maxSize: number = 10): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please upload an image file (PNG, JPG, etc.)';
    }

    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  };

  const handleFileUpload = async (file: File, fileType: 'logo' | 'banner') => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!token) {
      setError('Session expired. Please sign in again to update regional branding.');
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(fileType);

    try {
      const response = await apiClient.uploadRegionalBranding(
        regionId,
        file,
        fileType,
        token
      );

      if (response.success) {
        const updatedBranding = {
          ...branding,
          ...(fileType === 'logo' && { logo_url: response.logo_url }),
          ...(fileType === 'banner' && { banner_url: response.banner_url }),
        };
        setBranding(updatedBranding);
        onUpdateSuccess(updatedBranding);
        setSuccess(
          `${fileType === 'logo' ? 'Logo' : 'Banner'} updated successfully!`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleColorUpdate = async () => {
    setColorSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.updateRegionSettings(
        regionId,
        {
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
        },
        token
      );

      onUpdateSuccess(branding);
      setSuccess('Colors updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setColorSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2">Regional Branding</h2>
        <p className="text-white/60">
          Customize the appearance of your region: {regionName}
        </p>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
          >
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-400">{error}</p>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
          >
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-green-400">{success}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logo Upload */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Region Logo</h3>
        <div className="flex items-center space-x-6">
          {/* Logo Preview */}
          <div className="w-32 h-32 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden">
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt="Region Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <svg
                className="w-16 h-16 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0], 'logo');
                }
              }}
              className="hidden"
            />
            <motion.button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading === 'logo'}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              whileHover={{ scale: uploading === 'logo' ? 1 : 1.02 }}
              whileTap={{ scale: uploading === 'logo' ? 1 : 0.98 }}
            >
              {uploading === 'logo' ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span>Upload New Logo</span>
                </>
              )}
            </motion.button>
            <p className="text-xs text-white/50">
              Recommended: Square image, PNG with transparent background (max 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* Banner Upload */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Region Banner</h3>
        <div className="space-y-4">
          {/* Banner Preview */}
          <div className="w-full h-48 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden">
            {branding.banner_url ? (
              <img
                src={branding.banner_url}
                alt="Region Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-20 h-20 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>

          {/* Upload Controls */}
          <div className="space-y-3">
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0], 'banner');
                }
              }}
              className="hidden"
            />
            <motion.button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploading === 'banner'}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              whileHover={{ scale: uploading === 'banner' ? 1 : 1.02 }}
              whileTap={{ scale: uploading === 'banner' ? 1 : 0.98 }}
            >
              {uploading === 'banner' ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span>Upload New Banner</span>
                </>
              )}
            </motion.button>
            <p className="text-xs text-white/50">
              Recommended: Wide image (1920x400px or similar), JPG/PNG (max 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* Color Theme */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Color Theme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Color */}
          <div className="space-y-3">
            <label className="text-white/80 text-sm font-medium">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={branding.primary_color || '#1976d2'}
                onChange={(e) =>
                  setBranding({ ...branding, primary_color: e.target.value })
                }
                className="w-16 h-16 rounded-lg cursor-pointer bg-transparent border-2 border-white/20"
              />
              <input
                type="text"
                value={branding.primary_color || '#1976d2'}
                onChange={(e) =>
                  setBranding({ ...branding, primary_color: e.target.value })
                }
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#1976d2"
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div className="space-y-3">
            <label className="text-white/80 text-sm font-medium">
              Secondary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={branding.secondary_color || '#dc004e'}
                onChange={(e) =>
                  setBranding({ ...branding, secondary_color: e.target.value })
                }
                className="w-16 h-16 rounded-lg cursor-pointer bg-transparent border-2 border-white/20"
              />
              <input
                type="text"
                value={branding.secondary_color || '#dc004e'}
                onChange={(e) =>
                  setBranding({ ...branding, secondary_color: e.target.value })
                }
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#dc004e"
              />
            </div>
          </div>
        </div>

        {/* Save Colors Button */}
        <motion.button
          onClick={handleColorUpdate}
          disabled={colorSaving}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          whileHover={{ scale: colorSaving ? 1 : 1.02 }}
          whileTap={{ scale: colorSaving ? 1 : 0.98 }}
        >
          {colorSaving ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Save Color Theme</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Preview Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
        <div className="space-y-4">
          <div
            className="p-6 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${
                branding.primary_color || '#1976d2'
              }, ${branding.secondary_color || '#dc004e'})`,
            }}
          >
            <div className="flex items-center space-x-4">
              {branding.logo_url && (
                <img
                  src={branding.logo_url}
                  alt="Logo Preview"
                  className="w-12 h-12 object-contain"
                />
              )}
              <div className="text-white">
                <div className="text-xl font-bold">{regionName}</div>
                <div className="text-sm opacity-90">Preview of your branding</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-white/50">
            This preview shows how your branding colors will appear across the platform
          </p>
        </div>
      </div>
    </div>
  );
}
