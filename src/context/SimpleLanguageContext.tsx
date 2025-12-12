import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguageFromCountry } from '@/utils/countryLanguageMapping';
import { useAuth } from '@/context/AuthContext';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { loadTranslations, type SupportedLanguage, SUPPORTED_LANGUAGES } from '@/locales';
import { supabase } from '@/integrations/supabase/client';

// Smart default language detection
const getInitialLanguage = (): string => {
  // 1. Check if user manually set language
  const storedLang = localStorage.getItem('lang');
  const manuallySet = localStorage.getItem('languageManuallySet');
  
  if (storedLang && manuallySet === 'true') {
    console.log('[Language Init] Using manually set language:', storedLang);
    return storedLang;
  }
  
  // 2. Try browser language detection
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (browserLang) {
    const langCode = browserLang.split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(langCode as SupportedLanguage)) {
      console.log('[Language Init] Using browser language:', langCode);
      return langCode;
    }
  }
  
  // 3. Try timezone-based detection for French
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone.includes('Paris') || timezone.includes('Europe/Brussels') || timezone.includes('Europe/Luxembourg')) {
    console.log('[Language Init] Detected French timezone:', timezone);
    return 'fr';
  }
  
  // 4. Default to stored language or English
  console.log('[Language Init] Falling back to stored or default language:', storedLang || 'en');
  return storedLang || 'en';
};

export const defaultLang = getInitialLanguage();

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

// Cache for loaded translations
const translationCache = new Map<string, any>();

