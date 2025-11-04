'use client'

import { useState, useEffect, useTransition, useMemo, useCallback, MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRegionalTheme } from '@/contexts/RegionalThemeContext'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { NavCommandPalette, type CommandItem } from '@/components/dashboard/NavCommandPalette'

interface DashboardLayoutProps {
  children: React.ReactNode
  role?: string
}

interface SubMenuItem {
  name: string
  href: string
}

interface NavigationItem {
  name: string
  href: string
  icon: string
  submenu?: SubMenuItem[]
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const { theme: regionalTheme, region } = useRegionalTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const roleName = role || 'user'
  // Use theme tokens for consistent styling across all roles
  const navActiveClass = 'theme-btn-primary shadow-lg'
  const desktopNavHoverClass = isDark
    ? 'theme-text-secondary hover:bg-blue-500/20 hover:text-white'
    : 'theme-text-secondary hover:bg-blue-100 hover:text-blue-900'
  const mobileNavHoverClass = isDark
    ? 'theme-text-secondary hover:bg-blue-500/20 hover:text-white'
    : 'theme-text-secondary hover:bg-blue-100 hover:text-blue-900'
  const submenuHoverClass = isDark
    ? 'theme-text-secondary hover:bg-blue-500/20 hover:text-white'
    : 'theme-text-secondary hover:bg-blue-100 hover:text-blue-900'
  const avatarGradientClass = 'theme-btn-primary'
  const profileHeaderClass = 'theme-btn-primary'
  const profileButtonHoverClass = isDark ? 'hover:bg-blue-500/20' : 'hover:bg-blue-50'
  const profileMenuItemClass = isDark
    ? 'theme-text-secondary hover:bg-blue-500/20'
    : 'theme-text-secondary hover:bg-blue-100'
  const profileNameClass = 'theme-text-primary'
  const profileRoleClass = 'theme-text-secondary'
  const profileMenuIconClass = isDark ? 'text-blue-100' : 'text-slate-500'
  const mobileMenuIconClass = 'theme-text-secondary'
  const brandTitleClass = 'theme-text-primary'
  const brandSubtitleClass = 'theme-text-secondary'
  const topNavSurfaceClass = isDark
    ? 'theme-glass border border-slate-800 theme-text-primary'
    : 'theme-glass border border-blue-100 theme-text-primary'
  const dropdownSurfaceClass = isDark
    ? 'theme-glass border border-slate-700 theme-text-primary'
    : 'theme-card border border-blue-100 theme-text-primary'
  const mobileMenuSurfaceClass = isDark
    ? 'theme-glass border-t border-slate-800'
    : 'theme-glass border-t border-blue-100'
  const iconButtonClass = isDark
    ? 'theme-card hover:theme-btn-primary'
    : 'theme-card hover:theme-btn-primary'
  const searchButtonClass = isDark
    ? 'theme-card theme-text-secondary hover:theme-surface'
    : 'theme-card theme-text-secondary hover:theme-surface'
  const dropdownHeadingClass = 'theme-text-primary'
  const dropdownMutedClass = 'theme-text-secondary'
  const dropdownCardClass = isDark
    ? 'bg-blue-500/10 hover:bg-blue-500/20 theme-text-primary'
    : 'bg-blue-50 hover:bg-blue-100 text-blue-900'
  const dropdownDividerClass = isDark ? 'border-slate-700/60' : 'border-blue-100'
  const pageBackgroundClass = 'theme-bg theme-text-primary'
  const navButtonBaseClass = 'px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2'
  const shortcutKeyClass = isDark
    ? 'bg-white/10 text-slate-300'
    : 'bg-white/70 text-slate-500'
  const brandLogoUrl = regionalTheme?.logo_url?.trim()
  const brandAlt = region?.name ? `${region.name} logo` : 'Organization logo'
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  const profileImageAlt = userFullName ? `${userFullName}'s profile picture` : 'Profile picture'

