import type { Location } from './const'

/** Keep in sync with the theme bootstrap script in apps/web/index.html */
export const APP_PREFERENCES_THEME_STORAGE_KEY = 'bookbook.theme'

export const APP_PREFERENCES_LOCATION_STORAGE_KEY = 'bookbook.location'

export type StoredThemeMode = 'light' | 'dark'

function safeGetLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetLocalStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode / disabled storage */
  }
}

export function readLocationFromRaw(raw: string | null): Location | null {
  if (raw === 'daikanyama' || raw === 'okinawa') {
    return raw
  }
  return null
}

export function readThemeModeFromRaw(raw: string | null): StoredThemeMode | null {
  if (raw === 'light' || raw === 'dark') {
    return raw
  }
  return null
}

export function resolveSystemThemeMode(): StoredThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function loadStoredLocation(): Location | null {
  return readLocationFromRaw(safeGetLocalStorageItem(APP_PREFERENCES_LOCATION_STORAGE_KEY))
}

export function loadStoredThemeMode(): StoredThemeMode | null {
  return readThemeModeFromRaw(safeGetLocalStorageItem(APP_PREFERENCES_THEME_STORAGE_KEY))
}

/** Effective theme on load: explicit stored value, otherwise OS preference */
export function resolveInitialThemeMode(): StoredThemeMode {
  return loadStoredThemeMode() ?? resolveSystemThemeMode()
}

export function persistLocation(location: Location): void {
  safeSetLocalStorageItem(APP_PREFERENCES_LOCATION_STORAGE_KEY, location)
}

export function persistThemeMode(mode: StoredThemeMode): void {
  safeSetLocalStorageItem(APP_PREFERENCES_THEME_STORAGE_KEY, mode)
}
