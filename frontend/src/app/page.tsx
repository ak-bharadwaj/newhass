'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const { mode, colorScheme, setMode } = useTheme()
  const isDark = colorScheme === 'dark'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fixed toggle function
  const handleToggleTheme = () => {
    if (mode === 'dark' || colorScheme === 'dark') {
      setMode('light')
    } else {
      setMode('dark')
    }
  }

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Intelligence',
      description: 'Advanced voice assistant, prescription validation, and drug interaction checking powered by machine learning',
    },
    {
      icon: '⚡',
      title: 'Real-Time Operations',
      description: 'Live notifications, bed management, and emergency alerts with server-sent events',
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Comprehensive dashboards with real-time insights, financial reports, and clinical analytics',
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'HIPAA-compliant with JWT authentication, role-based access control, and complete audit logs',
    },
    {
      icon: '🏥',
      title: 'Multi-Hospital Support',
      description: 'Manage multiple facilities with custom branding, regional settings, and centralized oversight',
    },
    {
      icon: '🔧',
      title: 'Workflow Automation',
      description: 'Streamline operations with automated processes, smart scheduling, and integrated communications',
    }
  ]

  const roles = [
    { name: 'Doctor', icon: '🩺', link: '/login', desc: 'Patient management & prescriptions' },
    { name: 'Nurse', icon: '👩‍⚕️', link: '/login', desc: 'Ward management & care tracking' },
    { name: 'Patient', icon: '🤒', link: '/register', desc: 'Appointments & medical records' },
    { name: 'Pharmacist', icon: '💊', link: '/login', desc: 'Medication & inventory' },
    { name: 'Lab Tech', icon: '🔬', link: '/login', desc: 'Test results & reports' },
    { name: 'Manager', icon: '👔', link: '/login', desc: 'Operations & analytics' },
    { name: 'Reception', icon: '📋', link: '/login', desc: 'Registration & scheduling' },
    { name: 'Admin', icon: '⚙️', link: '/login', desc: 'System configuration' }
  ]

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 border-b transition-colors ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>HASS</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}>Features</a>
              <a href="#roles" className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}>Roles</a>
              <a href="#about" className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}>About</a>
              <a href="/api/docs" target="_blank" className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}>Docs</a>
              
              {/* Theme Toggle */}
              <button
                onClick={handleToggleTheme}
                className={`p-2 rounded-md transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              <Link href="/login" className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                Sign In
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              <svg className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className={`md:hidden pb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
              <div className="flex flex-col space-y-2">
                <a href="#features" className={`px-4 py-2 text-sm rounded ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>Features</a>
                <a href="#roles" className={`px-4 py-2 text-sm rounded ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>Roles</a>
                <a href="#about" className={`px-4 py-2 text-sm rounded ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>About</a>
                <a href="/api/docs" target="_blank" className={`px-4 py-2 text-sm rounded ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>Docs</a>
                <button onClick={handleToggleTheme} className={`px-4 py-2 text-sm text-left rounded ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                  {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
                <Link href="/login" className={`px-4 py-2 text-sm rounded ${isDark ? 'text-gray-300 bg-gray-800' : 'text-gray-700 bg-gray-100'}`}>Sign In</Link>
                <Link href="/register" className="px-4 py-2 text-sm bg-blue-600 text-white rounded mx-4">Get Started</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`relative overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Background Pattern (behind content) */}
        <div className="absolute inset-0 opacity-10 -z-10 pointer-events-none">
          <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Trusted by Healthcare Professionals Worldwide
              </span>
            </motion.div>

            <h1 className={`text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Transform Your
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Healthcare Operations
              </span>
            </h1>
            
            <p className={`text-xl md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Intelligent automation, real-time insights, and enterprise security
              for modern hospitals. Manage patients, staff, and operations seamlessly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link 
                href="/register" 
                className="group px-8 py-4 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Free Trial
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link 
                href="/login" 
                className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all border-2 ${isDark ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-900 hover:bg-gray-50'}`}
              >
                Sign In
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-12 border-t border-gray-200 dark:border-gray-800">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className={`text-4xl font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>10K+</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Active Users</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className={`text-4xl font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>500+</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Hospitals</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className={`text-4xl font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>99.9%</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Uptime</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <div className={`text-4xl font-bold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>24/7</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Support</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={`py-24 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Everything You Need to Run a Modern Hospital
              </h2>
              <p className={`text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Comprehensive tools designed for healthcare professionals
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`group relative p-8 rounded-2xl border transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-900 border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10' 
                    : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-xl'
                }`}
              >
                <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
                {/* Decorative element */}
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-3xl opacity-0 group-hover:opacity-10 transition-opacity ${
                  isDark ? 'bg-blue-500' : 'bg-blue-600'
                }`}></div>
              </motion.div>
            ))}
          </div>

          {/* Trust Section */}
          <div className="mt-20 text-center">
            <div className={`inline-flex flex-wrap items-center justify-center gap-x-12 gap-y-6 p-8 rounded-2xl ${
              isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>SOC 2 Certified</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ISO 27001</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className={`py-24 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Built for Every Role
              </h2>
              <p className={`text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Tailored experiences for all healthcare professionals
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {roles.map((role, idx) => (
              <Link key={idx} href={role.link}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className={`group p-8 rounded-2xl border text-center transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10' 
                      : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-xl'
                  }`}
                >
                  <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {role.icon}
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {role.name}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {role.desc}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className={`py-24 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                About HASS
              </h2>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`p-10 rounded-2xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <p className={`text-lg mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Hospital Automation & Support System (HASS) is an enterprise-grade healthcare management platform
                designed to streamline hospital operations and improve patient care through intelligent automation.
              </p>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Our platform combines AI-powered features, real-time notifications, comprehensive analytics, and
                role-based dashboards to provide a complete solution for modern healthcare facilities.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Key Capabilities
                </h3>
                <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> AI-powered voice assistant
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Real-time notifications (SSE)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Prescription management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Bed & ward management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Laboratory integration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">✓</span> Financial analytics
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className={`p-6 rounded-xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Security & Compliance
                </h3>
                <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> HIPAA compliant
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Role-based access control
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Complete audit logging
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Data encryption
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Multi-factor authentication
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Regular security audits
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-24 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`relative overflow-hidden text-center p-16 rounded-3xl ${
              isDark 
                ? 'bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-gray-700' 
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100'
            }`}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full filter blur-3xl opacity-10"></div>
            
            <div className="relative">
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Ready to Transform Your Hospital?
              </h2>
              <p className={`text-xl mb-10 max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Join healthcare facilities worldwide using HASS to deliver better patient care
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/register" 
                  className="group px-10 py-4 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Free Trial
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link 
                  href="/api/docs" 
                  target="_blank" 
                  className={`px-10 py-4 text-lg font-semibold rounded-lg transition-all border-2 ${
                    isDark 
                      ? 'border-gray-600 text-white hover:bg-gray-800' 
                      : 'border-gray-300 text-gray-900 hover:bg-white'
                  }`}
                >
                  View Documentation
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-16 border-t ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🏥</div>
                <div>
                  <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    HASS
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Hospital Automation
                  </div>
                </div>
              </div>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Enterprise-grade healthcare management platform designed for modern hospitals.
              </p>
            </div>

            <div>
              <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Product
              </h3>
              <ul className={`space-y-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><Link href="#features" className="hover:text-blue-500 transition-colors">Features</Link></li>
                <li><Link href="#roles" className="hover:text-blue-500 transition-colors">Roles</Link></li>
                <li><Link href="/api/docs" className="hover:text-blue-500 transition-colors">API Docs</Link></li>
              </ul>
            </div>

            <div>
              <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Company
              </h3>
              <ul className={`space-y-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><Link href="#about" className="hover:text-blue-500 transition-colors">About</Link></li>
              </ul>
            </div>

            <div>
              <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Legal
              </h3>
              <ul className={`space-y-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><Link href="/privacy" className="hover:text-blue-500 transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-blue-500 transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              © {new Date().getFullYear()} HASS. All rights reserved.
            </div>

            <div className="flex gap-6">
                <Link href="/privacy" className={`text-xl hover:text-blue-500 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`} aria-label="Privacy Policy">
                  Privacy
                </Link>
                <Link href="/terms" className={`text-xl hover:text-blue-500 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`} aria-label="Terms of Service">
                  Terms
                </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
