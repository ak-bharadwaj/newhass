/**
 * Authentication utilities
 */

const ACCESS_TOKEN_KEY = 'hass_access_token';
const ACCESS_TOKEN_EXP_KEY = 'hass_access_exp'; // epoch ms when access token expires
const REFRESH_TOKEN_KEY = 'hass_refresh_token';
const USER_KEY = 'hass_user';

export interface StoredUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  role_display_name: string;
  permissions: Record<string, boolean>;
}

// Token storage (localStorage for access token, handled by cookies for refresh)
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const getAccessExpiry = (): number | null => {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(ACCESS_TOKEN_EXP_KEY);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const setAccessExpiry = (epochMs: number): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_EXP_KEY, String(epochMs));
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXP_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// User storage
export const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: StoredUser): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Permission checking
export const hasPermission = (
  user: StoredUser | null,
  permission: string
): boolean => {
  if (!user || !user.permissions) return false;
  return user.permissions[permission] === true;
};

export const hasRole = (user: StoredUser | null, ...roles: string[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role_name);
};
