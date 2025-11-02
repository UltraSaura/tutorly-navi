// Parse the CSV data into a structured format
export interface AgeLevelMapping {
  age: number;
  levels: {
    UK?: string;
    France?: string;
    US?: string;
    Germany?: string;
    Turkey?: string;
    Canada?: string;
  };
}

export const SCHOOL_LEVEL_MAPPING: AgeLevelMapping[] = [
  { age: 3, levels: { UK: 'Early Years - Nursery', France: 'Maternelle - Petite Section', US: 'Pre-School', Germany: 'Kindergarten/Vorschule', Turkey: 'Anaokulu (Pre-school)', Canada: 'Pre-school (Maternelle 4 ans*)' } },
  { age: 4, levels: { UK: 'Early Years - Reception (FS2)', France: 'Maternelle - Moyenne Section', US: 'Pre-K', Germany: 'Kindergarten/Vorschule', Turkey: 'Anaokulu (Pre-school)', Canada: 'Pre-K / Junior Kindergarten (Maternelle 4 ans)' } },
  { age: 5, levels: { UK: 'Primary - Year 1 (KS1)', France: 'Maternelle - Grande Section', US: 'Kindergarten', Germany: 'Kindergarten/Vorschule', Turkey: 'Anaokulu (Pre-school)', Canada: 'Kindergarten / Senior Kindergarten (Maternelle 5 ans)' } },
  { age: 6, levels: { UK: 'Primary - Year 2 (KS1)', France: 'Élémentaire - CP', US: 'Grade 1', Germany: 'Grundschule - Klasse 1', Turkey: 'İlkokul - Grade 1', Canada: 'Grade 1 (1re année)' } },
  { age: 7, levels: { UK: 'Primary - Year 3 (KS2)', France: 'Élémentaire - CE1', US: 'Grade 2', Germany: 'Grundschule - Klasse 2', Turkey: 'İlkokul - Grade 2', Canada: 'Grade 2 (2e année)' } },
  { age: 8, levels: { UK: 'Primary - Year 4 (KS2)', France: 'Élémentaire - CE2', US: 'Grade 3', Germany: 'Grundschule - Klasse 3', Turkey: 'İlkokul - Grade 3', Canada: 'Grade 3 (3e année)' } },
  { age: 9, levels: { UK: 'Primary - Year 5 (KS2)', France: 'Élémentaire - CM1', US: 'Grade 4', Germany: 'Grundschule - Klasse 4', Turkey: 'İlkokul - Grade 4', Canada: 'Grade 4 (4e année)' } },
  { age: 10, levels: { UK: 'Primary - Year 6 (KS2)', France: 'Élémentaire - CM2', US: 'Grade 5', Germany: 'Sek I - Klasse 5', Turkey: 'Ortaokul - Grade 5', Canada: 'Grade 5 (5e année)' } },
  { age: 11, levels: { UK: 'Lower Secondary - Year 7 (KS3)', France: 'Collège - 6e', US: 'Grade 6 (MS)', Germany: 'Sek I - Klasse 6', Turkey: 'Ortaokul - Grade 6', Canada: 'Grade 6 (6e année)' } },
  { age: 12, levels: { UK: 'Lower Secondary - Year 8 (KS3)', France: 'Collège - 5e', US: 'Grade 7 (MS)', Germany: 'Sek I - Klasse 7', Turkey: 'Ortaokul - Grade 7', Canada: 'Grade 7 (Secondaire I)' } },
  { age: 13, levels: { UK: 'Lower Secondary - Year 9 (KS3)', France: 'Collège - 4e', US: 'Grade 8 (MS)', Germany: 'Sek I - Klasse 8', Turkey: 'Ortaokul - Grade 8', Canada: 'Grade 8 (Secondaire II)' } },
  { age: 14, levels: { UK: 'Upper Secondary - Year 10 (GCSE/KS4)', France: 'Collège - 3e', US: 'Grade 9 (HS)', Germany: 'Sek I - Klasse 9', Turkey: 'Lise - Grade 9', Canada: 'Grade 9 (Secondaire III)' } },
  { age: 15, levels: { UK: 'Upper Secondary - Year 11 (GCSE/KS4)', France: 'Lycée - 2nde', US: 'Grade 10 (HS)', Germany: 'Sek I - Klasse 10', Turkey: 'Lise - Grade 10', Canada: 'Grade 10 (Secondaire IV)' } },
  { age: 16, levels: { UK: 'Post-16 - Year 12 (Sixth Form)', France: 'Lycée - 1ère', US: 'Grade 11 (HS)', Germany: 'Sek II - Klasse 11 (Oberstufe)', Turkey: 'Lise - Grade 11', Canada: 'Grade 11 (Secondaire V)' } },
  { age: 17, levels: { UK: 'Post-16 - Year 13 (Sixth Form)', France: 'Lycée - Terminale', US: 'Grade 12 (HS)', Germany: 'Sek II - Klasse 12 (Oberstufe)', Turkey: 'Lise - Grade 12', Canada: 'Grade 12 (CÉGEP 1re année)' } },
  { age: 18, levels: { UK: 'Post-16/Higher Ed or Gap', France: 'Post-bac/Enseignement sup.', US: 'Post-secondary/Other', Germany: 'Post-Schule (Abitur/Beruf)', Turkey: 'Post-secondary/Other', Canada: 'Post-secondary (CÉGEP 2e année / University)' } },
];

