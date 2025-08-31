import { useState, useEffect } from 'react';
import { getLanguageFromCountry } from '@/utils/countryLanguageMapping';

interface CountryDetectionResult {
  country: string | null;
  method: 'geolocation' | 'ip' | 'timezone' | 'manual' | null;
  confidence: 'high' | 'medium' | 'low';
}

// IP-based detection using a free service
const detectCountryByIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://ipapi.co/country/');
    if (response.ok) {
      const countryCode = await response.text();
      return countryCode.trim().toUpperCase();
    }
  } catch (error) {
    console.log('IP-based country detection failed:', error);
  }
  return null;
};

// Timezone-based estimation (rough approximation)
const estimateCountryByTimezone = (): string | null => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const timezoneToCountry: Record<string, string> = {
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'Europe/London': 'GB',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/Rome': 'IT',
    'Europe/Madrid': 'ES',
    'Asia/Tokyo': 'JP',
    'Asia/Shanghai': 'CN',
    'Australia/Sydney': 'AU',
    'America/Toronto': 'CA',
    'America/Montreal': 'CA',
  };
  
  return timezoneToCountry[timezone] || null;
};

// Browser geolocation with coordinates to country conversion
const detectCountryByGeolocation = (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeoutId = setTimeout(() => resolve(null), 10000); // 10s timeout

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeoutId);
        try {
          // Use reverse geocoding service to get country from coordinates
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            resolve(data.countryCode?.toUpperCase() || null);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.log('Geolocation reverse geocoding failed:', error);
          resolve(null);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.log('Geolocation permission denied or failed:', error);
        resolve(null);
      },
      { 
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 300000 // 5 minutes cache
      }
    );
  });
};

export const useCountryDetection = () => {
  const [detection, setDetection] = useState<CountryDetectionResult>({
    country: null,
    method: null,
    confidence: 'low'
  });
  const [isDetecting, setIsDetecting] = useState(false);

  const detectCountry = async (): Promise<CountryDetectionResult> => {
    setIsDetecting(true);
    
    try {
      // Try geolocation first (highest accuracy when available)
      const geoCountry = await detectCountryByGeolocation();
      if (geoCountry) {
        const result = { country: geoCountry, method: 'geolocation' as const, confidence: 'high' as const };
        setDetection(result);
        setIsDetecting(false);
        return result;
      }

      // Fallback to IP-based detection
      const ipCountry = await detectCountryByIP();
      if (ipCountry) {
        const result = { country: ipCountry, method: 'ip' as const, confidence: 'medium' as const };
        setDetection(result);
        setIsDetecting(false);
        return result;
      }

      // Last resort: timezone estimation
      const timezoneCountry = estimateCountryByTimezone();
      if (timezoneCountry) {
        const result = { country: timezoneCountry, method: 'timezone' as const, confidence: 'low' as const };
        setDetection(result);
        setIsDetecting(false);
        return result;
      }

      // No detection possible
      const result = { country: null, method: null, confidence: 'low' as const };
      setDetection(result);
      setIsDetecting(false);
      return result;
    } catch (error) {
      console.log('Country detection failed:', error);
      const result = { country: null, method: null, confidence: 'low' as const };
      setDetection(result);
      setIsDetecting(false);
      return result;
    }
  };

  useEffect(() => {
    // Only auto-detect if we haven't detected before and no manual language was set
    const hasDetected = localStorage.getItem('countryDetected');
    const languageManuallySet = localStorage.getItem('languageManuallySet') === 'true';
    
    if (!hasDetected && !languageManuallySet) {
      detectCountry().then(() => {
        localStorage.setItem('countryDetected', 'true');
      });
    }
  }, []);

  const getLanguageFromDetection = () => {
    if (detection.country) {
      return getLanguageFromCountry(detection.country);
    }
    return 'en';
  };

  return {
    detection,
    isDetecting,
    detectCountry,
    getLanguageFromDetection
  };
};