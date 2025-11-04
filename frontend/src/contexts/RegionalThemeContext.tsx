'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, type Region } from '@/lib/api';
import { useAuth } from './AuthContext';

interface RegionalTheme {
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
}

interface RegionalThemeContextType {
  theme: RegionalTheme | null;
  region: Region | null;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const RegionalThemeContext = createContext<RegionalThemeContextType | undefined>(
  undefined
);

export function useRegionalTheme() {
  const context = useContext(RegionalThemeContext);
  if (!context) {
    throw new Error('useRegionalTheme must be used within RegionalThemeProvider');
  }
  return context;
}

interface RegionalThemeProviderProps {
  children: ReactNode;
}

export function RegionalThemeProvider({ children }: RegionalThemeProviderProps) {
  const { user, token } = useAuth();
  const [theme, setTheme] = useState<RegionalTheme | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRegionalTheme = async () => {
    // Only load theme if user has a region
    if (!user?.region_id || !token) {
      setLoading(false);
      return;
    }

    try {
      // Fetch region details
      const regionData = await apiClient.getRegion(user.region_id, token);
      setRegion(regionData);

      // Extract theme settings
      if (regionData.theme_settings) {
        setTheme(regionData.theme_settings as RegionalTheme);
      } else {
        // Default theme
        setTheme({
          primary_color: '#1976d2',
          secondary_color: '#dc004e',
        });
      }
    } catch (error) {
      console.error('Failed to load regional theme:', error);
      // Use default theme on error
      setTheme({
        primary_color: '#1976d2',
        secondary_color: '#dc004e',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshTheme = async () => {
    setLoading(true);
    await loadRegionalTheme();
  };

  useEffect(() => {
    loadRegionalTheme();
  }, [user?.region_id, token]);

  // Apply theme CSS variables to document root
  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;

    if (theme.primary_color) {
      root.style.setProperty('--color-primary', theme.primary_color);
    }

    if (theme.secondary_color) {
      root.style.setProperty('--color-secondary', theme.secondary_color);
    }

    if (theme.font_family) {
      root.style.setProperty('--font-family', theme.font_family);
    }
  }, [theme]);

  return (
    <RegionalThemeContext.Provider
      value={{ theme, region, loading, refreshTheme }}
    >
      {children}
    </RegionalThemeContext.Provider>
  );
}
