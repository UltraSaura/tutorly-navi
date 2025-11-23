import curriculumBundleData from '@/data/curriculumBundle.json';
import type {
  CurriculumBundle,
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

let cachedBundle: CurriculumBundle | null = null;

/**
 * Load and cache the curriculum bundle
 */
export function getCurriculumBundle(): CurriculumBundle {
  if (!cachedBundle) {
    cachedBundle = curriculumBundleData as CurriculumBundle;
  }
  return cachedBundle;
}

/**
 * Get all countries from the curriculum
 */
export function getCountries(): CurriculumCountry[] {
  const bundle = getCurriculumBundle();
  return bundle.countries || [];
}

/**
 * Get a specific country by ID
 */
export function getCountry(countryId: string): CurriculumCountry | undefined {
  const countries = getCountries();
  return countries.find(c => c.id === countryId);
}

/**
 * Get all levels for a specific country
 */
export function getLevelsByCountry(countryId: string): CurriculumLevel[] {
  const country = getCountry(countryId);
  return country?.levels || [];
}

/**
 * Get a specific level by country and level ID
 */
export function getLevel(countryId: string, levelId: string): CurriculumLevel | undefined {
  const levels = getLevelsByCountry(countryId);
  return levels.find(l => l.id === levelId);
}

/**
 * Get all subjects for a specific country and level
 */
export function getSubjects(countryId: string, levelId: string): CurriculumSubject[] {
  const level = getLevel(countryId, levelId);
  return level?.subjects || [];
}

/**
 * Get a specific subject
 */
export function getSubject(
  countryId: string,
  levelId: string,
  subjectId: string
): CurriculumSubject | undefined {
  const subjects = getSubjects(countryId, levelId);
  return subjects.find(s => s.id === subjectId);
}

/**
 * Get all domains for a specific subject
 */
export function getDomainsBySubject(
  countryId: string,
  levelId: string,
  subjectId: string
): CurriculumDomain[] {
  const subject = getSubject(countryId, levelId, subjectId);
  return subject?.domains || [];
}

/**
 * Get a specific domain
 */
export function getDomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string
): CurriculumDomain | undefined {
  const domains = getDomainsBySubject(countryId, levelId, subjectId);
  return domains.find(d => d.id === domainId);
}

/**
 * Get all subdomains for a specific domain
 */
export function getSubdomainsByDomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string
): CurriculumSubdomain[] {
  const domain = getDomain(countryId, levelId, subjectId, domainId);
  return domain?.subdomains || [];
}

/**
 * Get a specific subdomain
 */
export function getSubdomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string,
  subdomainId: string
): CurriculumSubdomain | undefined {
  const subdomains = getSubdomainsByDomain(countryId, levelId, subjectId, domainId);
  return subdomains.find(sd => sd.id === subdomainId);
}

/**
 * Get a localized label from a labels object
 */
export function getLocalizedLabel(
  labels: Record<string, string>,
  locale: string = 'en',
  fallbackLocale: string = 'en'
): string {
  return labels[locale] || labels[fallbackLocale] || Object.values(labels)[0] || '';
}

/**
 * Get all unique subjects across all levels in a country
 */
export function getAllSubjectsInCountry(countryId: string): CurriculumSubject[] {
  const levels = getLevelsByCountry(countryId);
  const subjectMap = new Map<string, CurriculumSubject>();
  
  levels.forEach(level => {
    level.subjects.forEach(subject => {
      if (!subjectMap.has(subject.id)) {
        subjectMap.set(subject.id, subject);
      }
    });
  });
  
  return Array.from(subjectMap.values());
}

/**
 * Search for skills across the curriculum
 */
export function searchSkills(
  countryId: string,
  levelId: string,
  searchTerm: string,
  locale: string = 'en'
): Array<{
  subject: CurriculumSubject;
  domain: CurriculumDomain;
  subdomain: CurriculumSubdomain;
  skill: { id: string; code: string; labels: Record<string, string> };
}> {
  const results: Array<{
    subject: CurriculumSubject;
    domain: CurriculumDomain;
    subdomain: CurriculumSubdomain;
    skill: { id: string; code: string; labels: Record<string, string> };
  }> = [];
  
  const subjects = getSubjects(countryId, levelId);
  const lowerSearch = searchTerm.toLowerCase();
  
  subjects.forEach(subject => {
    subject.domains.forEach(domain => {
      domain.subdomains.forEach(subdomain => {
        subdomain.skills?.forEach(skill => {
          const label = getLocalizedLabel(skill.labels, locale).toLowerCase();
          if (label.includes(lowerSearch) || skill.code.toLowerCase().includes(lowerSearch)) {
            results.push({ subject, domain, subdomain, skill });
          }
        });
      });
    });
  });
  
  return results;
}

/**
 * Resolve curriculum IDs to a human-readable path
 * @returns Formatted string like "France / CM1 / Mathématiques / Nombres et calculs / Fractions"
 * or "Not mapped yet" if IDs are null
 */
export function resolveCurriculumPath(
  countryId: string | null,
  levelId: string | null,
  subjectId: string | null,
  domainId: string | null,
  subdomainId: string | null,
  locale: string = 'en'
): string {
  // Return early if any required field is missing
  if (!countryId || !levelId || !subjectId) {
    return 'Not mapped yet';
  }

  const parts: string[] = [];

  // Get country
  const country = getCountry(countryId);
  if (country) parts.push(country.name);

  // Get level
  const level = getLevel(countryId, levelId);
  if (level) parts.push(level.label);

  // Get subject
  const subject = getSubject(countryId, levelId, subjectId);
  if (subject) {
    const subjectLabel = getLocalizedLabel(subject.labels, locale);
    parts.push(subjectLabel);
  }

  // Get domain (optional)
  if (domainId) {
    const domain = getDomain(countryId, levelId, subjectId, domainId);
    if (domain) {
      const domainLabel = getLocalizedLabel(domain.labels, locale);
      parts.push(domainLabel);
    }
  }

  // Get subdomain (optional)
  if (subdomainId && domainId) {
    const subdomain = getSubdomain(countryId, levelId, subjectId, domainId, subdomainId);
    if (subdomain) {
      const subdomainLabel = getLocalizedLabel(subdomain.labels, locale);
      parts.push(subdomainLabel);
    }
  }

  return parts.length > 0 ? parts.join(' / ') : 'Not mapped yet';
}

/**
 * Get curriculum location details as an object
 */
export function getCurriculumLocation(
  countryId: string | null,
  levelId: string | null,
  subjectId: string | null,
  domainId: string | null,
  subdomainId: string | null,
  locale: string = 'en'
) {
  if (!countryId || !levelId || !subjectId) {
    return null;
  }

  const country = getCountry(countryId);
  const level = getLevel(countryId, levelId);
  const subject = getSubject(countryId, levelId, subjectId);
  const domain = domainId ? getDomain(countryId, levelId, subjectId, domainId) : null;
  const subdomain = (domainId && subdomainId) 
    ? getSubdomain(countryId, levelId, subjectId, domainId, subdomainId) 
    : null;

  return {
    country,
    level,
    subject,
    domain,
    subdomain,
    labels: {
      country: country?.name || '',
      level: level?.label || '',
      subject: subject ? getLocalizedLabel(subject.labels, locale) : '',
      domain: domain ? getLocalizedLabel(domain.labels, locale) : '',
      subdomain: subdomain ? getLocalizedLabel(subdomain.labels, locale) : '',
    }
  };
}
