// Compatibility adapter: all screens share the provider mounted by App.
import { useLanguage as useSharedLanguage } from './SimpleLanguageContext';
export { SimpleLanguageProvider as LanguageProvider } from './SimpleLanguageContext';

export const useLanguage = () => {
  const context = useSharedLanguage();
  return { ...context, isReady: !context.isLoading };
};
