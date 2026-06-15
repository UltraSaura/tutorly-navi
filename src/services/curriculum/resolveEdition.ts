import { supabase } from "@/integrations/supabase/client";

interface SupabaseServiceError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

interface SupabaseQueryResult<T> {
  data: T | null;
  error: SupabaseServiceError | null;
}

interface SupabaseQueryBuilder<T> extends PromiseLike<SupabaseQueryResult<T[]>> {
  select(columns: string): SupabaseQueryBuilder<T>;
  eq(column: string, value: string): SupabaseQueryBuilder<T>;
  in(column: string, values: string[]): SupabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
}

interface CurriculumSupabaseClient {
  rpc<T>(
    functionName: "resolve_edition",
    params: {
      p_level: CurriculumClassLevel;
      p_subject: CurriculumSubjectCode;
      p_track: string | null;
    },
  ): Promise<SupabaseQueryResult<T>>;
  from<T>(table: string): SupabaseQueryBuilder<T>;
}

interface DomainRow {
  id: string;
  code: string | null;
  label: string | null;
  domain: string;
}

interface SubdomainRow {
  id: number;
  id_new: string;
  code: string | null;
  label: string | null;
  subdomain: string;
  domain_id_new: string;
}

interface ObjectiveRow {
  id: string;
  id_new: string;
  level: string;
  text: string;
  subdomain_id_uuid: string;
}

interface SuccessCriterionRow {
  id: string;
  id_new: string;
  text: string;
  source: "official" | "generated";
  objective_id_uuid: string;
}

const curriculumSupabase = supabase as unknown as CurriculumSupabaseClient;

export type CurriculumSubjectCode = "francais" | "mathematiques";

export type CurriculumClassLevel =
  | "CP"
  | "CE1"
  | "CE2"
  | "CM1"
  | "CM2"
  | "6e"
  | "5e"
  | "4e"
  | "3e"
  | "2nde"
  | "1re"
  | "terminale";

export interface ResolveCurrentEditionInput {
  level: CurriculumClassLevel;
  subject: CurriculumSubjectCode;
  track?: string | null;
}

export interface ResolvedSuccessCriterion {
  id: string;
  id_new: string;
  text: string;
  source: "official" | "generated";
}

export interface ResolvedObjective {
  id: string;
  id_new: string;
  level: string;
  text: string;
  successCriteria: ResolvedSuccessCriterion[];
}

export interface ResolvedSubdomain {
  id: number;
  id_new: string;
  code: string | null;
  label: string | null;
  subdomain: string;
  objectives: ResolvedObjective[];
}

export interface ResolvedDomain {
  id: string;
  code: string | null;
  label: string | null;
  domain: string;
  subdomains: ResolvedSubdomain[];
}

export interface ResolvedCurriculumEdition {
  editionId: string;
  level: CurriculumClassLevel;
  subject: CurriculumSubjectCode;
  domains: ResolvedDomain[];
}

export async function resolveCurrentEdition({
  level,
  subject,
  track = null,
}: ResolveCurrentEditionInput): Promise<ResolvedCurriculumEdition> {
  const { data: editionId, error: resolveError } = await curriculumSupabase.rpc<string>(
    "resolve_edition",
    {
      p_level: level,
      p_subject: subject,
      p_track: track,
    },
  );

  if (resolveError) {
    throw resolveError;
  }

  if (!editionId) {
    throw new Error(`Aucun programme en vigueur pour ${level}/${subject}`);
  }

  const { data: domains, error: domainsError } = await curriculumSupabase
    .from<DomainRow>("domains")
    .select("id, code, label, domain")
    .eq("edition_id", editionId)
    .order("label", { ascending: true });

  if (domainsError) {
    throw domainsError;
  }

  const domainIds = (domains ?? []).map((domain) => domain.id);
  if (domainIds.length === 0) {
    return {
      editionId,
      level,
      subject,
      domains: [],
    };
  }

  const { data: subdomains, error: subdomainsError } = await curriculumSupabase
    .from<SubdomainRow>("subdomains")
    .select("id, id_new, code, label, subdomain, domain_id_new")
    .in("domain_id_new", domainIds)
    .order("label", { ascending: true });

  if (subdomainsError) {
    throw subdomainsError;
  }

  const subdomainIds = (subdomains ?? []).map((subdomain) => subdomain.id_new);

  const { data: objectives, error: objectivesError } = subdomainIds.length
    ? await curriculumSupabase
        .from<ObjectiveRow>("objectives")
        .select("id, id_new, level, text, domain_id_uuid, subdomain_id_uuid")
        .in("subdomain_id_uuid", subdomainIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (objectivesError) {
    throw objectivesError;
  }

  const objectiveIds = (objectives ?? []).map((objective) => objective.id_new);

  const { data: successCriteria, error: criteriaError } = objectiveIds.length
    ? await curriculumSupabase
        .from<SuccessCriterionRow>("success_criteria")
        .select("id, id_new, text, source, objective_id_uuid")
        .in("objective_id_uuid", objectiveIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (criteriaError) {
    throw criteriaError;
  }

  const criteriaByObjective = new Map<string, ResolvedSuccessCriterion[]>();
  for (const criterion of successCriteria ?? []) {
    const objectiveId = criterion.objective_id_uuid;
    if (!criteriaByObjective.has(objectiveId)) {
      criteriaByObjective.set(objectiveId, []);
    }
    criteriaByObjective.get(objectiveId)?.push({
      id: criterion.id,
      id_new: criterion.id_new,
      text: criterion.text,
      source: criterion.source,
    });
  }

  const objectivesBySubdomain = new Map<string, ResolvedObjective[]>();
  for (const objective of objectives ?? []) {
    const subdomainId = objective.subdomain_id_uuid;
    if (!objectivesBySubdomain.has(subdomainId)) {
      objectivesBySubdomain.set(subdomainId, []);
    }
    objectivesBySubdomain.get(subdomainId)?.push({
      id: objective.id,
      id_new: objective.id_new,
      level: objective.level,
      text: objective.text,
      successCriteria: criteriaByObjective.get(objective.id_new) ?? [],
    });
  }

  const subdomainsByDomain = new Map<string, ResolvedSubdomain[]>();
  for (const subdomain of subdomains ?? []) {
    const domainId = subdomain.domain_id_new;
    if (!subdomainsByDomain.has(domainId)) {
      subdomainsByDomain.set(domainId, []);
    }
    subdomainsByDomain.get(domainId)?.push({
      id: subdomain.id,
      id_new: subdomain.id_new,
      code: subdomain.code,
      label: subdomain.label,
      subdomain: subdomain.subdomain,
      objectives: objectivesBySubdomain.get(subdomain.id_new) ?? [],
    });
  }

  return {
    editionId,
    level,
    subject,
    domains: (domains ?? []).map((domain) => ({
      id: domain.id,
      code: domain.code,
      label: domain.label,
      domain: domain.domain,
      subdomains: subdomainsByDomain.get(domain.id) ?? [],
    })),
  };
}
