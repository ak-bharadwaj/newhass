'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProfilePictureDisplay from '@/components/common/ProfilePictureDisplay';
import type { UserResponse } from '@/lib/api';

interface DashboardNavProps {
  user: UserResponse;
  onLogout: () => void;
  brandingLogo?: string;
  brandingColors?: {
    primary_color?: string;
    secondary_color?: string;
  };
}

export default function DashboardNav({
  user,
  onLogout,
  brandingLogo,
  brandingColors,
}: DashboardNavProps) {
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppsMenu, setShowAppsMenu] = useState(false);

  const primaryColor = brandingColors?.primary_color || '#1976d2';
  const secondaryColor = brandingColors?.secondary_color || '#dc004e';

  return (
    <motion.nav
      className="sticky top-0 z-50 glass border-b border-gray-200/50 shadow-soft-lg"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Title */}
          <div className="flex items-center space-x-5">
            {brandingLogo && (
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl blur-xl" />
                <img
                  src={brandingLogo}
                  alt="Logo"
                  className="relative h-11 w-auto object-contain drop-shadow-lg"
                />
              </motion.div>
            )}
            <div>
              <motion.h1 
                className="text-xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {user.role_display_name} Dashboard
              </motion.h1>
              <motion.p 
                className="text-xs font-medium text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Hospital Automation System Suite
              </motion.p>
            </div>
          </div>

          {/* Right: Actions and Profile */}
          <div className="flex items-center space-x-2">
            {/* Apps Menu */}
            <div className="relative">
              <motion.button
                onClick={() => setShowAppsMenu(!showAppsMenu)}
                className="relative px-4 py-2 text-gray-700 hover:text-primary-600 bg-gray-50/50 hover:bg-white rounded-xl transition-all duration-200 flex items-center gap-2 group shadow-soft hover:shadow-soft-lg"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg
                  className="w-5 h-5 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <span className="text-sm font-semibold">Apps</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    showAppsMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>
              <AnimatePresence>
                {showAppsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-soft-xl overflow-hidden"
                  >
                    <div className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-gray-200/50">
                      <h3 className="text-gray-900 text-sm font-bold flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
                        Available Apps
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">Quick access to system modules</p>
                    </div>
                    <div className="py-2 px-2">
                      {/* Messages - available to all authenticated users */}
                      <motion.button
                        onClick={() => { setShowAppsMenu(false); router.push('/dashboard/messages'); }}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                        whileHover={{ x: 4 }}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.234 0-2.41-.223-3.465-.627L3 20l.86-3.207A7.826 7.826 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">Messages</div>
                          <div className="text-xs text-gray-500">Internal communication</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </motion.button>

                      {/* Pharmacy Inventory - pharmacist only */}
                      {user.role_name === 'pharmacist' && (
                        <motion.button
                          onClick={() => { setShowAppsMenu(false); router.push('/dashboard/pharmacist/inventory'); }}
                          className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                          whileHover={{ x: 4 }}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">Pharmacy Inventory</div>
                            <div className="text-xs text-gray-500">Medication stock management</div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                        </motion.button>
                      )}

                      {/* Manager Patient Management */}
                      {user.role_name === 'manager' && (
                        <motion.button
                          onClick={() => { setShowAppsMenu(false); router.push('/dashboard/manager/patients'); }}
                          className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                          whileHover={{ x: 4 }}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">Patient Management</div>
                            <div className="text-xs text-gray-500">Create & link patients</div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                        </motion.button>
                      )}

                      {/* Admin tools - super/regional/hospital admins */}
                      {['super_admin','regional_admin','hospital_admin'].includes(user.role_name) && (
                        <>
                          <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Admin Tools</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                          </div>
                          <motion.button
                            onClick={() => { setShowAppsMenu(false); router.push('/dashboard/admin/users'); }}
                            className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                            whileHover={{ x: 4 }}
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm">User Management</div>
                              <div className="text-xs text-gray-500">Create & manage users</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </motion.button>
                          {/* Branding: available to admins, hidden for super admin per requirements */}
                          {user.role_name !== 'super_admin' && (
                            <motion.button
                              onClick={() => { setShowAppsMenu(false); router.push('/dashboard/admin/branding'); }}
                              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                              whileHover={{ x: 4 }}
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-sm">Branding</div>
                                <div className="text-xs text-gray-500">Customize appearance</div>
                              </div>
                              <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                            </motion.button>
                          )}
                          <motion.button
                            onClick={() => { setShowAppsMenu(false); router.push('/dashboard/admin/api-keys'); }}
                            className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                            whileHover={{ x: 4 }}
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm">API Keys</div>
                              <div className="text-xs text-gray-500">Integration management</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </motion.button>
                          <motion.button
                            onClick={() => { setShowAppsMenu(false); router.push('/dashboard/admin/audit-logs'); }}
                            className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                            whileHover={{ x: 4 }}
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm">Audit Logs</div>
                              <div className="text-xs text-gray-500">System activity tracking</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </motion.button>
                          <motion.button
                            onClick={() => { setShowAppsMenu(false); router.push(user.role_name === 'super_admin' ? '/dashboard/super_admin/analytics' : '/dashboard/admin/analytics'); }}
                            className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                            whileHover={{ x: 4 }}
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-glow">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm">Analytics Dashboard</div>
                              <div className="text-xs text-gray-500">{user.role_name === 'super_admin' ? 'Global insights & metrics' : 'Data insights & reports'}</div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </motion.button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Notifications */}
            <div className="relative">
              <motion.button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 hover:bg-primary-50 rounded-xl transition-all duration-200 shadow-soft hover:shadow-soft-lg group"
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-6 h-6 text-gray-600 group-hover:text-primary-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {/* Removed static notification badge indicator to avoid false alerts */}
              </motion.button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-96 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-soft-xl overflow-hidden"
                  >
                    <div className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-gray-200/50 flex items-center justify-between">
                      <div>
                        <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-error-500 rounded-full animate-pulse"></span>
                          Notifications
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">Stay updated with system activities</p>
                      </div>
                      <button className="text-xs text-primary-600 hover:text-primary-700 font-semibold">Mark all read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                        </div>
                        <p className="text-gray-600 font-medium">No new notifications</p>
                        <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Menu */}
            <div className="relative ml-2">
              <motion.button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 hover:bg-primary-50 rounded-xl p-2 pr-4 transition-all duration-200 shadow-soft hover:shadow-soft-lg group"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <ProfilePictureDisplay
                    pictureUrl={user.profile_picture_url}
                    firstName={user.first_name}
                    lastName={user.last_name}
                    size="sm"
                    showBorder={true}
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-gray-900 text-sm font-semibold group-hover:text-primary-600 transition-colors">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-gray-500 text-xs">{user.role_display_name}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    showProfileMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-soft-xl overflow-hidden"
                  >
                    {/* Profile Header */}
                    <div className="p-5 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <ProfilePictureDisplay
                            pictureUrl={user.profile_picture_url}
                            firstName={user.first_name}
                            lastName={user.last_name}
                            size="md"
                          />
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success-400 border-2 border-white rounded-full shadow-glow"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold truncate text-base">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-white/80 text-xs truncate font-medium">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-lg">
                            {user.role_display_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2 px-2">
                      <motion.button
                        onClick={() => {
                          setShowProfileMenu(false);
                          router.push('/dashboard/profile');
                        }}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center space-x-3 group"
                        whileHover={{ x: 4 }}
                      >
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-soft group-hover:shadow-glow">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <span className="font-semibold text-sm">My Profile</span>
                        <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </motion.button>

                      <motion.button
                        onClick={() => {
                          setShowProfileMenu(false);
                          router.push('/dashboard/settings');
                        }}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center space-x-3 group"
                        whileHover={{ x: 4 }}
                      >
                        <div className="w-9 h-9 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center shadow-soft group-hover:shadow-glow">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <span className="font-semibold text-sm">Settings</span>
                        <svg className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </motion.button>

                      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3 mx-2" />

                      <motion.button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-3 text-left text-error-600 hover:bg-error-50 rounded-xl transition-all duration-200 flex items-center space-x-3 group"
                        whileHover={{ x: 4 }}
                      >
                        <div className="w-9 h-9 bg-gradient-to-br from-error-500 to-error-600 rounded-lg flex items-center justify-center shadow-soft group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </div>
                        <span className="font-semibold text-sm">Logout</span>
                        <svg className="w-5 h-5 text-error-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showProfileMenu || showNotifications || showAppsMenu) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]"
          onClick={() => {
            setShowProfileMenu(false);
            setShowNotifications(false);
            setShowAppsMenu(false);
          }}
        />
      )}
    </motion.nav>
  );
}
