import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getGradeLevelInfo } from '@/utils/gradeLevelMapping';

export interface SchoolLevelWithAge {
  id: string;
  country_code: string;
  level_code: string;
  level_name: string;
  sort_order: number;
  ageRange: [number, number];
  avgAge: number;
}

export interface CountryWithLevels {
  code: string;
  name: string;
  levels: SchoolLevelWithAge[];
}

export function useSchoolLevelsByCountry() {
  return useQuery({
    queryKey: ['school-levels-by-country'],
    queryFn: async (): Promise<CountryWithLevels[]> => {
      // Fetch countries
      const { data: countries, error: countriesError } = await supabase
        .from('countries')
        .select('*')
        .order('name');

      if (countriesError) throw countriesError;

      // Fetch school levels
      const { data: schoolLevels, error: levelsError } = await supabase
        .from('school_levels')
        .select('*')
        .order('country_code, sort_order');

      if (levelsError) throw levelsError;

      // Group levels by country and add age information
      const countriesWithLevels: CountryWithLevels[] = (countries || []).map(country => {
        const levels = (schoolLevels || [])
          .filter(level => level.country_code === country.code)
          .map(level => {
            // Get age info from level name
            const ageInfo = getGradeLevelInfo(level.level_name);
            return {
              id: level.id,
              country_code: level.country_code,
              level_code: level.level_code,
              level_name: level.level_name,
              sort_order: level.sort_order,
              ageRange: ageInfo.ageRange,
              avgAge: Math.floor((ageInfo.ageRange[0] + ageInfo.ageRange[1]) / 2),
            } as SchoolLevelWithAge;
          })
          .sort((a, b) => a.sort_order - b.sort_order);

        return {
          code: country.code,
          name: country.name,
          levels,
        };
      });

      return countriesWithLevels.filter(country => country.levels.length > 0);
    },
  });
}