  // Role-based navigation configuration
  const getNavigationForRole = (): NavigationItem[] => {
    const baseNav: NavigationItem[] = [
      { name: 'Dashboard', href: `/dashboard/${roleName}`, icon: '🏠' },
    ]

    switch (roleName) {
      case 'doctor':
        return [
          ...baseNav,
          { name: 'Patients', href: `/dashboard/${roleName}/patients`, icon: '👥' },
          { name: 'Case Sheets', href: `/dashboard/doctor/case-sheets`, icon: '📋' },
          { name: 'Appointments', href: `/dashboard/${roleName}/appointments`, icon: '📅' },
          { name: 'Prescriptions', href: `/dashboard/${roleName}/prescriptions`, icon: '💊' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
          { name: 'Analytics', href: `/dashboard/${roleName}/analytics`, icon: '📊' },
        ]
      case 'nurse':
        return [
          ...baseNav,
          { name: 'Patients', href: `/dashboard/${roleName}/patients`, icon: '👥' },
          { name: 'Case Sheets', href: `/dashboard/nurse/case-sheets`, icon: '📋' },
          { name: 'Vitals', href: `/dashboard/${roleName}/vitals`, icon: '❤️' },
          { name: 'Tasks', href: `/dashboard/${roleName}/tasks`, icon: '✅' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      case 'manager':
        return [
          ...baseNav,
          { name: 'Patients', href: `/dashboard/${roleName}/patients`, icon: '👥' },
          { name: 'Staff', href: `/dashboard/${roleName}/staff`, icon: '👔' },
          { name: 'Beds', href: `/dashboard/${roleName}/beds`, icon: '🛏️' },
          { name: 'Reports', href: `/dashboard/${roleName}/reports`, icon: '📊' },
          { name: 'Analytics', href: `/dashboard/${roleName}/analytics`, icon: '📈' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      case 'super_admin':
        return [
          ...baseNav,
          { name: 'All Regions', href: `/dashboard/${roleName}/regions`, icon: '🌍' },
          { name: 'All Hospitals', href: `/dashboard/${roleName}/hospitals`, icon: '🏥' },
          { name: 'All Users', href: `/dashboard/${roleName}/users`, icon: '👥' },
          { name: 'All Patients', href: `/dashboard/${roleName}/patients`, icon: '🧑‍⚕️' },
          { name: 'Analytics', href: `/dashboard/${roleName}/analytics`, icon: '📊', submenu: [
            { name: 'System Overview', href: `/dashboard/${roleName}/analytics/overview` },
            { name: 'Patient Analytics', href: `/dashboard/${roleName}/analytics/patients` },
            { name: 'Hospital Performance', href: `/dashboard/${roleName}/analytics/hospitals` },
            { name: 'Staff Analytics', href: `/dashboard/${roleName}/analytics/staff` },
            { name: 'Financial Reports', href: `/dashboard/${roleName}/analytics/financial` },
            { name: 'Bed Utilization', href: `/dashboard/${roleName}/analytics/beds` },
            { name: 'Appointment Trends', href: `/dashboard/${roleName}/analytics/appointments` },
            { name: 'Lab Analytics', href: `/dashboard/${roleName}/analytics/labs` },
            { name: 'Pharmacy Analytics', href: `/dashboard/${roleName}/analytics/pharmacy` },
            { name: 'AI Insights', href: `/dashboard/${roleName}/analytics/ai-insights` },
            { name: 'Public Health', href: `/dashboard/${roleName}/analytics/public-health` },
          ]},
          { name: 'Reports', href: `/dashboard/${roleName}/reports`, icon: '📈' },
          { name: 'System Settings', href: '/dashboard/settings', icon: '⚙️' },
          { name: 'Audit Logs', href: `/dashboard/${roleName}/audit-logs`, icon: '📝' },
        ]
      case 'regional_admin':
        return [
          ...baseNav,
          { name: 'Hospitals', href: `/dashboard/${roleName}/hospitals`, icon: '🏥' },
          { name: 'Users', href: `/dashboard/${roleName}/users`, icon: '👥' },
          {
            name: 'Analytics',
            href: `/dashboard/${roleName}/analytics`,
            icon: '📊',
            submenu: [
              { name: 'Overview', href: `/dashboard/${roleName}/analytics` },
              { name: 'Hospital Metrics', href: `/dashboard/${roleName}/analytics?view=hospitals` },
              { name: 'Bed Utilization', href: `/dashboard/${roleName}/analytics?view=beds` },
              { name: 'Staff Coverage', href: `/dashboard/${roleName}/analytics?view=staff` },
            ],
          },
          {
            name: 'Reports',
            href: `/dashboard/${roleName}/reports`,
            icon: '📈',
            submenu: [
              { name: 'Monthly Summary', href: `/dashboard/${roleName}/reports?type=monthly` },
              { name: 'Compliance', href: `/dashboard/${roleName}/reports?type=compliance` },
              { name: 'Export Center', href: `/dashboard/${roleName}/reports?type=export` },
            ],
          },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
          { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
        ]
      case 'admin':
        return [
          ...baseNav,
          { name: 'My Region', href: `/dashboard/${roleName}/region`, icon: '📍' },
          { name: 'Hospitals', href: `/dashboard/${roleName}/hospitals`, icon: '🏥' },
          { name: 'Users', href: `/dashboard/${roleName}/users`, icon: '👥' },
          { name: 'Patients', href: `/dashboard/${roleName}/patients`, icon: '🧑‍⚕️' },
          { name: 'Analytics', href: `/dashboard/${roleName}/analytics`, icon: '📊', submenu: [
            { name: 'Regional Overview', href: `/dashboard/${roleName}/analytics/overview` },
            { name: 'Patient Analytics', href: `/dashboard/${roleName}/analytics/patients` },
            { name: 'Hospital Performance', href: `/dashboard/${roleName}/analytics/hospitals` },
            { name: 'Staff Analytics', href: `/dashboard/${roleName}/analytics/staff` },
            { name: 'Financial Reports', href: `/dashboard/${roleName}/analytics/financial` },
            { name: 'Bed Utilization', href: `/dashboard/${roleName}/analytics/beds` },
            { name: 'Appointment Trends', href: `/dashboard/${roleName}/analytics/appointments` },
            { name: 'Lab Analytics', href: `/dashboard/${roleName}/analytics/labs` },
            { name: 'Pharmacy Analytics', href: `/dashboard/${roleName}/analytics/pharmacy` },
            { name: 'AI Insights', href: `/dashboard/${roleName}/analytics/ai-insights` },
            { name: 'Public Health', href: `/dashboard/${roleName}/analytics/public-health` },
          ]},
          { name: 'Reports', href: `/dashboard/${roleName}/reports`, icon: '📈' },
          { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
          { name: 'Audit Logs', href: `/dashboard/${roleName}/audit-logs`, icon: '📝' },
        ]
      case 'patient':
        return [
          ...baseNav,
          { name: 'My Health', href: `/dashboard/${roleName}/health`, icon: '❤️' },
          { name: 'Appointments', href: `/dashboard/${roleName}/appointments`, icon: '📅' },
          { name: 'Prescriptions', href: `/dashboard/${roleName}/prescriptions`, icon: '💊' },
          { name: 'Lab Reports', href: `/dashboard/${roleName}/lab-reports`, icon: '🔬' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      case 'pharmacist':
        return [
          ...baseNav,
          { name: 'Prescriptions', href: `/dashboard/${roleName}/prescriptions`, icon: '💊' },
          { name: 'Inventory', href: `/dashboard/${roleName}/inventory`, icon: '📦' },
          { name: 'Orders', href: `/dashboard/${roleName}/orders`, icon: '🛒' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      case 'lab_tech':
        return [
          ...baseNav,
          { name: 'Lab Tests', href: `/dashboard/${roleName}/lab-tests`, icon: '🔬' },
          { name: 'Pending Tests', href: `/dashboard/${roleName}/pending`, icon: '⏳' },
          { name: 'Results', href: `/dashboard/${roleName}/results`, icon: '📄' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      case 'reception':
        return [
          ...baseNav,
          { name: 'Check-In', href: `/dashboard/${roleName}/check-in`, icon: '✅' },
          { name: 'Patients', href: `/dashboard/${roleName}/patients`, icon: '👥' },
          { name: 'Appointments', href: `/dashboard/${roleName}/appointments`, icon: '📅' },
          { name: 'Billing', href: `/dashboard/${roleName}/billing`, icon: '💰' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      default:
        return [
          ...baseNav,
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
    }
  }

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const navigation = useMemo(() => getNavigationForRole(), [roleName])

  const commandItems = useMemo<CommandItem[]>(() => {
    const prefix = slugify(roleName)
    const items: CommandItem[] = []

    navigation.forEach((item) => {
      const menuSlug = slugify(item.name)
      const baseId = `${prefix}-${menuSlug}`

      if (item.href) {
        items.push({
          id: `${baseId}-root`,
          label: item.name,
          href: item.href,
          icon: item.icon,
          group: 'Main Navigation',
          keywords: [item.name, roleName.replace('_', ' ')],
        })
      }

      if (item.submenu?.length) {
        item.submenu.forEach((subitem) => {
          const subSlug = slugify(subitem.name)
          items.push({
            id: `${baseId}-${subSlug}`,
            label: subitem.name,
            href: subitem.href,
            icon: item.icon,
            group: item.name,
            keywords: [item.name, subitem.name, roleName.replace('_', ' ')],
            parentMenuName: item.name,
          })
        })
      }
    })

    return items
  }, [navigation, roleName])

  const navigateTo = useCallback((href: string) => {
    if (!href || href === '#') return
    setShowProfileMenu(false)
    setShowNotifications(false)
    setShowMobileMenu(false)
    setOpenSubmenu(null)

    startTransition(() => router.push(href))
  }, [router, startTransition])

  const handleNavClick = useCallback((href: string) => (event: MouseEvent<HTMLElement>) => {
    if (!href || href === '#') {
      event.preventDefault()
      return
    }

    if (event.defaultPrevented) return

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    navigateTo(href)
  }, [navigateTo])

  const handleCommandSelect = (item: CommandItem) => {
    setIsCommandOpen(false)
    navigateTo(item.href)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget = Boolean(
        target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )

      const key = event.key.toLowerCase()

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        if (isTypingTarget) return
        event.preventDefault()
        setIsCommandOpen(true)
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey && key === '/') {
        if (isTypingTarget) return
        event.preventDefault()
        setIsCommandOpen(true)
      } else if (key === 'escape') {
        setIsCommandOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = () => {
    setShowProfileMenu(false)
    setShowNotifications(false)
    setShowMobileMenu(false)
    logout()
    router.push('/login')
  }

  return (
    <div className={`min-h-screen ${pageBackgroundClass}`}>
      <AnimatePresence>
        {isPending && (
          <motion.div
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-50"
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 1, transformOrigin: 'right', opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`${topNavSurfaceClass} backdrop-blur-xl sticky top-0 z-40 shadow-lg`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <Link href={`/dashboard/${roleName}`} className="flex items-center space-x-3 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden group-hover:scale-110 transition-transform ${brandLogoUrl ? (isDark ? 'bg-slate-900/60' : 'bg-white') : avatarGradientClass}`}>
                  {brandLogoUrl ? (
                    <Image
                      src={brandLogoUrl}
                      alt={brandAlt}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                      priority={false}
                    />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className={`text-sm font-bold ${brandTitleClass}`}>HASS</div>
                  <div className={`text-xs capitalize ${brandSubtitleClass}`}>{roleName.replace('_', ' ')}</div>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1 ml-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const menuSlug = slugify(item.name)
                  
                  // If item has submenu, render dropdown
                  if (item.submenu) {
                    return (
                      <div key={item.name} className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                          className={`${navButtonBaseClass} ${
                isActive
                  ? navActiveClass
                  : desktopNavHoverClass
                          }`}
                          aria-expanded={openSubmenu === item.name}
                          aria-controls={`submenu-${menuSlug}`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.name}</span>
                          <svg className={`w-4 h-4 transition-transform ${openSubmenu === item.name ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Submenu Dropdown */}
                        <AnimatePresence>
                          {openSubmenu === item.name && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              id={`submenu-${menuSlug}`}
                              className={`${dropdownSurfaceClass} absolute left-0 mt-2 w-56 rounded-xl shadow-2xl backdrop-blur-xl py-2 z-50`}
                            >
                              {item.submenu.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  prefetch={false}
                                  onClick={handleNavClick(subItem.href)}
                                  className={`block px-4 py-2 text-sm rounded-lg transition-colors ${submenuHoverClass}`}
                                >
                                  {subItem.name}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  }
                  
                  // Regular navigation item
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={false}
                      onClick={handleNavClick(item.href)}
                      className={`${navButtonBaseClass} ${
                        isActive
                          ? navActiveClass
                          : desktopNavHoverClass
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <motion.button
                onClick={toggleTheme}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-xl transition-colors ${iconButtonClass}`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </motion.button>

              {/* Search */}
              <button
                type="button"
                onClick={() => setIsCommandOpen(true)}
                className={`hidden md:flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors ${searchButtonClass}`}
                title="Search navigation (Ctrl+K)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
                <span className={`ml-3 hidden items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${shortcutKeyClass} lg:inline-flex`}>
                  Ctrl
                  <kbd className="font-semibold text-current">K</kbd>
                </span>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-xl transition-colors ${iconButtonClass}`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Removed static notification dot to avoid misleading alerts */}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={`${dropdownSurfaceClass} absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl backdrop-blur-xl p-4 z-50`}
                    >
                      <div className={`text-sm font-semibold ${dropdownHeadingClass} mb-3`}>Notifications</div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        <div className={`${dropdownCardClass} p-3 rounded-xl transition-colors cursor-pointer`}
                          onClick={() => setShowNotifications(false)}
                        >
                          <div className="text-sm font-medium">New patient assigned</div>
                          <div className={`text-xs mt-1 ${dropdownMutedClass}`}>John Doe - Room 204</div>
                        </div>
                        <div className={`text-center py-4 text-sm ${dropdownMutedClass}`}>
                          No more notifications
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center space-x-3 p-1.5 rounded-xl transition-colors ${profileButtonHoverClass} ${isDark ? 'text-slate-100' : 'text-slate-700'}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                    {user?.profile_picture_url ? (
                      <Image
                        src={user.profile_picture_url}
                        alt={profileImageAlt}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                        priority={false}
                      />
                    ) : (
                      <div className={`w-full h-full ${avatarGradientClass} flex items-center justify-center text-white font-bold`}>
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className={`text-sm font-semibold ${profileNameClass}`}>
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div className={`text-xs capitalize ${profileRoleClass}`}>
                      {roleName.replace('_', ' ')}
                    </div>
                  </div>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={`${dropdownSurfaceClass} absolute right-0 mt-2 w-64 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-50`}
                    >
                      {/* Profile Header */}
                      <div className={`${profileHeaderClass} p-4 text-white`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/20 backdrop-blur-xl flex items-center justify-center text-white font-bold text-lg">
                            {user?.profile_picture_url ? (
                              <Image
                                src={user.profile_picture_url}
                                alt={profileImageAlt}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                                unoptimized
                                priority={false}
                              />
                            ) : (
                              <span>
                                {user?.first_name?.[0]}{user?.last_name?.[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{user?.first_name} {user?.last_name}</div>
                            <div className="text-xs opacity-90">{user?.email}</div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <Link
                          href="/dashboard/profile"
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${profileMenuItemClass}`}
                          prefetch={false}
                          onClick={handleNavClick('/dashboard/profile')}
                        >
                          <svg className={`w-5 h-5 ${profileMenuIconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm font-medium">My Profile</span>
                        </Link>

                        <Link
                          href="/dashboard/settings"
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${profileMenuItemClass}`}
                          prefetch={false}
                          onClick={handleNavClick('/dashboard/settings')}
                        >
                          <svg className={`w-5 h-5 ${profileMenuIconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm font-medium">Settings</span>
                        </Link>

                        <div className={`my-2 border-t ${dropdownDividerClass}`}></div>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors text-red-500 hover:bg-red-500/10"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="text-sm font-medium">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`md:hidden p-2 rounded-xl transition-colors ${profileButtonHoverClass}`}
              >
                <svg className={`w-6 h-6 ${mobileMenuIconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden backdrop-blur-xl ${mobileMenuSurfaceClass}`}
            >
              <div className="px-4 py-3 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const menuSlug = slugify(item.name)
                  
                  // If item has submenu
                  if (item.submenu) {
                    return (
                      <div key={item.name}>
                        <button
                          type="button"
                          onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${
                            isActive
                              ? navActiveClass
                              : mobileNavHoverClass
                          }`}
                          aria-expanded={openSubmenu === item.name}
                          aria-controls={`mobile-submenu-${menuSlug}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span>{item.icon}</span>
                            <span>{item.name}</span>
                          </div>
                          <svg className={`w-4 h-4 transition-transform ${openSubmenu === item.name ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Mobile Submenu */}
                        <AnimatePresence>
                          {openSubmenu === item.name && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              id={`mobile-submenu-${menuSlug}`}
                              className="ml-4 mt-1 space-y-1"
                            >
                              {item.submenu.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  prefetch={false}
                                  onClick={handleNavClick(subItem.href)}
                                  className={`block px-4 py-2 text-sm rounded-lg transition-colors ${submenuHoverClass}`}
                                >
                                  {subItem.name}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  }
                  
                  // Regular navigation item
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={false}
                      onClick={handleNavClick(item.href)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
                        isActive
                          ? navActiveClass
                          : mobileNavHoverClass
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <NavCommandPalette
        isOpen={isCommandOpen}
        items={commandItems}
        onClose={() => setIsCommandOpen(false)}
        onSelect={handleCommandSelect}
      />
    </div>
  )
}