// Country codes mapping
export const COUNTRY_CODES = {
  UK: 'GB',
  France: 'FR',
  US: 'US',
  Germany: 'DE',
  Turkey: 'TR',
  Canada: 'CA',
} as const;

// Generate level codes from level names
export function getLevelCode(levelName: string, country: string): string {
  // Extract codes from level names
  if (country === 'UK') {
    const yearMatch = levelName.match(/Year\s*(\d+)/i);
    if (yearMatch) return `Y${yearMatch[1]}`;
    if (levelName.includes('Nursery')) return 'NURSERY';
    if (levelName.includes('Reception')) return 'YR';
  }
  
  if (country === 'France') {
    if (levelName.includes('CP')) return 'CP';
    if (levelName.includes('CE1')) return 'CE1';
    if (levelName.includes('CE2')) return 'CE2';
    if (levelName.includes('CM1')) return 'CM1';
    if (levelName.includes('CM2')) return 'CM2';
    if (levelName.includes('6e') || levelName.includes('6ème')) return '6EME';
    if (levelName.includes('5e') || levelName.includes('5ème')) return '5EME';
    if (levelName.includes('4e') || levelName.includes('4ème')) return '4EME';
    if (levelName.includes('3e') || levelName.includes('3ème')) return '3EME';
    if (levelName.includes('2nde')) return '2NDE';
    if (levelName.includes('1ère') || levelName.includes('1ere')) return '1ERE';
    if (levelName.includes('Terminale')) return 'TERM';
    if (levelName.includes('Petite Section')) return 'PS';
    if (levelName.includes('Moyenne Section')) return 'MS';
    if (levelName.includes('Grande Section')) return 'GS';
  }
  
  if (country === 'US') {
    const gradeMatch = levelName.match(/Grade\s*(\d+)/i);
    if (gradeMatch) return gradeMatch[1];
    if (levelName.includes('Pre-K') || levelName.includes('Pre-School')) return 'PREK';
    if (levelName.includes('Kindergarten')) return 'K';
  }
  
  if (country === 'Germany') {
    const klasseMatch = levelName.match(/Klasse\s*(\d+)/i);
    if (klasseMatch) return `K${klasseMatch[1]}`;
    if (levelName.includes('Kindergarten') || levelName.includes('Vorschule')) return 'KINDERGARTEN';
  }
  
  if (country === 'Turkey') {
    const gradeMatch = levelName.match(/Grade\s*(\d+)/i);
    if (gradeMatch) return gradeMatch[1];
    if (levelName.includes('Anaokulu')) return 'ANAOKULU';
    if (levelName.includes('İlkokul')) return 'ILKOKUL';
    if (levelName.includes('Ortaokul')) return 'ORTAOKUL';
    if (levelName.includes('Lise')) return 'LISE';
  }
  
  if (country === 'Canada') {
    const gradeMatch = levelName.match(/Grade\s*(\d+)/i);
    if (gradeMatch) return gradeMatch[1];
    if (levelName.includes('Pre-school') || levelName.includes('Pre-K')) return 'PREK';
    if (levelName.includes('Kindergarten')) return 'K';
    if (levelName.includes('Maternelle')) {
      if (levelName.includes('4 ans')) return 'MAT4';
      if (levelName.includes('5 ans')) return 'MAT5';
    }
    if (levelName.includes('CÉGEP')) {
      if (levelName.includes('1re')) return 'CEGEP1';
      if (levelName.includes('2e')) return 'CEGEP2';
    }
    if (levelName.includes('Secondaire')) {
      const secMatch = levelName.match(/Secondaire\s*([IVX]+)/i);
      if (secMatch) return `SEC${secMatch[1]}`;
    }
  }
  
  // Fallback: use first letters
  return levelName.substring(0, 10).replace(/\s+/g, '_').toUpperCase();
}
