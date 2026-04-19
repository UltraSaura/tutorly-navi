/**
 * CURRICULUM LOADER
 *
 * The curriculum tree (Country → Level → Subject → Domain → Subdomain) is now
 * built dynamically from Supabase tables instead of a static JSON bundle.
 *
 * - Subjects are filtered by `country_code` (NOT by `language`).
 *   Language stays as metadata describing the source language of the program;
 *   students can switch the UI language and still consume the same program.
 * - Levels come from `school_levels`.
 * - Domains/subdomains come from `domains` / `subdomains` (joined via subject_id).
 * - Levels for a given subject are derived from the distinct `objectives.level`
 *   that exist for that subject, so newly imported bundles appear automatically.
 *
 * The exported helpers stay SYNCHRONOUS so existing call-sites keep working.
 * Call `primeCurriculumBundle()` once at app boot; it fetches the data,
 * caches it in module-scope, and returns when ready. Any `getX(...)` called
 * before priming returns empty arrays (and queues a re-render via the bundle
 * version counter that React Query consumers observe).
 */

import { supabase } from '@/integrations/supabase/client';
import staticBundle from '@/data/curriculumBundle.json';
import type {
  CurriculumBundle,
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

// ----- module-scope cache -----
let cachedBundle: CurriculumBundle = staticBundle as CurriculumBundle;
let primingPromise: Promise<CurriculumBundle> | null = null;
let bundleVersion = 0;
const subscribers = new Set<() => void>();

function notify() {
  bundleVersion += 1;
  subscribers.forEach(fn => fn());
}

export function getBundleVersion(): number {
  return bundleVersion;
}

export function subscribeBundle(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// ----- helpers -----
const norm = (s: string | null | undefined) => (s || '').toLowerCase().trim();

function levelGrade(levelCode: string): number {
  const map: Record<string, number> = {
    cp: 1, ce1: 2, ce2: 3, cm1: 4, cm2: 5,
    '6e': 6, '6eme': 6, '5e': 7, '5eme': 7,
    '4e': 8, '4eme': 8, '3e': 9, '3eme': 9,
  };
  return map[norm(levelCode)] ?? 0;
}

function makeLabels(label: string, locale = 'fr'): Record<string, string> {
  return { [locale]: label, en: label };
}

// ----- Fetch & build bundle from DB -----
async function fetchBundleFromDb(): Promise<CurriculumBundle> {
  const [
    { data: countries },
    { data: levels },
    { data: subjects },
    { data: domains },
    { data: subdomains },
    { data: objectiveLevels },
  ] = await Promise.all([
    supabase.from('countries').select('code, name').order('name'),
    supabase.from('school_levels').select('country_code, level_code, level_name, sort_order').order('sort_order'),
    supabase.from('subjects').select('id, slug, name, language, country_code, color_scheme, icon_name, is_active, order_index').eq('is_active', true).order('order_index'),
    supabase.from('domains').select('id, code, label, domain, subject_id'),
    supabase.from('subdomains').select('id_new, code, label, subdomain, domain, subject_id'),
    // distinct objective levels per subject — drives which levels appear under each subject
    supabase.from('objectives').select('level, subject_id_uuid'),
  ]);

  const subjectsByCountry = new Map<string, any[]>();
  (subjects || []).forEach(s => {
    const cc = norm(s.country_code);
    if (!cc) return;
    if (!subjectsByCountry.has(cc)) subjectsByCountry.set(cc, []);
    subjectsByCountry.get(cc)!.push(s);
  });

  // levels per (country, subject) derived from objectives
  const levelsBySubject = new Map<string, Set<string>>();
  (objectiveLevels || []).forEach((o: any) => {
    if (!o.subject_id_uuid || !o.level) return;
    const key = o.subject_id_uuid;
    if (!levelsBySubject.has(key)) levelsBySubject.set(key, new Set());
    levelsBySubject.get(key)!.add(norm(o.level));
  });

  // school_levels lookup by (country lowercase, level lowercase)
  const schoolLevelMap = new Map<string, { label: string; sort: number }>();
  (levels || []).forEach(l => {
    const cc = norm(l.country_code);
    const lc = norm(l.level_code);
    schoolLevelMap.set(`${cc}::${lc}`, { label: l.level_name, sort: l.sort_order ?? 0 });
  });

  // domains / subdomains by subject_id
  const domainsBySubject = new Map<string, any[]>();
  (domains || []).forEach((d: any) => {
    if (!d.subject_id) return;
    if (!domainsBySubject.has(d.subject_id)) domainsBySubject.set(d.subject_id, []);
    domainsBySubject.get(d.subject_id)!.push(d);
  });

  const subdomainsBySubject = new Map<string, any[]>();
  (subdomains || []).forEach((sd: any) => {
    if (!sd.subject_id) return;
    if (!subdomainsBySubject.has(sd.subject_id)) subdomainsBySubject.set(sd.subject_id, []);
    subdomainsBySubject.get(sd.subject_id)!.push(sd);
  });

  // Build country list (only countries that have subjects)
  const builtCountries: CurriculumCountry[] = (countries || [])
    .filter(c => subjectsByCountry.has(norm(c.code)))
    .map(c => {
      const cc = norm(c.code);
      const countrySubjects = subjectsByCountry.get(cc) || [];

      // Collect all unique levels across subjects in this country
      const levelSet = new Set<string>();
      countrySubjects.forEach(s => {
        const lvls = levelsBySubject.get(s.id);
        lvls?.forEach(l => levelSet.add(l));
      });

      const builtLevels: CurriculumLevel[] = Array.from(levelSet).map(levelCode => {
        const meta = schoolLevelMap.get(`${cc}::${levelCode}`);
        const label = meta?.label || levelCode.toUpperCase();
        const sort = meta?.sort ?? 999;

        // Subjects available at this level (those whose objectives include this level)
        const builtSubjects: CurriculumSubject[] = countrySubjects
          .filter(s => levelsBySubject.get(s.id)?.has(levelCode))
          .map(s => {
            const subjDomains = domainsBySubject.get(s.id) || [];
            const subjSubdomains = subdomainsBySubject.get(s.id) || [];

            const builtDomains: CurriculumDomain[] = subjDomains.map((d: any) => {
              const dSubdomains = subjSubdomains.filter((sd: any) => sd.domain === d.domain);
              return {
                id: d.id,
                code: d.code || d.domain,
                labels: makeLabels(d.label || d.domain),
                subdomains: dSubdomains.map((sd: any) => ({
                  id: sd.id_new,
                  code: sd.code || sd.subdomain,
                  labels: makeLabels(sd.label || sd.subdomain),
                  skills: [],
                })),
              };
            });

            return {
              id: s.id,
              label: s.name,
              labels: makeLabels(s.name, s.language || 'en'),
              color: s.color_scheme,
              icon: s.icon_name,
              domains: builtDomains,
            };
          });

        return {
          id: levelCode,
          label,
          grade: levelGrade(levelCode),
          subjects: builtSubjects,
          // @ts-ignore preserve sort hint
          _sort: sort,
        };
      }).sort((a: any, b: any) => (a._sort - b._sort) || (a.grade - b.grade));

      return {
        id: cc,
        name: c.name,
        levels: builtLevels,
      };
    });

  return {
    version: '2.0.0-db',
    schema: 'curriculum-v2',
    countries: builtCountries,
  };
}

/**
 * Prime the curriculum bundle from the database.
 * Safe to call multiple times; concurrent calls share the same promise.
 */
export async function primeCurriculumBundle(force = false): Promise<CurriculumBundle> {
  if (primingPromise && !force) return primingPromise;
  primingPromise = (async () => {
    try {
      const bundle = await fetchBundleFromDb();
      cachedBundle = bundle;
      notify();
      return bundle;
    } catch (err) {
      console.error('[curriculum] failed to load bundle from DB, falling back to static', err);
      return cachedBundle;
    }
  })();
  return primingPromise;
}

// ===== Public synchronous API (unchanged signatures) =====

export function getCurriculumBundle(): CurriculumBundle {
  return cachedBundle;
}

export function getCountries(): CurriculumCountry[] {
  return cachedBundle.countries || [];
}

export function getCountry(countryId: string): CurriculumCountry | undefined {
  return getCountries().find(c => c.id === norm(countryId));
}

export function getLevelsByCountry(countryId: string): CurriculumLevel[] {
  const country = getCountry(countryId);
  if (!country?.levels) return [];

  const merged = new Map<string, CurriculumLevel>();
  for (const lvl of country.levels) {
    const existing = merged.get(lvl.id);
    if (!existing) {
      merged.set(lvl.id, { ...lvl, subjects: [...(lvl.subjects || [])] });
      continue;
    }
    const subjectMap = new Map(existing.subjects.map(s => [s.id, s]));
    for (const s of lvl.subjects || []) subjectMap.set(s.id, s);
    existing.subjects = Array.from(subjectMap.values());
  }
  return Array.from(merged.values());
}

export function getLevel(countryId: string, levelId: string): CurriculumLevel | undefined {
  return getLevelsByCountry(countryId).find(l => norm(l.id) === norm(levelId));
}

export function getSubjects(countryId: string, levelId: string): CurriculumSubject[] {
  return getLevel(countryId, levelId)?.subjects || [];
}

export function getSubject(
  countryId: string,
  levelId: string,
  subjectId: string
): CurriculumSubject | undefined {
  return getSubjects(countryId, levelId).find(s => s.id === subjectId);
}

export function getDomainsBySubject(
  countryId: string,
  levelId: string,
  subjectId: string
): CurriculumDomain[] {
  return getSubject(countryId, levelId, subjectId)?.domains || [];
}

export function getDomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string
): CurriculumDomain | undefined {
  return getDomainsBySubject(countryId, levelId, subjectId).find(d => d.id === domainId);
}

export function getSubdomainsByDomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string
): CurriculumSubdomain[] {
  return getDomain(countryId, levelId, subjectId, domainId)?.subdomains || [];
}

