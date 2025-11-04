import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { RegionalThemeProvider } from '@/contexts/RegionalThemeContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { NotificationToastContainer } from '@/components/notifications/NotificationToast'
import { RegionalBrandingProvider } from '@/contexts/RegionalBrandingContext'
import PageTransition from '@/components/common/PageTransition'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Inter } from 'next/font/google'
import { UIProvider } from '@/components/providers/UIProvider'
import { SplashLoader } from '@/components/common/SplashLoader'
import { QueryProvider } from '@/components/providers/QueryProvider'
import AppFrame from '@/components/providers/AppFrame'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Hospital Automation System',
  description: 'Enterprise-grade hospital management and automation platform',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏥</text></svg>',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`antialiased ${inter.className}`}>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <RegionalThemeProvider>
                  <RegionalBrandingProvider>
                    <UIProvider>
                      <QueryProvider>
                        <ToastProvider>
                          <AppFrame>
                            {children}
                          </AppFrame>
                        </ToastProvider>
                      </QueryProvider>
                    </UIProvider>
                    {/* Global toast notifications */}
                    <NotificationToastContainer />
                  </RegionalBrandingProvider>
                </RegionalThemeProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
