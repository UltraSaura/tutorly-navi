import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

export const useLanguageDetection = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (user && user.user_metadata?.country) {
      const country = user.user_metadata.country;
      
      // Map countries to languages
      const countryLanguageMap: Record<string, string> = {
        'FR': 'fr', // France
        'CA': 'fr', // Canada (French-speaking regions)
        'BE': 'fr', // Belgium
        'CH': 'fr', // Switzerland (French-speaking regions)
        'LU': 'fr', // Luxembourg
        'MC': 'fr', // Monaco
        'SN': 'fr', // Senegal
        'CI': 'fr', // Ivory Coast
        'ML': 'fr', // Mali
        'BF': 'fr', // Burkina Faso
        'NE': 'fr', // Niger
        'TD': 'fr', // Chad
        'MG': 'fr', // Madagascar
        'DJ': 'fr', // Djibouti
        'KM': 'fr', // Comoros
        'VU': 'fr', // Vanuatu
        'NC': 'fr', // New Caledonia
        'PF': 'fr', // French Polynesia
        'WF': 'fr', // Wallis and Futuna
        'TF': 'fr', // French Southern Territories
        'RE': 'fr', // Réunion
        'GF': 'fr', // French Guiana
        'GP': 'fr', // Guadeloupe
        'MQ': 'fr', // Martinique
        'YT': 'fr', // Mayotte
        'BL': 'fr', // Saint Barthélemy
        'MF': 'fr', // Saint Martin
        'PM': 'fr', // Saint Pierre and Miquelon
        // Add more French-speaking countries as needed
      };

      const detectedLanguage = countryLanguageMap[country] || 'en';
      
      // Only change language if it's different and user hasn't manually set it
      if (detectedLanguage !== i18n.resolvedLanguage && 
          localStorage.getItem('languageManuallySet') !== 'true') {
        
        console.log(`Auto-detecting language ${detectedLanguage} from country ${country}`);
        i18n.changeLanguage(detectedLanguage);
        
        // Show a toast notification
        // You can uncomment this if you have toast notifications set up
        // toast({
        //   title: detectedLanguage === 'fr' ? 'Langue détectée' : 'Language detected',
        //   description: detectedLanguage === 'fr' ? 'Basé sur votre pays' : 'Based on your country'
        // });
      }
    }
  }, [user, i18n]);
}; 