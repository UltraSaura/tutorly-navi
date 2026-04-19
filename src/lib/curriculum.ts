/**
 * Sync curriculum API backed by the DB-backed in-memory cache.
 *
 * Hydration happens via `useCurriculumTree()` (in `useCurriculumBundle`) or by
 * calling `loadCurriculumTree()` directly. Until the cache is populated, the
 * getters return empty arrays — components should rely on the React Query
 * loading flag exposed by the hooks.
 */
import {
  loadCurriculumTree,
  getCachedCurriculumTree,
  invalidateCurriculumTree,
} from '@/lib/curriculumStore';
import type {
  CurriculumBundle,
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

// Re-export hydration helpers so callers can prefetch / invalidate.
export { loadCurriculumTree, invalidateCurriculumTree };

const EMPTY_BUNDLE: CurriculumBundle = {
  version: 'empty',
  schema: 'curriculum-db',
  countries: [],
};

/** Read the cached bundle (empty until hydrated). */
export function getCurriculumBundle(): CurriculumBundle {
  return getCachedCurriculumTree() ?? EMPTY_BUNDLE;
}

/** All countries from the tree. */
export function getCountries(): CurriculumCountry[] {
  return getCurriculumBundle().countries;
}

/** A country by id (case-insensitive). */
export function getCountry(countryId: string): CurriculumCountry | undefined {
  if (!countryId) return undefined;
  const id = countryId.toLowerCase();
  return getCountries().find(c => c.id.toLowerCase() === id);
}

/** Levels for a given country (deduped by id, merging subjects on conflict). */
export function getLevelsByCountry(countryId: string): CurriculumLevel[] {
  const country = getCountry(countryId);
  if (!country?.levels) return [];

  const merged = new Map<string, CurriculumLevel>();
  for (const lvl of country.levels) {
    const existing = merged.get(lvl.id);
    if (!existing) {
      merged.set(lvl.id, { ...lvl, subjects: [...(lvl.subjects ?? [])] });
      continue;
    }
    const subjectMap = new Map(existing.subjects.map(s => [s.id, s]));
    for (const s of lvl.subjects ?? []) subjectMap.set(s.id, s);
    existing.subjects = Array.from(subjectMap.values());
  }
  return Array.from(merged.values());
}

/** A specific level. */
export function getLevel(countryId: string, levelId: string): CurriculumLevel | undefined {
  if (!levelId) return undefined;
  const target = levelId.toLowerCase();
  return getLevelsByCountry(countryId).find(l => l.id.toLowerCase() === target);
}

/** Subjects for a specific country and level. */
export function getSubjects(countryId: string, levelId: string): CurriculumSubject[] {
  return getLevel(countryId, levelId)?.subjects ?? [];
}

export function getSubject(
  countryId: string,
  levelId: string,
  subjectId: string,
): CurriculumSubject | undefined {
  return getSubjects(countryId, levelId).find(s => s.id === subjectId);
}

export function getDomainsBySubject(
  countryId: string,
  levelId: string,
  subjectId: string,
): CurriculumDomain[] {
  return getSubject(countryId, levelId, subjectId)?.domains ?? [];
}

export function getDomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string,
): CurriculumDomain | undefined {
  return getDomainsBySubject(countryId, levelId, subjectId).find(d => d.id === domainId);
}

export function getSubdomainsByDomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string,
): CurriculumSubdomain[] {
  return getDomain(countryId, levelId, subjectId, domainId)?.subdomains ?? [];
}

export function getSubdomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string,
  subdomainId: string,
): CurriculumSubdomain | undefined {
  return getSubdomainsByDomain(countryId, levelId, subjectId, domainId).find(
    sd => sd.id === subdomainId,
  );
}

/** Pick a localized label, falling back gracefully. */
export function getLocalizedLabel(
  labels: Record<string, string> | undefined | null,
  locale: string = 'en',
  fallbackLocale: string = 'en',
): string {
  if (!labels) return '';
  return labels[locale] || labels[fallbackLocale] || Object.values(labels)[0] || '';
}

/** All unique subjects in a country across every level. */
export function getAllSubjectsInCountry(countryId: string): CurriculumSubject[] {
  const subjectMap = new Map<string, CurriculumSubject>();
  for (const level of getLevelsByCountry(countryId)) {
    for (const subject of level.subjects) {
      if (!subjectMap.has(subject.id)) subjectMap.set(subject.id, subject);
    }
  }
  return Array.from(subjectMap.values());
}

/** Search skills (kept for API parity — DB-backed tree has no skills today). */
export function searchSkills(
  countryId: string,
  levelId: string,
  searchTerm: string,
  locale: string = 'en',
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

  const lowerSearch = searchTerm.toLowerCase();
  for (const subject of getSubjects(countryId, levelId)) {
    for (const domain of subject.domains) {
      for (const subdomain of domain.subdomains) {
        for (const skill of subdomain.skills ?? []) {
          const label = getLocalizedLabel(skill.labels, locale).toLowerCase();
          if (label.includes(lowerSearch) || skill.code.toLowerCase().includes(lowerSearch)) {
            results.push({ subject, domain, subdomain, skill });
          }
        }
      }
    }
  }
  return results;
}

/** Human-readable curriculum path or "Not mapped yet". */
export function resolveCurriculumPath(
  countryId: string | null,
  levelId: string | null,
  subjectId: string | null,
  domainId: string | null,
  subdomainId: string | null,
  locale: string = 'en',
): string {
  if (!countryId || !levelId || !subjectId) return 'Not mapped yet';

  const parts: string[] = [];

  const country = getCountry(countryId);
  if (country) parts.push(country.name);

  const level = getLevel(countryId, levelId);
  if (level) parts.push(level.label);

  const subject = getSubject(countryId, levelId, subjectId);
  if (subject) parts.push(getLocalizedLabel(subject.labels, locale));

  if (domainId) {
    const domain = getDomain(countryId, levelId, subjectId, domainId);
    if (domain) parts.push(getLocalizedLabel(domain.labels, locale));
  }

  if (subdomainId && domainId) {
    const subdomain = getSubdomain(countryId, levelId, subjectId, domainId, subdomainId);
    if (subdomain) parts.push(getLocalizedLabel(subdomain.labels, locale));
  }

  return parts.length > 0 ? parts.join(' / ') : 'Not mapped yet';
}

/** Structured curriculum location (mirrors resolveCurriculumPath). */
export function getCurriculumLocation(
  countryId: string | null,
  levelId: string | null,
  subjectId: string | null,
  domainId: string | null,
  subdomainId: string | null,
  locale: string = 'en',
) {
  if (!countryId || !levelId || !subjectId) return null;

  const country = getCountry(countryId);
  const level = getLevel(countryId, levelId);
  const subject = getSubject(countryId, levelId, subjectId);
  const domain = domainId ? getDomain(countryId, levelId, subjectId, domainId) : null;
  const subdomain =
    domainId && subdomainId
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
    },
  };
}
