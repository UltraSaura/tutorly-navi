import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { getLanguageFromCountry } from '@/utils/countryLanguageMapping';
import { useAuth } from '@/context/AuthContext';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { type SupportedLanguage, SUPPORTED_LANGUAGES } from '@/locales';

export const defaultLang = i18n.resolvedLanguage || 'en';

interface LanguageContextType {
  language: string;
  isLoading: boolean;
  changeLanguage: (lng: string) => void;
  setLanguageFromCountry: (countryCode: string) => void;
  detectLanguageNow: () => Promise<void>;
  resetLanguageDetection: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const SimpleLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t: translate, i18n: instance } = useTranslation();
  const language = instance.resolvedLanguage || instance.language || defaultLang;
  const languageRef = useRef(language);
  languageRef.current = language;
  const { user } = useAuth();
  const { detection, getLanguageFromDetection, detectCountry } = useCountryDetection();

  const setLanguage = (lng: string) => {
    if (!SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage)) return;
    languageRef.current = lng;
    void i18n.changeLanguage(lng);
  };

  useEffect(() => {
    localStorage.setItem('lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = i18n.dir(language);
  }, [language]);

  const changeLanguage = (lng: string) => {
    if (!SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage)) return;
    localStorage.setItem('languageManuallySet', 'true');
    localStorage.setItem('lang', lng);
    setLanguage(lng);
  };

  // Normalize a country input (handles names like "France" and codes like "fr"/"FR"/"FRA")
  const normalizeCountryCode = (input: string): string | null => {
    if (!input) return null;
    const trimmed = String(input).trim();
    // If 2-3 letters, use first two as ISO alpha-2 uppercased
    if (/^[A-Za-z]{2,3}$/.test(trimmed)) {
      return trimmed.slice(0, 2).toUpperCase();
    }
    const map: Record<string, string> = {
      'FRANCE': 'FR',
      'UNITED STATES': 'US',
      'UNITED STATES OF AMERICA': 'US',
      'USA': 'US',
      'CANADA': 'CA',
      'UNITED KINGDOM': 'GB',
      'UK': 'GB',
      'GREAT BRITAIN': 'GB',
      'GERMANY': 'DE',
      'ITALY': 'IT',
      'SPAIN': 'ES',
    };
    const upper = trimmed.toUpperCase();
    return map[upper] || null;
  };

  const setLanguageFromCountry = (countryCode: string) => {
    // Only auto-set language if user hasn't manually changed it
    const manuallySet = localStorage.getItem('languageManuallySet');
    
    console.log('setLanguageFromCountry called with:', countryCode);
    console.log('manuallySet flag:', manuallySet);
    console.log('current language:', language);
    
    if (manuallySet === 'true') {
      console.log('Language was manually set, not changing automatically');
      return; // User has manually set language, don't override
    }

    const normalized = normalizeCountryCode(countryCode) || countryCode?.toUpperCase?.() || countryCode;
    const detectedLanguage = getLanguageFromCountry(normalized);
    console.log('detected language from country (normalized=', normalized, '):', detectedLanguage);
    
    if (detectedLanguage !== language) {
      console.log('Changing language from', language, 'to', detectedLanguage);
      setLanguage(detectedLanguage);
      localStorage.setItem('lang', detectedLanguage);
      
      // Show notification about automatic language change
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: String(i18n.t('languageAutoSet', { lng: detectedLanguage, ns: 'interface' })),
          description: String(i18n.t('languageBasedOnCountry', { lng: detectedLanguage, ns: 'interface' })),
        });
      });
    } else {
      console.log('Language already matches detected language');
    }
  };

  const detectLanguageNow = async () => {
    try {
      const result = await detectCountry();
      if (result?.country) {
        setLanguageFromCountry(result.country);
      }
    } catch (e) {
      console.warn('detectLanguageNow failed', e);
    }
  };

  const resetLanguageDetection = async () => {
    localStorage.removeItem('languageManuallySet');
    // Prefer profile country, then current detection
    try {
      if (user?.id) {
        const { data } = await import('@/integrations/supabase/client').then(m => 
          m.supabase
            .from('users')
            .select('country')
            .eq('id', user.id)
            .single()
        );
        if (data?.country) {
          const norm = normalizeCountryCode(data.country) || data.country;
          setLanguageFromCountry(norm);
          return;
        }
      }
      if (detection.country) {
        setLanguageFromCountry(detection.country);
      }
    } catch (e) {
      console.warn('resetLanguageDetection failed', e);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const result = translate(key, params);
    return typeof result === 'string' ? result : key;
  };

  // Auto-detection never overrides an explicit language selection.
  useEffect(() => {
    let cancelled = false;
    const detectLanguageFromUser = async () => {
      // An explicit selection takes precedence over profile and country detection.
      if (localStorage.getItem('languageManuallySet') === 'true') return;

      let detectedLanguage = null;
      
      // First try user profile country (highest priority for logged-in users)
      if (user?.id) {
        try {
          const { data } = await import('@/integrations/supabase/client').then(m => 
            m.supabase
              .from('users')
              .select('country')
              .eq('id', user.id)
              .single()
          );
          
          if (data?.country) {
            console.log('[Auto-detect] User loaded with country:', data.country);
            const norm = normalizeCountryCode(data.country) || data.country;
            detectedLanguage = getLanguageFromCountry(norm);
            console.log('[Auto-detect] Detected language from profile:', detectedLanguage);
          }
        } catch (error) {
          console.warn('[Auto-detect] Failed to detect language from user profile:', error);
        }
      }
      
      // Fallback to automatic country detection (only if no profile language and current is English)
      if (!detectedLanguage && detection.country && languageRef.current === 'en') {
        detectedLanguage = getLanguageFromDetection();
        console.log('[Auto-detect] Using automatic detection:', detection.country, '->', detectedLanguage);
      }
      
      if (!cancelled && localStorage.getItem('languageManuallySet') !== 'true' && detectedLanguage && detectedLanguage !== languageRef.current) {
        console.log('[Auto-detect] Changing language from', languageRef.current, 'to', detectedLanguage);
        setLanguage(detectedLanguage);
        localStorage.setItem('lang', detectedLanguage);
        
        const methodKey = user?.id ? 'languageBasedOnProfile' :
                          detection.method === 'geolocation' ? 'languageBasedOnLocation' :
                          detection.method === 'ip' ? 'languageBasedOnIp' :
                          detection.method === 'timezone' ? 'languageBasedOnTimezone' : 'languageBasedOnProfile';

        // Show notification about automatic language change
        import('@/hooks/use-toast').then(({ toast }) => {
          toast({
            title: String(i18n.t('languageAutoSet', { lng: detectedLanguage, ns: 'interface' })),
            description: String(i18n.t(methodKey, { lng: detectedLanguage, ns: 'interface' })),
          });
        });
      }
    };
    
    detectLanguageFromUser();
    return () => { cancelled = true; };
  }, [user?.id, detection.country]);

  return (
    <LanguageContext.Provider value={{
      language,
      isLoading: !instance.isInitialized,
      changeLanguage,
      setLanguageFromCountry,
      detectLanguageNow,
      resetLanguageDetection,
      t
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    return {
      language: i18n.resolvedLanguage || defaultLang,
      isLoading: false,
      changeLanguage: () => {},
      setLanguageFromCountry: () => {},
      detectLanguageNow: async () => {},
      resetLanguageDetection: async () => {},
      t: (key: string, params?: Record<string, string | number>) => String(i18n.t(key, params))
    };
  }
  
  return context;
};