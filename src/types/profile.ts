export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  level: string | null;
  curriculum_country_code: string | null;
  curriculum_level_code: string | null;
  phone_number: string | null;
  user_type: string;
  created_at: string;
  updated_at: string;
}

export interface CurriculumProfile {
  countryCode: string;
  levelCode: string;
  countryName?: string;
  levelLabel?: string;
}
