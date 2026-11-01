import { useLanguage } from './SimpleLanguageContext';
export { SimpleLanguageProvider as LanguageProvider } from './SimpleLanguageContext';

export const useLanguageContext = () => {
  const context = useLanguage();
  return {
    isInitialized: !context.isLoading,
    currentLanguage: context.language,
    changeLanguage: context.changeLanguage,
  };
};