export function getSubdomain(
  countryId: string,
  levelId: string,
  subjectId: string,
  domainId: string,
  subdomainId: string
): CurriculumSubdomain | undefined {
  return getSubdomainsByDomain(countryId, levelId, subjectId, domainId).find(sd => sd.id === subdomainId);
}

export function getLocalizedLabel(
  labels: Record<string, string>,
  locale: string = 'en',
  fallbackLocale: string = 'en'
): string {
  if (!labels) return '';
  return labels[locale] || labels[fallbackLocale] || Object.values(labels)[0] || '';
}

export function getAllSubjectsInCountry(countryId: string): CurriculumSubject[] {
  const levels = getLevelsByCountry(countryId);
  const subjectMap = new Map<string, CurriculumSubject>();
  levels.forEach(level => {
    level.subjects.forEach(subject => {
      if (!subjectMap.has(subject.id)) subjectMap.set(subject.id, subject);
    });
  });
  return Array.from(subjectMap.values());
}

export function searchSkills(
  countryId: string,
  levelId: string,
  searchTerm: string,
  locale: string = 'en'
) {
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

export function resolveCurriculumPath(
  countryId: string | null,
  levelId: string | null,
  subjectId: string | null,
  domainId: string | null,
  subdomainId: string | null,
  locale: string = 'en'
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

// Auto-prime on first import (browser only)
if (typeof window !== 'undefined') {
  primeCurriculumBundle().catch(() => {});
}

export function getCurriculumLocation(
  countryId: string | null,
  levelId: string | null,
  subjectId: string | null,
  domainId: string | null,
  subdomainId: string | null,
  locale: string = 'en'
) {
  if (!countryId || !levelId || !subjectId) return null;
  const country = getCountry(countryId);
  const level = getLevel(countryId, levelId);
  const subject = getSubject(countryId, levelId, subjectId);
  const domain = domainId ? getDomain(countryId, levelId, subjectId, domainId) : null;
  const subdomain = (domainId && subdomainId)
    ? getSubdomain(countryId, levelId, subjectId, domainId, subdomainId)
    : null;
  return {
    country, level, subject, domain, subdomain,
    labels: {
      country: country?.name || '',
      level: level?.label || '',
      subject: subject ? getLocalizedLabel(subject.labels, locale) : '',
      domain: domain ? getLocalizedLabel(domain.labels, locale) : '',
      subdomain: subdomain ? getLocalizedLabel(subdomain.labels, locale) : '',
    }
  };
}
