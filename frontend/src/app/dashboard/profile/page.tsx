'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import ProfilePictureUpload from '@/components/common/ProfilePictureUpload';
import { EnterpriseDashboardLayout } from '@/components/dashboard/EnterpriseDashboardLayout';

export default function ProfilePage() {
  const { user, token, logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || !token) {
    return null;
  }

  const handleProfilePictureUpload = async (newPictureUrl: string) => {
    setSuccess('Profile picture updated successfully!');
    // Refresh user data to get the updated profile picture
    await refreshUser();
    setTimeout(() => setSuccess(null), 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const roleForLayout = user.role_name === 'regional_admin' ? 'admin' : (user.role_name || 'user')

  return (
    <EnterpriseDashboardLayout role={roleForLayout}>
      <div className="p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
            <p className="text-white/60">
              Manage your personal information and settings
            </p>
          </motion.div>

          {/* Success/Error Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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

          {/* Profile Picture Section */}
          <motion.div
            variants={itemVariants}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-xl font-semibold text-white mb-6">
              Profile Picture
            </h2>
            <div className="flex justify-center">
              <ProfilePictureUpload
                currentPictureUrl={user.profile_picture_url}
                onUploadSuccess={handleProfilePictureUpload}
                token={token}
                size="large"
              />
            </div>
          </motion.div>

          {/* Personal Information */}
          <motion.div
            variants={itemVariants}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-xl font-semibold text-white mb-6">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  First Name
                </label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                  {user.first_name}
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Last Name
                </label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                  {user.last_name}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/60 text-sm mb-2">
                  Email Address
                </label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                  {user.email}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Account Information */}
          <motion.div
            variants={itemVariants}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-xl font-semibold text-white mb-6">
              Account Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/60 text-sm mb-2">Role</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-full text-sm font-medium">
                    {user.role_display_name}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Status</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {user.last_login && (
                <div className="md:col-span-2">
                  <label className="block text-white/60 text-sm mb-2">
                    Last Login
                  </label>
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                    {new Date(user.last_login).toLocaleString()}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-white/60 text-sm mb-2">
                  Account Created
                </label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                  {new Date(user.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Permissions Summary */}
          <motion.div
            variants={itemVariants}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-xl font-semibold text-white mb-6">
              Permissions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(user.permissions).map(([permission, allowed]) => (
                <motion.div
                  key={permission}
                  className={`p-3 rounded-lg border ${
                    allowed
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center space-x-2">
                    {allowed ? (
                      <svg
                        className="w-4 h-4 text-green-400 flex-shrink-0"
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
                    ) : (
                      <svg
                        className="w-4 h-4 text-red-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <span
                      className={`text-xs font-medium ${
                        allowed ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {permission.replace(/_/g, ' ')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </EnterpriseDashboardLayout>
  );
}
