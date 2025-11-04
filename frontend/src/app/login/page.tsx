"use client"
// Ensure this route is always dynamically rendered to avoid static 404 during build
export const dynamic = 'force-dynamic'
// Disable caching for this page to avoid ISR/static artifacts in production
export const revalidate = 0

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Use ThemeContext in a hydration-safe way
  const { isDark, mode, colorScheme, setMode } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [focusField, setFocusField] = useState<'email' | 'password' | null>(null)
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null)
  const demoIndexRef = useRef(0)
  const demoPosRef = useRef(0)
  const [typedPlaceholder, setTypedPlaceholder] = useState('you@hospital.com')

  const sampleEmails = ['doctor@hospital.com', 'nurse@hospital.com', 'admin@region.gov']

  const stopDemo = () => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current)
      demoTimerRef.current = null
    }
  }

  const startDemo = () => {
    // Only run when user hasn't interacted and email is empty and not focusing email
    if (userInteracted || email || focusField === 'email') return
    stopDemo()
    const tick = () => {
      const i = demoIndexRef.current % sampleEmails.length
      const target = sampleEmails[i]
      const pos = demoPosRef.current
      if (pos <= target.length) {
        setTypedPlaceholder(target.slice(0, pos))
        demoPosRef.current = pos + 1
        demoTimerRef.current = setTimeout(tick, 80)
      } else {
        // pause then reset and move to next sample
        demoTimerRef.current = setTimeout(() => {
          setTypedPlaceholder('')
          demoPosRef.current = 0
          demoIndexRef.current = i + 1
          demoTimerRef.current = setTimeout(tick, 300)
        }, 900)
      }
    }
    demoTimerRef.current = setTimeout(tick, 500)
  }

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    const wasRemembered = localStorage.getItem('rememberMe') === 'true'
    if (savedEmail && wasRemembered) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])
  // Persist remember me immediately to make it feel reliable
  useEffect(() => {
    try {
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('rememberedEmail')
      }
    } catch {}
  }, [rememberMe, email])

  // Prevent SSR/CSR hydration mismatch on theme-dependent UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Demo typing controller
  useEffect(() => {
    if (!mounted) return
    startDemo()
    return stopDemo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, userInteracted, email, focusField])

  const handleToggleTheme = () => {
    if (mode === 'dark' || colorScheme === 'dark') {
      setMode('light')
    } else {
      setMode('dark')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    try {
      // Save or clear remembered email (email prefilling)
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberedEmail')
        localStorage.removeItem('rememberMe')
      }

      // Perform real login; AuthContext persists tokens in localStorage
      await login(email, password, otpCode || undefined)
      // Redirect handled by AuthContext based on user role
    } catch (err) {
      console.error('Login failed', err)
      const msg = (err as any)?.message?.toString?.() || 'Unable to sign in'
      // Detect common cases for friendlier UX
      if (/two-factor authentication required/i.test(msg)) {
        setOtpRequired(true)
        setErrorMsg('Two‑factor authentication is enabled. Enter your 6‑digit code to continue.')
      } else if (/incorrect email or password/i.test(msg)) {
        setErrorMsg('Incorrect email or password. Please try again.')
      } else if (/failed to fetch|network/i.test(msg)) {
        setErrorMsg('Can’t reach the server. Ensure the backend is running on port 8000 and retry.')
      } else {
        setErrorMsg(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Choose accessible, contrasting palettes for light vs dark
  const leftText = isDark ? 'text-white' : 'text-slate-900'
  const leftSub = isDark ? 'text-gray-300' : 'text-slate-700'
  const cardBg = isDark ? 'bg-gray-900/95' : 'bg-white'
  const cardText = isDark ? 'text-white' : 'text-slate-900'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
  const btnBg = isDark ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'

  if (!mounted) return null

  return (
    <div
      className="min-h-screen p-6 flex items-center justify-center"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%)'
      }}
    >
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Top: Professional badge to match Home */}
        <motion.div 
          className="lg:col-span-2 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${
            isDark ? 'bg-gray-900/60 border-gray-700/70' : 'bg-white/80 border-gray-200'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Secure Healthcare Access</span>
          </div>
        </motion.div>

  {/* Left: Brand / Why / Contact - Concise & Professional */}
  <aside className={`hidden lg:block p-10 rounded-3xl shadow-2xl backdrop-blur-xl border ${isDark ? 'bg-gray-900/60 border-gray-700/50' : 'bg-white/90 border-gray-200'}`} aria-labelledby="about-heading">
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isDark ? 'bg-indigo-600' : 'bg-blue-600'}`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 id="about-heading" className={`text-3xl font-extrabold ${leftText}`}>Hospital Automation System</h2>
              <p className={`text-base mt-1 ${leftSub}`}>Enterprise Healthcare Management Platform</p>
            </div>
          </div>

          <section className={`mb-8 p-6 rounded-2xl ${isDark ? 'bg-gray-800/50' : 'bg-blue-50'}`} aria-labelledby="why-heading">
            <h3 id="why-heading" className={`font-bold text-xl mb-4 flex items-center gap-2 ${leftText}`}>
              <svg className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              Why HASS
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[{t:'Secure',c:'text-green-600',d:'End-to-end security'},{t:'Fast',c:'text-blue-600',d:'Streamlined workflows'},{t:'Reliable',c:'text-purple-600',d:'24/7 operations'}].map((i) => (
                <div key={i.t} className={`rounded-xl p-3 text-center ${isDark ? 'bg-gray-900/50' : 'bg-white'}`}>
                  <div className={`text-sm font-bold ${isDark ? 'text-white' : i.c}`}>{i.t}</div>
                  <div className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs`}>{i.d}</div>
                </div>
              ))}
            </div>
          </section>

          <section className={`p-6 rounded-2xl border-2 ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'}`} aria-labelledby="contact-heading">
            <h4 id="contact-heading" className={`font-bold text-lg mb-4 flex items-center gap-2 ${leftText}`}>
              <svg className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Need Help?
            </h4>
            <div className={`space-y-3 text-sm ${leftSub}`}>
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <a href="mailto:support@hospital-automation.com" className={`underline ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'}`}>support@hospital-automation.com</a>
              </p>
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <a href="tel:+18001234567" className={`underline ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'}`}>+1 (800) 123-4567</a>
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                Available 24/7 • Average response time: &lt;30 min
              </p>
            </div>
          </section>
        </aside>

        {/* Right: Login card - Enhanced Professional Design */
        }
        <main className="flex items-center justify-center">
          <div className={`w-full max-w-md p-10 rounded-3xl shadow-2xl border-2 backdrop-blur-xl ${isDark ? `${cardBg} border-gray-700` : `${cardBg} border-gray-200`}`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className={`text-3xl font-extrabold ${cardText}`}>Welcome Back</h1>
                <p className={`text-base mt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Sign in to access your dashboard</p>
              </div>
              <button 
                onClick={handleToggleTheme} 
                aria-label="Toggle theme" 
                className={`p-3 rounded-xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {isDark ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Subtle emoji reaction */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end -mt-6 mb-4"
            >
              <span className="text-2xl select-none" aria-hidden>
                {focusField === 'password' ? '🙈' : focusField === 'email' ? '👀' : '🙂'}
              </span>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className={`p-3 rounded-lg border text-sm ${isDark ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`} role="alert">
                  {errorMsg}
                </div>
              )}
              <div>
                <label htmlFor="email" className={`block text-sm font-semibold mb-2 ${cardText}`}>Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input 
                    id="email"
                    type="email"
                    value={email} 
                    onChange={(e) => { setEmail(e.target.value); setUserInteracted(true) }} 
                    onFocus={() => setFocusField('email')}
                    onBlur={() => setFocusField(null)}
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${inputBg} ${isDark ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder={typedPlaceholder || 'you@hospital.com'} 
                    data-testid="login-email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-semibold mb-2 ${cardText}`}>Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input 
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password} 
                    onChange={(e) => { setPassword(e.target.value); setUserInteracted(true) }} 
                    onFocus={() => setFocusField('password')}
                    onBlur={() => setFocusField(null)}
                    className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${inputBg} ${isDark ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                    data-testid="login-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {otpRequired && (
                <div>
                  <label htmlFor="otp" className={`block text-sm font-semibold mb-2 ${cardText}`}>Two‑Factor Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c.828 0 1.5-.672 1.5-1.5S12.828 8 12 8s-1.5.672-1.5 1.5S11.172 11 12 11zm0 0v5m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      id="otp"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${inputBg} ${isDark ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-blue-500 focus:border-blue-500'}`}
                      placeholder="123456"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`w-4 h-4 rounded border-2 transition-colors cursor-pointer ${isDark ? 'bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-gray-300 text-blue-600 focus:ring-blue-500'}`}
                  />
                  <label htmlFor="remember-me" className={`ml-2 text-sm cursor-pointer ${cardText}`}>
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className={`text-sm font-medium underline ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'}`}>
                  Forgot password?
                </Link>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full text-white rounded-xl px-6 py-4 font-bold text-lg shadow-lg hover:shadow-xl transform transition-all ${btnBg} ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                data-testid="login-submit"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className={`mt-8 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'} text-center`}>
                Don't have an account? <Link href="/register" className={`font-bold underline ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'}`}>Create one now</Link>
              </p>
              <div className="mt-4 text-xs text-center">
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Demo users (if you seeded data):</p>
                <div className={`mt-1 inline-block px-3 py-1 rounded-lg ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  doctor@hass.example / doctor123 • nurse@hass.example / nurse123 • admin@hass.example / admin123
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom: Trust badges & stats to mirror Home */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[{label:'Active Users',value:'10K+'},{label:'Hospitals',value:'500+'},{label:'Uptime',value:'99.9%'},{label:'Support',value:'24/7'}].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 * i }}
                className={`text-center p-4 rounded-2xl border ${isDark ? 'bg-gray-900/70 border-gray-700' : 'bg-white/80 border-gray-200'}`}
              >
                <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{s.value}</div>
                <div className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <div className={`mx-auto max-w-4xl rounded-2xl p-6 text-center border ${isDark ? 'bg-gray-900/70 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
            <div className={`inline-flex flex-wrap items-center justify-center gap-x-10 gap-y-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="font-semibold">Trusted & Compliant:</span>
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-200">HIPAA</span>
              <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-200">SOC 2</span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-200">ISO 27001</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
