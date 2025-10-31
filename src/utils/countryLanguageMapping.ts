/**
 * Country to language mapping for automatic language detection
 * Maps country codes to their primary language codes
 */
export const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  // French-speaking countries
  'FR': 'fr', // France
  'BE': 'fr', // Belgium (French is one of official languages)
  'CH': 'fr', // Switzerland (French is one of official languages)
  'MC': 'fr', // Monaco
  'LU': 'fr', // Luxembourg (French is one of official languages)
  'SN': 'fr', // Senegal
  'MA': 'fr', // Morocco
  'DZ': 'fr', // Algeria
  'TN': 'fr', // Tunisia
  'ML': 'fr', // Mali
  'BF': 'fr', // Burkina Faso
  'NE': 'fr', // Niger
  'TD': 'fr', // Chad
  'CF': 'fr', // Central African Republic
  'CG': 'fr', // Republic of the Congo
  'CD': 'fr', // Democratic Republic of the Congo
  'DJ': 'fr', // Djibouti
  'KM': 'fr', // Comoros
  'MG': 'fr', // Madagascar
  'SC': 'fr', // Seychelles
  'VU': 'fr', // Vanuatu
  'NC': 'fr', // New Caledonia
  'PF': 'fr', // French Polynesia
  'WF': 'fr', // Wallis and Futuna
  'RE': 'fr', // Réunion
  'MQ': 'fr', // Martinique
  'GP': 'fr', // Guadeloupe
  'GF': 'fr', // French Guiana
  
  // English-speaking countries (default)
  'US': 'en', // United States
  'CA': 'en', // Canada (English is primary, though French is also official)
  'GB': 'en', // United Kingdom
  'IE': 'en', // Ireland
  'AU': 'en', // Australia
  'NZ': 'en', // New Zealand
  'ZA': 'en', // South Africa
  'IN': 'en', // India
  'PK': 'en', // Pakistan
  'BD': 'en', // Bangladesh
  'LK': 'en', // Sri Lanka
  'MY': 'en', // Malaysia
  'SG': 'en', // Singapore
  'PH': 'en', // Philippines
  'HK': 'en', // Hong Kong
  'NG': 'en', // Nigeria
  'KE': 'en', // Kenya
  'UG': 'en', // Uganda
  'TZ': 'en', // Tanzania
  'ZW': 'en', // Zimbabwe
  'BW': 'en', // Botswana
  'GH': 'en', // Ghana
  'SL': 'en', // Sierra Leone
  'LR': 'en', // Liberia
  'GM': 'en', // Gambia
  'MW': 'en', // Malawi
  'ZM': 'en', // Zambia
  'MT': 'en', // Malta
  'CY': 'en', // Cyprus
  'FJ': 'en', // Fiji
  'JM': 'en', // Jamaica
  'TT': 'en', // Trinidad and Tobago
  'BB': 'en', // Barbados
  'BS': 'en', // Bahamas
  'BZ': 'en', // Belize
  'GY': 'en', // Guyana
  'AG': 'en', // Antigua and Barbuda
  'DM': 'en', // Dominica
  'GD': 'en', // Grenada
  'KN': 'en', // Saint Kitts and Nevis
  'LC': 'en', // Saint Lucia
  'VC': 'en', // Saint Vincent and the Grenadines
};

/**
 * Get the default language for a given country code
 * @param countryCode - The ISO country code (e.g., 'FR', 'US')
 * @returns The language code (e.g., 'fr', 'en') or 'en' as default
 */
export const getLanguageFromCountry = (countryCode: string): string => {
  return COUNTRY_LANGUAGE_MAP[countryCode?.toUpperCase()] || 'en';
};

/**
 * Check if a country has a specific language as primary
 * @param countryCode - The ISO country code
 * @param languageCode - The language code to check
 * @returns True if the country's primary language matches
 */
export const isCountryLanguage = (countryCode: string, languageCode: string): boolean => {
  return getLanguageFromCountry(countryCode) === languageCode;
};

/**
 * Get all countries that use a specific language
 * @param languageCode - The language code (e.g., 'fr', 'en')
 * @returns Array of country codes that use this language
 */
export const getCountriesByLanguage = (languageCode: string): string[] => {
  return Object.entries(COUNTRY_LANGUAGE_MAP)
    .filter(([, lang]) => lang === languageCode)
    .map(([country]) => country);
};