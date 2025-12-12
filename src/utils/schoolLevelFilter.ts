import { getGradeLevelInfo } from './gradeLevelMapping';

/**
 * Gets user's age from their grade/level
 * Returns the middle age of the age range
 */
export function getUserAgeFromLevel(level: string | null | undefined): number | null {
  if (!level) return null;
  const info = getGradeLevelInfo(level);
  // Return middle of age range
  return Math.floor((info.ageRange[0] + info.ageRange[1]) / 2);
}

/**
 * Gets user's age range from their grade/level
 */
export function getUserAgeRangeFromLevel(level: string | null | undefined): [number, number] | null {
  if (!level) return null;
  const info = getGradeLevelInfo(level);
  return info.ageRange;
}

/**
 * Normalizes school level string for comparison
 */
function normalizeLevel(level: string): string {
  // Handle format: "US:1" or just "grade_5"
  const parts = level.split(':');
  if (parts.length === 2) {
    // Format is country:level_code, extract just the level part
    return parts[1].toLowerCase().trim().replace(/\s+/g, '_');
  }
  return level.toLowerCase().trim().replace(/\s+/g, '_');
}

/**
 * Checks if a video/quiz is suitable for a user's age
 */
export function isContentSuitableForAge(
  content: { min_age?: number | null; max_age?: number | null },
  userAge: number
): boolean {
  const minAge = content.min_age ?? 0;
  const maxAge = content.max_age ?? 999;
  return userAge >= minAge && userAge <= maxAge;
}

/**
 * Checks if a video/quiz is suitable for a user's school level
 */
export function isContentSuitableForLevel(
  content: { school_levels?: string[] | null },
  userLevel: string
): boolean {
  if (!content.school_levels || content.school_levels.length === 0) {
    return true;
  }
  
  const normalizedUserLevel = normalizeLevel(userLevel);
  
  return content.school_levels.some(level => {
    // level format is "country_code:level_code" (e.g., "US:1", "FR:CE1")
    const parts = level.split(':');
    const levelCode = parts.length === 2 ? parts[1] : level;
    const normalizedLevel = normalizeLevel(levelCode);
    
    // Check multiple matching strategies
    return normalizedUserLevel.includes(normalizedLevel) || 
           normalizedLevel.includes(normalizedUserLevel) ||
           normalizedUserLevel.replace(/_/g, ' ') === normalizedLevel.replace(/_/g, ' ') ||
           // Also check if user level matches the full level name patterns
           levelMatchesPattern(userLevel, levelCode);
  });
}

// Helper to match user level with stored level codes
function levelMatchesPattern(userLevel: string, storedLevel: string): boolean {
  const userLower = userLevel.toLowerCase();
  const storedLower = storedLevel.toLowerCase();
  
  // Handle common patterns
  // "Grade 5" should match "5", "grade_5", "grade5"
  if (userLower.includes('grade')) {
    const gradeMatch = userLower.match(/grade\s*(\d+)/);
    if (gradeMatch) {
      const gradeNum = gradeMatch[1];
      return storedLower === gradeNum || 
             storedLower.includes(`grade${gradeNum}`) ||
             storedLower.includes(`grade_${gradeNum}`);
    }
  }
  
  // "Year 3" should match "Y3", "year_3", "3"
  if (userLower.includes('year')) {
    const yearMatch = userLower.match(/year\s*(\d+)/);
    if (yearMatch) {
      const yearNum = yearMatch[1];
      return storedLower === `y${yearNum}` ||
             storedLower === yearNum ||
             storedLower.includes(`year${yearNum}`) ||
             storedLower.includes(`year_${yearNum}`);
    }
  }
  
  return false;
}

/**
 * Combined check for both age and level
 * Content is suitable if it matches EITHER age OR level (flexible matching)
 */
export function isContentSuitableForUser(
  content: { 
    min_age?: number | null; 
    max_age?: number | null; 
    school_levels?: string[] | null;
  },
  userLevel: string | null,
  userAge?: number | null
): boolean {
  // If no filters specified, show to everyone
  const hasAgeFilter = content.min_age !== null && content.min_age !== undefined || 
                       content.max_age !== null && content.max_age !== undefined;
  const hasLevelFilter = content.school_levels && content.school_levels.length > 0;
  
  if (!hasAgeFilter && !hasLevelFilter) {
    return true;
  }
  
  let ageSuitable = true;
  let levelSuitable = true;
  
  // Check age match
  if (hasAgeFilter && userAge !== null && userAge !== undefined) {
    ageSuitable = isContentSuitableForAge(content, userAge);
  }
  
  // Check level match
  if (hasLevelFilter && userLevel) {
    levelSuitable = isContentSuitableForLevel(content, userLevel);
  }
  
  // If only one type of filter exists, use that
  if (hasAgeFilter && !hasLevelFilter) {
    return ageSuitable;
  }
  if (!hasAgeFilter && hasLevelFilter) {
    return levelSuitable;
  }
  
  // If both exist, user must match at least one (flexible)
  return ageSuitable || levelSuitable;
}

/**
 * Filters an array of content based on user's age, level, and language
 */
export function filterContentByUserLevel<T extends { 
  min_age?: number | null; 
  max_age?: number | null; 
  school_levels?: string[] | null;
  language?: string | null;
}>(
  content: T[],
  userLevel: string | null,
  userAge?: number | null,
  userLanguage?: string | null
): T[] {
  return content.filter(item => {
    // Check language first - if content has language set and it doesn't match user's, filter it out
    if (userLanguage && item.language && item.language !== userLanguage) {
      return false;
    }
    return isContentSuitableForUser(item, userLevel, userAge);
  });
}
