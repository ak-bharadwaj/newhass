'use client'

import { motion } from 'framer-motion'
import { useRegionalBranding } from '@/contexts/RegionalBrandingContext'
import { useRegionalTheme } from '@/contexts/RegionalThemeContext'
import Image from 'next/image'

export function RegionalBanner() {
  // Visual theme colors from the local branding context (keeps professional palette consistent)
  const { branding, getThemeColors } = useRegionalBranding()
  const theme = getThemeColors()

  // Real logo/banner and region name from backend-driven regional theme
  const { theme: regionalTheme, region } = useRegionalTheme()
  const logoUrl = regionalTheme?.logo_url || branding.logoUrl
  const bannerImageUrl = regionalTheme?.banner_url
  const hospitalName = region?.name || branding.hospitalName
  const hospitalTagline = branding.hospitalTagline

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl shadow-lg mb-6 ${theme.bgColor}`}
    >
      {/* Banner image layer (if provided by regional theme) */}
      {bannerImageUrl && (
        <Image
          src={bannerImageUrl}
          alt={`${hospitalName} banner`}
          fill
          className="object-cover opacity-10"
          unoptimized
          priority={false}
        />
      )}

      {/* Background Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${branding.primaryColor} ${bannerImageUrl ? 'opacity-20' : 'opacity-10'}`} />
      
      <div className="relative px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Hospital Info */}
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white shadow-md">
                <Image
                  src={logoUrl}
                  alt={hospitalName}
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
              </div>
            ) : (
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${branding.primaryColor} shadow-md flex items-center justify-center`}>
                <span className="text-3xl">🏥</span>
              </div>
            )}
            
            <div>
              <h2 className={`text-2xl font-bold bg-gradient-to-r ${branding.primaryColor} bg-clip-text text-transparent`}>
                {hospitalName}
              </h2>
              {hospitalTagline && (
                <p className="text-sm text-gray-600">{hospitalTagline}</p>
              )}
            </div>
          </div>

          {/* Right: Banner Text */}
          {branding.bannerText && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`hidden md:block px-6 py-3 rounded-xl bg-gradient-to-r ${branding.secondaryColor} text-white shadow-lg`}
            >
              <p className="text-sm font-semibold">{branding.bannerText}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${branding.accentColor} opacity-5 rounded-full blur-3xl`} />
      <div className={`absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr ${branding.secondaryColor} opacity-5 rounded-full blur-2xl`} />
    </motion.div>
  )
}
