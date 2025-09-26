import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguageFromCountry } from '@/utils/countryLanguageMapping';
import { useAuth } from '@/context/AuthContext';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { loadTranslations, type SupportedLanguage, SUPPORTED_LANGUAGES } from '@/locales';

export const defaultLang = "en";

interface LanguageContextType {
  language: string;
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
    return localStorage.getItem('lang') || defaultLang;
  });
  
  const [translations, setTranslations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { detection, getLanguageFromDetection, detectCountry } = useCountryDetection();

  // Load translations when language changes
  useEffect(() => {
    const loadLanguageTranslations = async () => {
      if (translationCache.has(language)) {
        setTranslations(translationCache.get(language));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const loadedTranslations = await loadTranslations(language as SupportedLanguage);
        
        // Flatten translations for legacy key support
        const flattened = flattenTranslations(loadedTranslations);
        const combined = { ...loadedTranslations, ...flattened };
        
        translationCache.set(language, combined);
        setTranslations(combined);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English if current language fails
        if (language !== 'en') {
          try {
            const fallbackTranslations = await loadTranslations('en');
            const flattened = flattenTranslations(fallbackTranslations);
            const combined = { ...fallbackTranslations, ...flattened };
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

  const changeLanguage = (lng: string) => {
    setLanguage(lng);
    localStorage.setItem('lang', lng);
    localStorage.setItem('languageManuallySet', 'true');
    
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
    if (isLoading) return key;
    
    // Navigate through nested object using dot notation
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    // Fallback to key if translation not found
    let result = value || key;
    
    // Handle interpolation if params provided
    if (params && typeof result === 'string') {
      result = result.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }
    
    return result;
  };

  // Auto-detect language from multiple sources when user loads
  useEffect(() => {
    const detectLanguageFromUser = async () => {
      const languageManuallySet = localStorage.getItem('languageManuallySet') === 'true';
      if (languageManuallySet) return;
      
      let detectedLanguage = null;
      
      // First try user profile country
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
            console.log('User loaded with country:', data.country);
            const norm = normalizeCountryCode(data.country) || data.country;
            detectedLanguage = getLanguageFromCountry(norm);
          }
        } catch (error) {
          console.warn('Failed to detect language from user profile:', error);
        }
      }
      
      // Fallback to automatic country detection
      if (!detectedLanguage && detection.country) {
        detectedLanguage = getLanguageFromDetection();
        console.log('Using automatic detection:', detection.country, '->', detectedLanguage);
      }
      
      if (detectedLanguage && detectedLanguage !== language) {
        console.log('Changing language from', language, 'to', detectedLanguage);
        setLanguage(detectedLanguage);
        localStorage.setItem('lang', detectedLanguage);
        
        const methodText = detection.method === 'geolocation' ? 'location' :
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
    // Fallback if context is not available
    return {
      language: defaultLang,
      changeLanguage: () => {},
      setLanguageFromCountry: () => {},
      detectLanguageNow: async () => {},
      resetLanguageDetection: async () => {},
      t: (key: string, params?: Record<string, string | number>) => key
    };
  }
  return context;
};