// Helper function to flatten nested translations for legacy key support
function flattenTranslations(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenTranslations(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

export const SimpleLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const initialLang = defaultLang;
    console.log('[Translation] SimpleLanguageProvider initialized with language:', initialLang);
    
    // Persist the initial language if it was detected (not manually set)
    if (!localStorage.getItem('languageManuallySet')) {
      localStorage.setItem('lang', initialLang);
      console.log('[Translation] Persisted initial language to localStorage:', initialLang);
    }
    
    return initialLang;
  });
  
  const [translations, setTranslations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('[Translation] SimpleLanguageProvider render, language:', language, 'isLoading:', isLoading);
  
  const { user } = useAuth();
  const { detection, getLanguageFromDetection, detectCountry } = useCountryDetection();

  // Load translations when language changes
  useEffect(() => {
    const loadLanguageTranslations = async () => {
      console.log('[Translation] useEffect triggered for language:', language);
      
      if (translationCache.has(language)) {
        console.log('[Translation] Using cached translations for:', language);
        setTranslations(translationCache.get(language));
        setIsLoading(false);
        
        // Sync with i18next even when using cache
        try {
          const i18n = await import('i18next').then(m => m.default);
          if (i18n.language !== language && i18n.changeLanguage) {
            console.log('[Translation] Syncing i18next to:', language);
            await i18n.changeLanguage(language);
          }
        } catch (error) {
          console.warn('[Translation] Could not sync with i18next:', error);
        }
        return;
      }

      try {
        setIsLoading(true);
        console.log('[Translation] Loading translations for language:', language);
        const loadedTranslations = await loadTranslations(language as SupportedLanguage);
        console.log('[Translation] Loaded translations:', loadedTranslations);
        
        // Flatten translations for legacy key support
        const flattened = flattenTranslations(loadedTranslations);
        
        // IMPORTANT: Also merge 'common' namespace to root for direct access
        // This allows t('learning.chooseSubject') to work instead of requiring t('common.learning.chooseSubject')
        const commonAtRoot = loadedTranslations.common ? { ...loadedTranslations.common } : {};
        
        const combined = { 
          ...loadedTranslations,  // Keep original structure (common.*, exercises.*, etc.)
          ...commonAtRoot,        // Add common.* keys directly at root (learning.*, nav.*, etc.)
          ...flattened           // Add all flattened keys (common.learning.chooseSubject, etc.)
        };
        
        console.log('[Translation] Combined translations:', combined);
        console.log('[Translation] Sample translation test - exercise.answer:', combined['exercise.answer']);
        console.log('[Translation] Sample translation test - exercises.exercise.answer:', combined['exercises.exercise.answer']);
        translationCache.set(language, combined);
        setTranslations(combined);
        console.log('[Translation] Translations set successfully for:', language);
        
        // Sync with i18next
        try {
          const i18n = await import('i18next').then(m => m.default);
          if (i18n.changeLanguage) {
            console.log('[Translation] Syncing i18next to:', language);
            await i18n.changeLanguage(language);
          }
        } catch (error) {
          console.warn('[Translation] Could not sync with i18next:', error);
        }
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English if current language fails
        if (language !== 'en') {
          try {
            const fallbackTranslations = await loadTranslations('en');
            const flattened = flattenTranslations(fallbackTranslations);
            const commonAtRoot = fallbackTranslations.common ? { ...fallbackTranslations.common } : {};
            const combined = { 
              ...fallbackTranslations, 
              ...commonAtRoot, 
              ...flattened 
            };
            setTranslations(combined);
          } catch (fallbackError) {
            console.error('Failed to load fallback translations:', fallbackError);
            setTranslations({});
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguageTranslations();
  }, [language]);

  const changeLanguage = async (lng: string) => {
    console.log('[Translation] changeLanguage called with:', lng);
    setLanguage(lng);
    localStorage.setItem('lang', lng);
    localStorage.setItem('languageManuallySet', 'true');
    
    // SYNC WITH i18next - Ensure both language systems are synchronized
    try {
      const i18n = await import('i18next').then(m => m.default);
      if (i18n.changeLanguage) {
        console.log('[Translation] Syncing with i18next:', lng);
        await i18n.changeLanguage(lng);
      }
    } catch (error) {
      console.warn('[Translation] Could not sync with i18next:', error);
    }
    
    // Show notification about language change
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({
        title: lng === 'fr' ? 'Langue changée en français' : 'Language changed to English',
        description: lng === 'fr' ? 'L\'interface utilisateur a été changée en français' : 'User interface has been changed to English',
      });
    });
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
          title: detectedLanguage === 'fr' ? 'Langue automatiquement définie en français' : 'Language automatically set to English',
          description: detectedLanguage === 'fr' ? 'Basé sur votre pays sélectionné' : 'Based on your selected country',
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
      if (user?.id && supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('country')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.warn('[Reset] Error fetching user country:', error.message);
        } else if (data?.country) {
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
    // Debug logging for ALL translation function calls
    console.log('[Translation] t() function called:', {
      key,
      isLoading,
      language,
      hasTranslations: !!translations,
      translationsKeys: translations ? Object.keys(translations) : [],
      timestamp: new Date().toISOString()
    });
    
    if (isLoading) return key;
    
    // First try to find the key directly (for flattened keys like 'exercises.exercise.answer')
    let value = translations[key];
    
    // If not found directly, try nested object navigation (for keys like 'exercise.answer')
    if (value === undefined) {
      const keys = key.split('.');
      value = translations;
      
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
    }
    
    // If still not found, try with 'exercises.' prefix (for legacy support)
    if (value === undefined && !key.startsWith('exercises.')) {
      value = translations[`exercises.${key}`];
    }
    
    // Fallback to key if translation not found
    let result = value || key;
    
    // Debug logging for result
    if (key.includes('exercise.answer') || key.includes('explanation.modal_title')) {
      console.log('[Translation] Result:', {
        key,
        result,
        wasTranslated: result !== key,
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle interpolation if params provided
    if (params && typeof result === 'string') {
      result = result.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }
    
    return result;
  };

  // Auto-detect language from user profile on login
  // Clear languageManuallySet when a new user logs in to allow profile-based detection
  useEffect(() => {
    const detectLanguageFromUser = async () => {
      const previousUserId = localStorage.getItem('lastUserId');
      const isNewUserLogin = user?.id && user.id !== previousUserId;
      
      // If a new user logged in, clear the manual language flag and update lastUserId
      if (isNewUserLogin) {
        console.log('[Auto-detect] New user logged in, clearing languageManuallySet flag');
        localStorage.removeItem('languageManuallySet');
        localStorage.setItem('lastUserId', user.id);
      }
      
      const languageManuallySet = localStorage.getItem('languageManuallySet') === 'true';
      
      // For new user logins, always try to detect from profile
      // For existing sessions, skip if language was manually set
      if (languageManuallySet && !isNewUserLogin) {
        console.log('[Auto-detect] Language was manually set, skipping auto-detection');
        return;
      }
      
      let detectedLanguage = null;
      
      // First try user profile country (highest priority for logged-in users)
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('country')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.warn('[Auto-detect] Supabase query error:', error.message);
          } else if (data?.country) {
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
      if (!detectedLanguage && detection.country && language === 'en') {
        detectedLanguage = getLanguageFromDetection();
        console.log('[Auto-detect] Using automatic detection:', detection.country, '->', detectedLanguage);
      }
      
      if (detectedLanguage && detectedLanguage !== language) {
        console.log('[Auto-detect] Changing language from', language, 'to', detectedLanguage);
        setLanguage(detectedLanguage);
        localStorage.setItem('lang', detectedLanguage);
        
        const methodText = user?.id ? 'profile' :
                          detection.method === 'geolocation' ? 'location' :
                          detection.method === 'ip' ? 'IP address' :
                          detection.method === 'timezone' ? 'timezone' : 'profile';
        
        // Show notification about automatic language change
        import('@/hooks/use-toast').then(({ toast }) => {
          toast({
            title: detectedLanguage === 'fr' ? 'Langue automatiquement définie en français' : 'Language automatically set to English',
            description: detectedLanguage === 'fr' ? `Basé sur votre ${methodText}` : `Based on your ${methodText}`,
          });
        });
      }
    };
    
    detectLanguageFromUser();
  }, [user?.id, detection.country, detection.method, language, getLanguageFromDetection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading translations...</div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{
      language,
      isLoading,
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
  console.log('[Translation] useLanguage hook called, context available:', !!context);
  
  if (!context) {
    console.log('[Translation] No context available, using fallback');
    // Fallback if context is not available
    return {
      language: defaultLang,
      isLoading: false,
      changeLanguage: () => {},
      setLanguageFromCountry: () => {},
      detectLanguageNow: async () => {},
      resetLanguageDetection: async () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        console.log('[Translation] Fallback t() function called with key:', key);
        return key;
      }
    };
  }
  
  console.log('[Translation] Context available, language:', context.language);
  return context;
};