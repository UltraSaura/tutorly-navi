import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Country, SchoolLevel } from '@/types/registration';

export const useCountriesAndLevels = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [schoolLevels, setSchoolLevels] = useState<SchoolLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('countries')
          .select('*')
          .order('name');

        if (error) throw error;
        setCountries(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch countries');
      }
    };

    const fetchSchoolLevels = async () => {
      try {
        const { data, error } = await supabase
          .from('school_levels')
          .select('*')
          .order('country_code, sort_order');

        if (error) throw error;
        setSchoolLevels(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch school levels');
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCountries(), fetchSchoolLevels()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const getSchoolLevelsByCountry = (countryCode: string) => {
    return schoolLevels.filter(level => level.country_code === countryCode);
  };

  return {
    countries,
    schoolLevels,
    loading,
    error,
    getSchoolLevelsByCountry
  };
};