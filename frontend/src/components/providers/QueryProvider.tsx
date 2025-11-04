"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

let client: QueryClient | null = null

function getClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          // Cache data longer to reduce refetch churn and UI jank
          staleTime: 300_000, // 5 minutes
          gcTime: 600_000,    // 10 minutes (TanStack v4)
          refetchOnWindowFocus: false,
          retry: 2,
        },
      },
    })
  }
  return client
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const qc = React.useMemo(() => getClient(), [])
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
