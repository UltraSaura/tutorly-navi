import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';

interface LanguageContextType {
  language: string;
  changeLanguage: (lng: string) => void;
  t: (key: string, options?: any) => string;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [isReady, setIsReady] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setLanguage(lng);
  };

  const t = (key: string, options?: any): string => {
    try {
      const result = i18n.t(key, options);
      return typeof result === 'string' ? result : key;
    } catch (error) {
      return key; // Fallback to key if translation fails
    }
  };

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        // Wait for i18n to be ready
        if (!i18n.isInitialized) {
          await i18n.init();
        }
        
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && savedLanguage !== i18n.language) {
          await i18n.changeLanguage(savedLanguage);
          setLanguage(savedLanguage);
        } else {
          setLanguage(i18n.language);
        }
        
        setIsReady(true);
      } catch (error) {
        console.warn('i18n initialization failed, using fallback');
        setIsReady(true);
      }
    };

    initializeI18n();
  }, []);

  // Simple loading state while i18n initializes
  if (!isReady) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      t,
      isReady
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
      language: 'en',
      changeLanguage: () => {},
      t: (key: string) => key,
      isReady: false
    };
  }
  return context;
};