'use client'

import { useState, useEffect, useTransition, useMemo, useCallback, MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRegionalTheme } from '@/contexts/RegionalThemeContext'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { NavCommandPalette, type CommandItem } from '@/components/dashboard/NavCommandPalette'
import { apiClient } from '@/lib/api'

interface NavigationItem {
  name: string
  href: string
  icon: string
  submenu?: NavigationItem[]
}

interface EnterpriseDashboardLayoutProps {
  children: React.ReactNode
  role?: string
}

type Tone = 'light' | 'dark'

interface RoleTheme {
  icon: string
  sidebar: Record<Tone, string>
}

export function EnterpriseDashboardLayout({ children, role }: EnterpriseDashboardLayoutProps) {
  const { user, logout, token } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { theme: regionalTheme, region } = useRegionalTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Compact mode reduces paddings/heights/gaps for denser dashboards across roles
  const [compact, setCompact] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [highContrast, setHighContrast] = useState(false)
  // Reception: pending discharge requests badge
  const [receptionDischargeCount, setReceptionDischargeCount] = useState<number>(0)

  const resolvedRole = role ?? user?.role_name ?? 'user' // Prefer explicit prop but fall back to authenticated user
  const roleName = useMemo(() => {
    const normalized = resolvedRole
      ? resolvedRole
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
      : 'user'
    return normalized || 'user'
  }, [resolvedRole])
  
  const baseSidebar: Record<Tone, string> = {
    light: 'from-blue-600 via-indigo-500 to-purple-500',
    dark: 'from-blue-900 via-indigo-900 to-purple-900',
  }

  // Premium color schemes for each role with home page inspired palette
  const roleThemes: Record<string, RoleTheme> = {
    doctor: { icon: '👨‍⚕️', sidebar: baseSidebar },
    nurse: { icon: '👩‍⚕️', sidebar: baseSidebar },
    admin: { icon: '⚡', sidebar: baseSidebar },
    super_admin: { icon: '👑', sidebar: baseSidebar },
    regional_admin: { icon: '🗺️', sidebar: baseSidebar },
    manager: { icon: '📊', sidebar: baseSidebar },
    patient: { icon: '🧑‍🦱', sidebar: baseSidebar },
    pharmacist: { icon: '💊', sidebar: baseSidebar },
    lab_tech: { icon: '🔬', sidebar: baseSidebar },
    reception: { icon: '📋', sidebar: baseSidebar },
    user: { icon: '👤', sidebar: baseSidebar },
  }

  const roleTheme = roleThemes[roleName] || roleThemes.user
  const tone: Tone = isDark ? 'dark' : 'light'
  const sidebarGradient = roleTheme.sidebar[tone]
  const sidebarClass = tone === 'dark'
    ? 'bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900'
    : `bg-gradient-to-b ${sidebarGradient}`
  const pageBackgroundStyle = isDark
    ? { background: 'linear-gradient(135deg, #0b1220 0%, #0f172a 60%, #0b1220 100%)' }
    : { background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }
  const navActiveClass = isDark
    ? 'bg-blue-500 text-white shadow-lg'
    : 'bg-white text-blue-700 shadow-lg'
  const navHoverClass = isDark
    ? 'text-white/90 hover:bg-blue-500/40 hover:text-white'
    : 'text-white hover:bg-white/10 hover:text-white'
  const submenuActiveClass = isDark
    ? 'bg-blue-500/80 text-white font-semibold'
    : 'bg-white text-blue-700 font-semibold'
  const submenuHoverClass = isDark
    ? 'text-white/90 hover:bg-blue-500/35 hover:text-white'
    : 'text-white hover:bg-white/10 hover:text-white'
  const sidebarToggleClass = isDark
    ? 'bg-blue-500/25 hover:bg-blue-500/40'
    : 'bg-white/20 hover:bg-white/30'
  const profileHoverClass = isDark ? 'hover:bg-blue-500/25' : 'hover:bg-white/20'
  const userSectionBorderClass = isDark ? 'border-blue-500/30' : 'border-white/30'
  const avatarBgClass = isDark ? 'bg-blue-500/30' : 'bg-blue-500/15'
  const brandLogoUrl = regionalTheme?.logo_url?.trim()
  const brandAlt = region?.name ? `${region.name} logo` : 'Organization logo'
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  const profileImageAlt = userFullName ? `${userFullName}'s profile picture` : 'Profile picture'

  // Persist compact mode across sessions
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('dashboard:compact')
      if (saved === 'true' || saved === 'false') {
        setCompact(saved === 'true')
      } else {
        // Default to compact ON
        window.localStorage.setItem('dashboard:compact', 'true')
        setCompact(true)
      }
    } catch (_) {
      // ignore storage errors
    }
  }, [])
  const toggleCompact = useCallback(() => {
    setCompact((prev) => {
      const next = !prev
      try { window.localStorage.setItem('dashboard:compact', String(next)) } catch (_) {}
      return next
    })
  }, [])

  // High contrast toggle persistence
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('dashboard:high-contrast')
      if (saved === 'true') {
        setHighContrast(true)
        document.documentElement.classList.add('high-contrast')
      }
    } catch (_) {}
  }, [])
  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev
      try { window.localStorage.setItem('dashboard:high-contrast', String(next)) } catch (_) {}
      if (next) document.documentElement.classList.add('high-contrast')
      else document.documentElement.classList.remove('high-contrast')
      return next
    })
  }, [])

  const navigateTo = useCallback((href: string) => {
    if (!href || href === '#') return
    setShowProfileMenu(false)
    startTransition(() => router.push(href))
  }, [router, startTransition])

  const handleNavClick = useCallback((href: string) => (event: MouseEvent<HTMLElement>) => {
    if (!href || href === '#') {
      event.preventDefault()
      return
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return
    }
    event.preventDefault()
    navigateTo(href)
  }, [navigateTo])

  // Comprehensive navigation for each role
  const getNavigationForRole = (): NavigationItem[] => {
    const baseNav: NavigationItem[] = [
      { name: 'Dashboard', href: `/dashboard/${roleName}`, icon: '🏠' },
    ]

    switch (roleName) {
      case 'doctor':
        // Prioritize primary actions near the top for faster access
        return [
          ...baseNav,
          { name: 'Patients', href: `/dashboard/doctor/patients`, icon: '👥' },
          { name: 'Appointments', href: `/dashboard/doctor/appointments`, icon: '�' },
          { name: 'Prescriptions', href: `/dashboard/doctor/prescriptions`, icon: '�' },
          { name: 'Case Sheets', href: `/dashboard/doctor/case-sheets`, icon: '�' },
          { 
            name: 'Analytics', 
            href: '/dashboard/doctor/analytics', 
            icon: '📊',
            submenu: [
              { name: 'Patient Analytics', href: `/dashboard/doctor/analytics/patients`, icon: '📈' },
              { name: 'Treatment Outcomes', href: `/dashboard/doctor/analytics/outcomes`, icon: '🎯' },
              { name: 'Prescription Trends', href: `/dashboard/doctor/analytics/prescriptions`, icon: '💉' },
              { name: 'Performance Metrics', href: `/dashboard/doctor/analytics/performance`, icon: '⚡' },
            ]
          },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      
      case 'nurse':
        return [
          ...baseNav,
          { name: 'Patients', href: `/dashboard/nurse/patients`, icon: '👥' },
          { name: 'Case Sheets', href: `/dashboard/nurse/case-sheets`, icon: '📋' },
          { name: 'Vitals Monitoring', href: `/dashboard/nurse/vitals`, icon: '❤️' },
          { name: 'Task Management', href: `/dashboard/nurse/tasks`, icon: '✅' },
          { name: 'Medication Schedule', href: `/dashboard/nurse/medications`, icon: '💊' },
          { 
            name: 'Reports', 
            href: '/dashboard/nurse/reports', 
            icon: '📊',
            submenu: [
              { name: 'Shift Reports', href: `/dashboard/nurse/reports/shifts`, icon: '🕐' },
              { name: 'Patient Care Log', href: `/dashboard/nurse/reports/care-log`, icon: '📝' },
              { name: 'Incident Reports', href: `/dashboard/nurse/reports/incidents`, icon: '⚠️' },
            ]
          },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      
      case 'manager':
        return [
          ...baseNav,
          { name: 'Patients Overview', href: `/dashboard/manager/patients`, icon: '👥' },
          { name: 'Staff Management', href: `/dashboard/manager/staff`, icon: '👔' },
          { name: 'Bed Management', href: `/dashboard/manager/beds`, icon: '🛏️' },
          { name: 'Appointments', href: `/dashboard/manager/appointments`, icon: '📅' },
          { 
            name: 'Operations', 
            href: '/dashboard/manager/operations', 
            icon: '⚙️',
            submenu: [
              { name: 'Resource Allocation', href: `/dashboard/manager/operations/resources`, icon: '📦' },
              { name: 'Queue Management', href: `/dashboard/manager/operations/queues`, icon: '⏳' },
              { name: 'Capacity Planning', href: `/dashboard/manager/operations/capacity`, icon: '📊' },
            ]
          },
          { 
            name: 'Analytics', 
            href: '/dashboard/manager/analytics', 
            icon: '📊',
            submenu: [
              { name: 'Operational Metrics', href: `/dashboard/manager/analytics/operations`, icon: '⚡' },
              { name: 'Financial Reports', href: `/dashboard/manager/analytics/financial`, icon: '💰' },
              { name: 'Staff Performance', href: `/dashboard/manager/analytics/staff`, icon: '👔' },
              { name: 'Patient Satisfaction', href: `/dashboard/manager/analytics/satisfaction`, icon: '⭐' },
              { name: 'Bed Utilization', href: `/dashboard/manager/analytics/beds`, icon: '🛏️' },
            ]
          },
          { name: 'Reports', href: `/dashboard/manager/reports`, icon: '📈' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      
      case 'super_admin':
        return [
          ...baseNav,
          { name: 'All Regions', href: `/dashboard/super_admin/regions`, icon: '🌍' },
          { name: 'All Hospitals', href: `/dashboard/super_admin/hospitals`, icon: '🏥' },
          { name: 'User Management', href: `/dashboard/super_admin/users`, icon: '👥' },
          { name: 'Global Patients', href: `/dashboard/super_admin/patients`, icon: '🧑‍⚕️' },
          { 
            name: 'System Analytics', 
            href: '/dashboard/super_admin/analytics', 
            icon: '📊',
            submenu: [
              { name: 'Global Dashboard', href: `/dashboard/super_admin/analytics/global`, icon: '🌐' },
              { name: 'Regional Performance', href: `/dashboard/super_admin/analytics/regional`, icon: '🗺️' },
              { name: 'Hospital Metrics', href: `/dashboard/super_admin/analytics/hospitals`, icon: '🏥' },
              { name: 'User Analytics', href: `/dashboard/super_admin/analytics/users`, icon: '👥' },
              { name: 'Patient Statistics', href: `/dashboard/super_admin/analytics/patients`, icon: '📈' },
              { name: 'Financial Overview', href: `/dashboard/super_admin/analytics/financial`, icon: '💰' },
              { name: 'System Health', href: `/dashboard/super_admin/analytics/system`, icon: '🔧' },
              { name: 'AI Insights', href: `/dashboard/super_admin/analytics/ai`, icon: '🤖' },
            ]
          },
          { 
            name: 'Reports', 
            href: '/dashboard/super_admin/reports', 
            icon: '📈',
            submenu: [
              { name: 'Executive Reports', href: `/dashboard/super_admin/reports/executive`, icon: '📊' },
              { name: 'Compliance Reports', href: `/dashboard/super_admin/reports/compliance`, icon: '✅' },
              { name: 'Audit Logs', href: `/dashboard/super_admin/audit-logs`, icon: '📝' },
            ]
          },
          { name: 'System Settings', href: '/dashboard/settings', icon: '⚙️' },
        ]
      
      case 'regional_admin':
        return [
          ...baseNav,
          { name: 'Hospitals', href: `/dashboard/regional_admin/hospitals`, icon: '🏥' },
          { name: 'User Management', href: `/dashboard/regional_admin/users`, icon: '👥' },
          {
            name: 'Analytics',
            href: `/dashboard/regional_admin/analytics`,
            icon: '📊',
            submenu: [
              { name: 'Overview', href: `/dashboard/regional_admin/analytics`, icon: '🌐' },
              { name: 'Hospital Metrics', href: `/dashboard/regional_admin/analytics?view=hospitals`, icon: '🏥' },
              { name: 'Bed Utilization', href: `/dashboard/regional_admin/analytics?view=beds`, icon: '🛏️' },
              { name: 'Staff Coverage', href: `/dashboard/regional_admin/analytics?view=staff`, icon: '👩‍⚕️' },
            ],
          },
          {
            name: 'Reports',
            href: `/dashboard/regional_admin/reports`,
            icon: '📈',
            submenu: [
              { name: 'Monthly Summary', href: `/dashboard/regional_admin/reports?type=monthly`, icon: '📅' },
              { name: 'Compliance', href: `/dashboard/regional_admin/reports?type=compliance`, icon: '✅' },
              { name: 'Export Center', href: `/dashboard/regional_admin/reports?type=export`, icon: '⬇️' },
            ],
          },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
          { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
        ]
      
      case 'admin':
        return [
          ...baseNav,
          { name: 'My Region', href: `/dashboard/admin/region`, icon: '📍' },
          { name: 'Hospitals', href: `/dashboard/admin/hospitals`, icon: '🏥' },
          { name: 'User Management', href: `/dashboard/admin/users`, icon: '👥' },
          { name: 'Patients', href: `/dashboard/admin/patients`, icon: '🧑‍⚕️' },
          { 
            name: 'Analytics', 
            href: '/dashboard/admin/analytics', 
            icon: '📊',
            submenu: [
              { name: 'Regional Overview', href: `/dashboard/admin/analytics/overview`, icon: '🗺️' },
              { name: 'Hospital Performance', href: `/dashboard/admin/analytics/hospitals`, icon: '🏥' },
              { name: 'User Analytics', href: `/dashboard/admin/analytics/users`, icon: '👥' },
              { name: 'Patient Metrics', href: `/dashboard/admin/analytics/patients`, icon: '📈' },
              { name: 'Financial Reports', href: `/dashboard/admin/analytics/financial`, icon: '💰' },
              { name: 'Operational Efficiency', href: `/dashboard/admin/analytics/operations`, icon: '⚡' },
            ]
          },
          { 
            name: 'Reports', 
            href: '/dashboard/admin/reports', 
            icon: '📈',
            submenu: [
              { name: 'Monthly Reports', href: `/dashboard/admin/reports/monthly`, icon: '📅' },
              { name: 'Compliance', href: `/dashboard/admin/reports/compliance`, icon: '✅' },
              { name: 'Audit Logs', href: `/dashboard/admin/audit-logs`, icon: '📝' },
            ]
          },
          { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
        ]
      
      case 'patient':
        return [
          ...baseNav,
          { name: 'My Health Dashboard', href: `/dashboard/patient/health`, icon: '❤️' },
          { name: 'Medical Records', href: `/dashboard/patient/records`, icon: '📋' },
          { name: 'Appointments', href: `/dashboard/patient/appointments`, icon: '📅' },
          { name: 'Prescriptions', href: `/dashboard/patient/prescriptions`, icon: '💊' },
          { name: 'Lab Reports', href: `/dashboard/patient/lab-reports`, icon: '🔬' },
          { name: 'Billing & Insurance', href: `/dashboard/patient/billing`, icon: '💰' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      
      case 'pharmacist':
        return [
          ...baseNav,
          { name: 'Prescriptions Queue', href: `/dashboard/pharmacist/prescriptions`, icon: '💊' },
          { name: 'Inventory Management', href: `/dashboard/pharmacist/inventory`, icon: '📦' },
          { name: 'Orders & Procurement', href: `/dashboard/pharmacist/orders`, icon: '🛒' },
          { name: 'Drug Information', href: `/dashboard/pharmacist/drugs`, icon: '💉' },
          { 
            name: 'Analytics', 
            href: '/dashboard/pharmacist/analytics', 
            icon: '📊',
            submenu: [
              { name: 'Dispensing Metrics', href: `/dashboard/pharmacist/analytics/dispensing`, icon: '📈' },
              { name: 'Inventory Trends', href: `/dashboard/pharmacist/analytics/inventory`, icon: '📦' },
              { name: 'Cost Analysis', href: `/dashboard/pharmacist/analytics/costs`, icon: '💰' },
            ]
          },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      
      case 'lab_tech':
        return [
          ...baseNav,
          { name: 'Test Queue', href: `/dashboard/lab_tech/lab-tests`, icon: '🔬' },
          { name: 'Pending Tests', href: `/dashboard/lab_tech/pending`, icon: '⏳' },
          { name: 'Results Entry', href: `/dashboard/lab_tech/results`, icon: '📄' },
          { name: 'Quality Control', href: `/dashboard/lab_tech/quality`, icon: '✅' },
          { 
            name: 'Reports', 
            href: '/dashboard/lab_tech/reports', 
            icon: '📊',
            submenu: [
              { name: 'Test Statistics', href: `/dashboard/lab_tech/reports/statistics`, icon: '📈' },
              { name: 'Turnaround Time', href: `/dashboard/lab_tech/reports/turnaround`, icon: '⏱️' },
              { name: 'Equipment Status', href: `/dashboard/lab_tech/reports/equipment`, icon: '🔧' },
            ]
          },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      
      case 'reception':
        return [
          ...baseNav,
          { name: 'Patient Check-In', href: `/dashboard/reception/check-in`, icon: '✅' },
          { name: 'Patient Directory', href: `/dashboard/reception/patients`, icon: '👥' },
          { name: 'Appointments', href: `/dashboard/reception/appointments`, icon: '📅' },
          { name: 'Discharge Requests', href: `/dashboard/reception/discharge-requests`, icon: '🚪' },
          { name: 'Billing & Payments', href: `/dashboard/reception/billing`, icon: '💰' },
          { name: 'Insurance Verification', href: `/dashboard/reception/insurance`, icon: '🏛️' },
          { name: 'Waiting Room', href: `/dashboard/reception/waiting-room`, icon: '⏳' },
          { name: 'Messages', href: '/dashboard/messages', icon: '💬' },
        ]
      
      default:
        return baseNav
    }
  }

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const navigation = useMemo(() => getNavigationForRole(), [roleName])
  // Derive primary quick links (exclude the root Dashboard), keep first 4
  const primaryQuickLinks = useMemo(() => {
    return navigation
      .filter((item) => item.name !== 'Dashboard' && item.href)
      .slice(0, 4)
  }, [navigation])

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
            icon: subitem.icon,
            group: item.name,
            keywords: [item.name, subitem.name, roleName.replace('_', ' ')],
            parentMenuName: item.name,
          })
        })
      }
    })

    return items
  }, [navigation, roleName])

  const handleCommandSelect = (item: CommandItem) => {
    setIsCommandOpen(false)
    setShowProfileMenu(false)

    if (item.parentMenuName) {
      setExpandedMenus((prev) =>
        prev.includes(item.parentMenuName as string)
          ? prev
          : [...prev, item.parentMenuName as string]
      )
      if (!sidebarOpen) {
        setSidebarOpen(true)
      }
    }

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

  // Load pending discharge requests count for reception role
  useEffect(() => {
    let cancelled = false
    async function loadReceptionDischargeCount() {
      if (roleName !== 'reception') return
      if (!token || !user?.hospital_id) return
      try {
        const caseSheets = await apiClient.getCaseSheets(token, { hospitalId: user.hospital_id, limit: 100 })
        const pendingLists = await Promise.all(
          caseSheets.map(async (cs: any) => {
            try {
              const p = await apiClient.getPendingAcknowledgments(token, cs.id)
              const matches = (p?.pending_events || []).filter((pe: any) => pe?.event?.event_type === 'discharge_request')
              return matches.length
            } catch {
              return 0
            }
          })
        )
        if (!cancelled) setReceptionDischargeCount(pendingLists.reduce((a, b) => a + b, 0))
      } catch {
        if (!cancelled) setReceptionDischargeCount(0)
      }
    }
    loadReceptionDischargeCount()
    return () => { cancelled = true }
  }, [roleName, token, user?.hospital_id])

  const toggleMenu = (menuName: string) => {
    if (!sidebarOpen) {
      setSidebarOpen(true)
      setExpandedMenus((prev) => (prev.includes(menuName) ? prev : [...prev, menuName]))
      return
    }

    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((m) => m !== menuName)
        : [...prev, menuName]
    )
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const isActiveLink = (href?: string) => {
    if (!href || href === '#') return false
    const [hrefPath] = href.split('?')
    return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`)
  }

  return (
    <div
      className="min-h-screen relative transition-colors duration-300"
      style={pageBackgroundStyle}
    >
      {/* Loading Bar */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 z-[100] shadow-lg"
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 1, transformOrigin: 'right', opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? (compact ? 240 : 280) : (compact ? 72 : 80) }}
  className={`fixed left-0 top-0 h-full ${sidebarClass} shadow-2xl z-40 transition-all duration-300 border-r ${isDark ? 'border-blue-500/30' : 'border-blue-500/15'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className={`${compact ? 'h-16 px-4' : 'h-20 px-6'} flex items-center justify-between border-b border-white/20`}>
            <motion.div 
              initial={false}
              animate={{ opacity: sidebarOpen ? 1 : 0 }}
              className={`flex items-center ${compact ? 'space-x-2' : 'space-x-3'}`}
            >
              <div className={`${compact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} flex items-center justify-center overflow-hidden shadow-lg ${brandLogoUrl ? (isDark ? 'bg-slate-900/60' : 'bg-white/80') : 'bg-white/20 backdrop-blur-xl'}`}>
                {brandLogoUrl ? (
                  <Image
                    src={brandLogoUrl}
                    alt={brandAlt}
                    width={compact ? 32 : 40}
                    height={compact ? 32 : 40}
                    className="w-full h-full object-cover"
                    priority={false}
                    unoptimized
                  />
                ) : (
                  <span className={`${compact ? 'text-xl' : 'text-2xl'}`}>{roleTheme.icon}</span>
                )}
              </div>
              {sidebarOpen && (
                <div className="text-white">
                  <div className={`font-bold ${compact ? 'text-base' : 'text-lg'}`}>{region?.name || 'HASS'}</div>
                  <div className="text-xs opacity-80 capitalize">{roleName.replace('_', ' ')}</div>
                </div>
              )}
            </motion.div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg flex items-center justify-center text-white transition-all ${sidebarToggleClass}`}
            >
              {sidebarOpen ? '«' : '»'}
            </button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto ${compact ? 'py-4 px-2' : 'py-6 px-3'} space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent`}>
            {navigation.map((item) => {
              const hasSubmenu = Boolean(item.submenu?.length)
              const submenuIsActive = hasSubmenu && item.submenu!.some((subitem) => isActiveLink(subitem.href))
              const itemIsActive = isActiveLink(item.href) || submenuIsActive
              const menuSlug = slugify(item.name)
              const itemHref = item.href || item.submenu?.[0]?.href || '#'

              if (hasSubmenu) {
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={itemHref}
                        prefetch={false}
                        data-testid={`nav-${roleName}-${menuSlug}`}
                        onClick={handleNavClick(itemHref)}
                        className={`flex flex-1 items-center ${compact ? 'rounded-lg' : 'rounded-xl'} ${compact ? 'py-2' : 'py-3'} transition-all ${
                          sidebarOpen ? `${compact ? 'px-3 gap-2 text-sm' : 'px-4 gap-3'}` : 'px-0 justify-center'
                        } ${itemIsActive ? navActiveClass : navHoverClass}`}
                      >
                        <span className={`${compact ? 'text-lg' : 'text-xl'}`}>{item.icon}</span>
                        {sidebarOpen && (
                          <>
                            <span className={`${compact ? 'font-medium text-sm' : 'font-medium'}`}>{item.name}</span>
                            {roleName === 'reception' && item.name === 'Discharge Requests' && receptionDischargeCount > 0 && (
                              <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-white/90 text-orange-700' : 'bg-white text-orange-700'} border border-orange-200`}>
                                {receptionDischargeCount}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.name)}
                        data-testid={`nav-menu-${menuSlug}-toggle`}
                        className={`flex ${compact ? 'h-8 w-8' : 'h-9 w-9'} items-center justify-center rounded-lg text-white transition ${sidebarToggleClass}`}
                        aria-label={`Toggle ${item.name} menu`}
                      >
                        <svg
                          className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} transition-transform ${
                            expandedMenus.includes(item.name) || submenuIsActive ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <AnimatePresence>
                      {(expandedMenus.includes(item.name) || submenuIsActive) && sidebarOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={`${compact ? 'ml-3' : 'ml-4'} mt-1 space-y-1 overflow-hidden`}
                        >
                          {item.submenu!.map((subitem) => {
                            const subSlug = slugify(subitem.name)
                            return (
                              <Link
                                key={subitem.name}
                                href={subitem.href}
                                prefetch={false}
                                data-testid={`nav-${roleName}-${menuSlug}-${subSlug}`}
                                onClick={handleNavClick(subitem.href)}
                                className={`flex items-center space-x-3 ${compact ? 'px-3 py-1.5 rounded-md text-xs' : 'px-4 py-2 rounded-lg text-sm'} transition-all ${
                                  isActiveLink(subitem.href) ? submenuActiveClass : submenuHoverClass
                                }`}
                              >
                                <span className={`${compact ? 'text-sm' : 'text-base'}`}>{subitem.icon}</span>
                                <span>{subitem.name}</span>
                              </Link>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }

              return (
                <div key={item.name}>
                  <Link
                    href={itemHref}
                    prefetch={false}
                    data-testid={`nav-${roleName}-${menuSlug}`}
                    onClick={handleNavClick(itemHref)}
                    className={`flex items-center ${compact ? 'rounded-lg' : 'rounded-xl'} ${compact ? 'py-2' : 'py-3'} transition-all ${
                      sidebarOpen ? `${compact ? 'px-3 gap-2 text-sm' : 'px-4 gap-3'}` : 'px-0 justify-center'
                    } ${itemIsActive ? navActiveClass : navHoverClass}`}
                  >
                    <span className={`${compact ? 'text-lg' : 'text-xl'}`}>{item.icon}</span>
                    {sidebarOpen && <span className={`${compact ? 'font-medium text-sm' : 'font-medium'}`}>{item.name}</span>}
                  </Link>
                </div>
              )
            })}
          </nav>

          {/* User Section */}
          <div className={`p-3 border-t ${userSectionBorderClass}`}>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`w-full flex items-center ${compact ? 'space-x-2 px-2 py-1.5 rounded-lg' : 'space-x-3 px-3 py-2 rounded-xl'} transition-all text-white ${profileHoverClass}`}
              >
                {user?.profile_picture_url ? (
                  <Image
                    src={user.profile_picture_url}
                    alt={profileImageAlt}
                    width={compact ? 32 : 40}
                    height={compact ? 32 : 40}
                    className={`${compact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} object-cover border border-white/30`}
                    priority={false}
                    unoptimized
                  />
                ) : (
                  <div className={`${compact ? 'w-8 h-8 rounded-lg text-xs' : 'w-10 h-10 rounded-xl text-sm'} flex items-center justify-center font-bold ${avatarBgClass}`}>
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                )}
                {sidebarOpen && (
                  <div className="flex-1 text-left">
                    <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold truncate`}>{user?.first_name} {user?.last_name}</div>
                    <div className="text-xs opacity-75 truncate">{user?.email}</div>
                  </div>
                )}
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 glass bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                  >
                    <Link
                      href="/dashboard/profile"
                      prefetch={false}
                      onClick={handleNavClick('/dashboard/profile')}
                      className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} flex items-center space-x-3 hover:bg-gray-50 transition-colors`}
                    >
                      <span>👤</span>
                      <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>Profile</span>
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      prefetch={false}
                      onClick={handleNavClick('/dashboard/settings')}
                      className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} flex items-center space-x-3 hover:bg-gray-50 transition-colors`}
                    >
                      <span>⚙️</span>
                      <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>Settings</span>
                    </Link>
                    <button onClick={handleLogout} className={`w-full flex items-center space-x-3 ${compact ? 'px-3 py-2' : 'px-4 py-3'} hover:bg-red-50 text-red-600 transition-colors`}>
                      <span>🚪</span>
                      <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarOpen ? (compact ? 240 : 280) : (compact ? 72 : 80) }}
        className="transition-all duration-300"
      >
        {/* Top Bar */}
        <div className={`${compact ? 'h-14' : 'h-20'} backdrop-blur-xl border-b sticky top-0 z-30 shadow-sm ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-200'
        }`}>
          <div className={`h-full ${compact ? 'px-4' : 'px-8'} flex items-center justify-between`}>
            {/* Back + Breadcrumbs */}
            <div className={`flex items-center ${compact ? 'space-x-2 text-xs' : 'space-x-3 text-sm'} ${isDark ? 'text-gray-300' : ''}`}>
              <button
                onClick={() => router.back()}
                className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                aria-label="Go back"
                title="Go back"
              >
                <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${isDark ? 'text-gray-300' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Home</span>
              <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>/</span>
              <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold capitalize`}>{roleName.replace('_', ' ')}</span>
            </div>

            {/* Right Actions */}
            <div className={`flex items-center ${compact ? 'space-x-2' : 'space-x-4'}`}>
              {/* Compact toggle */}
              <button
                type="button"
                onClick={toggleCompact}
                className={`rounded-xl ${compact ? 'p-2' : 'p-3'} transition-colors ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label={compact ? 'Switch to comfortable layout' : 'Switch to compact layout'}
                title={compact ? 'Compact: ON' : 'Compact: OFF'}
              >
                {/* grid/density icon */}
                <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
                </svg>
              </button>
              {/* Theme toggle styled like home/login experiences */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`${compact ? 'p-2' : 'p-3'} rounded-xl transition-colors ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700 text-yellow-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* High Contrast toggle */}
              <button
                type="button"
                onClick={toggleHighContrast}
                className={`${compact ? 'p-2' : 'p-3'} rounded-xl transition-colors ${
                  isDark ? (highContrast ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200') : (highContrast ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')
                }`}
                aria-label={highContrast ? 'Disable high contrast' : 'Enable high contrast'}
                title={highContrast ? 'High contrast: ON' : 'High contrast: OFF'}
              >
                <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2v16a8 8 0 010-16z" />
                </svg>
              </button>

              {/* Search */}
              <button
                type="button"
                onClick={() => setIsCommandOpen(true)}
                className={`hidden md:flex items-center gap-2 rounded-xl bg-gray-100 ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700`}
                title="Search navigation (Ctrl+K)"
              >
                <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-500 dark:text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search...</span>
                <span className="ml-3 hidden items-center gap-1 rounded bg-white/60 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-white/10 dark:text-gray-300 lg:inline-flex">
                  Ctrl
                  <kbd className="font-semibold">K</kbd>
                </span>
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* Removed non-functional Quick Action button */}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className={`${compact ? 'p-4' : 'p-8'}`}>
          <div className="max-w-7xl mx-auto">
            {/* Universal primary quick links for all roles */}
            <div className="sticky top-16 z-10 mb-4">
              <div className={`flex gap-2 overflow-x-auto no-scrollbar rounded-xl border ${
                isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-gray-200 backdrop-blur-md'
              } p-2`}>
                {primaryQuickLinks.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={false}
                    onClick={handleNavClick(item.href)}
                    className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isDark
                        ? 'border-slate-700 bg-slate-800/60 text-gray-200 hover:bg-slate-700'
                        : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                    aria-label={item.name}
                    title={item.name}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
            {children}
          </div>
        </main>
      </motion.div>
      <NavCommandPalette
        isOpen={isCommandOpen}
        items={commandItems}
        onClose={() => setIsCommandOpen(false)}
        onSelect={handleCommandSelect}
      />
    </div>
  )
}
