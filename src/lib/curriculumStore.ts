/**
 * Curriculum store — DB-backed source of truth for the country/level/subject/domain/subdomain tree.
 *
 * Loaded lazily (singleton promise + module-level cache). The sync getters in
 * @/lib/curriculum read from this cache. The `useCurriculumTree()` React Query
 * hook (in `useCurriculumBundle`) triggers loading and provides a loading flag.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  CurriculumBundle,
  CurriculumCountry,
  CurriculumLevel,
  CurriculumSubject,
  CurriculumDomain,
  CurriculumSubdomain,
} from '@/types/curriculum';

// Map a country code to the language used by its subjects (e.g. 'fr' for FR/CA-FR).
// Keep simple and explicit; defaults to English elsewhere.
const COUNTRY_LANGUAGE: Record<string, string> = {
  fr: 'fr',
};

function languageForCountry(countryCode: string): string {
  return COUNTRY_LANGUAGE[countryCode.toLowerCase()] ?? 'en';
}

// Build a labels object that the legacy API expects: { fr: '...', en: '...' }.
function makeLabels(primary: string | null | undefined, fallback?: string | null): Record<string, string> {
  const value = primary?.trim() || fallback?.trim() || '';
  return { en: value, fr: value };
}

let cachedBundle: CurriculumBundle | null = null;
let inflight: Promise<CurriculumBundle> | null = null;

async function fetchTree(): Promise<CurriculumBundle> {
  // Pull every taxonomy table in parallel.
  const [
    countriesRes,
    schoolLevelsRes,
    subjectsRes,
    domainsRes,
    subdomainsRes,
    objectivesRes,
  ] = await Promise.all([
    supabase.from('countries').select('code, name').order('name'),
    supabase
      .from('school_levels')
      .select('country_code, level_code, level_name, sort_order')
      .order('country_code')
      .order('sort_order'),
    supabase
      .from('subjects')
      .select('id, slug, name, language, is_active')
      .eq('is_active', true)
      .order('order_index'),
    supabase.from('domains').select('id, code, label, subject_id'),
    supabase.from('subdomains').select('id_new, code, label, domain_id_new, subject_id'),
    // Used to know which (subject, level) combinations actually have content.
    supabase.from('objectives').select('level, subject_id_uuid'),
  ]);

  if (countriesRes.error) throw countriesRes.error;
  if (schoolLevelsRes.error) throw schoolLevelsRes.error;
  if (subjectsRes.error) throw subjectsRes.error;
  if (domainsRes.error) throw domainsRes.error;
  if (subdomainsRes.error) throw subdomainsRes.error;
  if (objectivesRes.error) throw objectivesRes.error;

  const countries = countriesRes.data ?? [];
  const schoolLevels = schoolLevelsRes.data ?? [];
  const subjects = subjectsRes.data ?? [];
  const domains = domainsRes.data ?? [];
  const subdomains = subdomainsRes.data ?? [];
  const objectives = objectivesRes.data ?? [];

  // Build (subject_id_uuid → Set<lowercase level>) map from objectives so that
  // a subject only appears under levels that actually have content.
  const subjectLevels = new Map<string, Set<string>>();
  for (const o of objectives) {
    if (!o.subject_id_uuid || !o.level) continue;
    const key = o.subject_id_uuid;
    const lvl = String(o.level).toLowerCase();
    if (!subjectLevels.has(key)) subjectLevels.set(key, new Set());
    subjectLevels.get(key)!.add(lvl);
  }

  // Build subdomains grouped by domain_id_new.
  const subdomainsByDomain = new Map<string, CurriculumSubdomain[]>();
  for (const sd of subdomains) {
    if (!sd.domain_id_new) continue;
    const list = subdomainsByDomain.get(sd.domain_id_new) ?? [];
    list.push({
      id: sd.id_new,
      code: sd.code ?? '',
      labels: makeLabels(sd.label, sd.code),
    });
    subdomainsByDomain.set(sd.domain_id_new, list);
  }

  // Build domains grouped by subject_id, with their subdomains attached.
  const domainsBySubject = new Map<string, CurriculumDomain[]>();
  for (const d of domains) {
    if (!d.subject_id) continue;
    const list = domainsBySubject.get(d.subject_id) ?? [];
    list.push({
      id: d.id,
      code: d.code ?? '',
      labels: makeLabels(d.label, d.code),
      subdomains: subdomainsByDomain.get(d.id) ?? [],
    });
    domainsBySubject.set(d.subject_id, list);
  }

  // Helper: build a CurriculumSubject from a DB subject row.
  const buildSubject = (s: typeof subjects[number]): CurriculumSubject => ({
    id: s.id,
    label: s.name,
    labels: makeLabels(s.name),
    domains: domainsBySubject.get(s.id) ?? [],
  });

  // For each country, build levels from `school_levels` (lowercased codes for matching).
  // Within each level, list subjects whose language matches the country
  // AND that have content for this level (per objectives) — fall back to
  // "all language-matching subjects" when no objectives are linked yet.
  const tree: CurriculumCountry[] = countries.map(country => {
    const lang = languageForCountry(country.code);
    const subjectsInLanguage = subjects.filter(s => (s.language ?? 'en') === lang);

    const levelsForCountry = schoolLevels.filter(l => l.country_code === country.code);

    const levels: CurriculumLevel[] = levelsForCountry.map(l => {
      const lvlIdLower = l.level_code.toLowerCase();
      const subjectsForLevel = subjectsInLanguage.filter(s => {
        const levelsForSubject = subjectLevels.get(s.id);
        // If a subject has no recorded objectives anywhere, list it everywhere
        // (so an empty curriculum still renders a useful tree). Otherwise only
        // list it under levels that actually have content.
        if (!levelsForSubject || levelsForSubject.size === 0) return true;
        return levelsForSubject.has(lvlIdLower);
      });

      return {
        id: lvlIdLower,
        label: l.level_name,
        grade: l.sort_order ?? 0,
        subjects: subjectsForLevel.map(buildSubject),
      };
    });

    return {
      id: country.code.toLowerCase(),
      name: country.name,
      levels,
    };
  });

  return {
    version: 'db-1',
    schema: 'curriculum-db',
    countries: tree,
  };
}

/**
 * Trigger (or reuse) the in-flight load and resolve with the curriculum tree.
 * Subsequent calls return the cached value.
 */
export function loadCurriculumTree(): Promise<CurriculumBundle> {
  if (cachedBundle) return Promise.resolve(cachedBundle);
  if (inflight) return inflight;
  inflight = fetchTree()
    .then(bundle => {
      cachedBundle = bundle;
      return bundle;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Synchronously read the cached tree, or null if not loaded yet. */
export function getCachedCurriculumTree(): CurriculumBundle | null {
  return cachedBundle;
}

/** Force a refresh on next access (e.g. after import). */
export function invalidateCurriculumTree(): void {
  cachedBundle = null;
  inflight = null;
}
