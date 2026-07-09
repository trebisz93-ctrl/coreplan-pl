import { useEffect, useState, useCallback } from 'react';

export type CookieCategory = 'necessary' | 'functional' | 'analytics';

export interface CookieConsent {
  version: number;
  timestamp: string;
  necessary: true;
  functional: boolean;
  analytics: boolean;
}

const STORAGE_KEY = 'coreplan.cookieConsent';
export const CONSENT_VERSION = 1;

const readConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readConsent());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setConsent(readConsent());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback((functional: boolean, analytics: boolean) => {
    const next: CookieConsent = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true,
      functional,
      analytics,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConsent(next);
  }, []);

  const acceptAll = useCallback(() => save(true, true), [save]);
  const rejectNonEssential = useCallback(() => save(false, false), [save]);
  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
  }, []);

  return { consent, save, acceptAll, rejectNonEssential, reset };
};

export const hasAnalyticsConsent = (): boolean => {
  const c = readConsent();
  return !!c?.analytics;
};

export const hasFunctionalConsent = (): boolean => {
  const c = readConsent();
  return !!c?.functional;
};

export const openCookieSettings = () => {
  window.dispatchEvent(new CustomEvent('coreplan:open-cookie-settings'));
};