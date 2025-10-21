/**
 * Grade Level to Age Mapping Utility
 * Maps various international grade level formats to age ranges
 * Used to determine if a student is under 11 years old for the Interactive Math Stepper
 */

export interface GradeLevelInfo {
  ageRange: [number, number]; // [minAge, maxAge]
  isUnder11: boolean;
  system: string; // 'US' | 'UK' | 'French' | 'Generic'
}

/**
 * Maps grade level strings to age information
 * Supports multiple international systems
 */
export function getGradeLevelInfo(level: string): GradeLevelInfo {
  if (!level) {
    return { ageRange: [6, 18], isUnder11: true, system: 'Generic' };
  }

  const normalizedLevel = level.toLowerCase().trim();

  // US Grade System (Kindergarten, Grade 1-12)
  if (normalizedLevel.includes('kindergarten') || normalizedLevel.includes('k')) {
    return { ageRange: [5, 6], isUnder11: true, system: 'US' };
  }
  
  const usGradeMatch = normalizedLevel.match(/grade\s*(\d+)|grade\s*(\d+)/);
  if (usGradeMatch) {
    const grade = parseInt(usGradeMatch[1] || usGradeMatch[2]);
    if (grade >= 1 && grade <= 12) {
      const age = grade + 5; // Grade 1 = age 6, Grade 5 = age 10, etc.
      return { 
        ageRange: [age, age + 1], 
        isUnder11: age < 11, 
        system: 'US' 
      };
    }
  }

  // UK Year System (Year 1-13)
  const ukYearMatch = normalizedLevel.match(/year\s*(\d+)/);
  if (ukYearMatch) {
    const year = parseInt(ukYearMatch[1]);
    if (year >= 1 && year <= 13) {
      const age = year + 4; // Year 1 = age 5, Year 6 = age 10, etc.
      return { 
        ageRange: [age, age + 1], 
        isUnder11: age < 11, 
        system: 'UK' 
      };
    }
  }

  // French Class System (CP, CE1, CE2, CM1, CM2, 6ème, etc.)
  const frenchClassMap: Record<string, GradeLevelInfo> = {
    'cp': { ageRange: [6, 7], isUnder11: true, system: 'French' },
    'ce1': { ageRange: [7, 8], isUnder11: true, system: 'French' },
    'ce2': { ageRange: [8, 9], isUnder11: true, system: 'French' },
    'cm1': { ageRange: [9, 10], isUnder11: true, system: 'French' },
    'cm2': { ageRange: [10, 11], isUnder11: true, system: 'French' },
    '6ème': { ageRange: [11, 12], isUnder11: false, system: 'French' },
    '5ème': { ageRange: [12, 13], isUnder11: false, system: 'French' },
    '4ème': { ageRange: [13, 14], isUnder11: false, system: 'French' },
    '3ème': { ageRange: [14, 15], isUnder11: false, system: 'French' },
  };

  for (const [key, info] of Object.entries(frenchClassMap)) {
    if (normalizedLevel.includes(key)) {
      return info;
    }
  }

  // Generic Level Descriptions
  if (normalizedLevel.includes('primary') || normalizedLevel.includes('elementary')) {
    return { ageRange: [5, 11], isUnder11: true, system: 'Generic' };
  }
  
  if (normalizedLevel.includes('middle school') || normalizedLevel.includes('secondary')) {
    return { ageRange: [11, 14], isUnder11: false, system: 'Generic' };
  }
  
  if (normalizedLevel.includes('high school')) {
    return { ageRange: [14, 18], isUnder11: false, system: 'Generic' };
  }

  // Age-based matching (e.g., "8 years old", "age 8")
  const ageMatch = normalizedLevel.match(/(\d+)\s*(?:years?\s*old|age)/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    return { 
      ageRange: [age, age + 1], 
      isUnder11: age < 11, 
      system: 'Generic' 
    };
  }

  // Default fallback - assume primary/elementary if unclear
  return { ageRange: [6, 11], isUnder11: true, system: 'Generic' };
}

/**
 * Determines if a student is under 11 years old based on their grade level
 * @param level - The grade level string from user profile
 * @returns true if student is under 11 years old
 */
export function isUnder11YearsOld(level: string): boolean {
  return getGradeLevelInfo(level).isUnder11;
}

/**
 * Gets a human-readable description of the grade level
 * @param level - The grade level string from user profile
 * @returns A formatted description
 */
export function getGradeLevelDescription(level: string): string {
  const info = getGradeLevelInfo(level);
  const { ageRange, system } = info;
  
  if (system === 'US') {
    const grade = ageRange[0] - 5;
    if (grade === 0) return 'Kindergarten';
    return `Grade ${grade}`;
  }
  
  if (system === 'UK') {
    const year = ageRange[0] - 4;
    return `Year ${year}`;
  }
  
  if (system === 'French') {
    return level; // Return original French class name
  }
  
  // Generic fallback
  if (ageRange[0] < 11) {
    return 'Primary School';
  } else if (ageRange[0] < 14) {
    return 'Middle School';
  } else {
    return 'High School';
  }
}
