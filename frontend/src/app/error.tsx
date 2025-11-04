'use client'

import React from 'react'

// Global error boundary page for App Router
// Ensures we never show the generic "Application error" page
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-2xl mx-auto py-20 px-6 text-center">
          <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-6">An unexpected error occurred. Please try again.</p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-xl bg-primary-600 text-white px-5 py-2.5 shadow hover:bg-primary-700 transition"
          >
            Try again
          </button>
          {error?.digest && (
            <p className="mt-4 text-xs text-gray-400">Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  )
}
