import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  country_code?: string;
  level_code?: string | null;
  subject_id_uuid?: string | null;
  category_id?: string; // now optional — omit to auto-derive categories from curriculum domains
  dry_run?: boolean;
}

interface PreviewRow {
  level_code: string;
  subject_id_uuid: string | null;
  subject_name: string | null;
  domain_id_uuid: string | null;
  domain_name: string | null;
  category_id: string | null;
  category_name: string | null;
  subdomain_id_uuid: string | null;
  topic_name: string;
  slug: string;
  objective_count: number;
  status: "will_create" | "already_exists" | "skipped_orphan";
  existing_topic_id?: string;
}

function asciiSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "topic";
}

/** Pick a sensible icon name for a learning subject based on its slug. */
function subjectIcon(slug: string): string {
  if (slug.includes("mathemat") || slug.includes("math")) return "calculator";
  if (slug.includes("fran") || slug.includes("franc") || slug.includes("liter")) return "book-open";
  if (slug.includes("science") || slug.includes("physi") || slug.includes("chimi") || slug.includes("bio")) return "flask";
  if (slug.includes("hist") || slug.includes("geog")) return "globe";
  if (slug.includes("english") || slug.includes("langues") || slug.includes("anglais")) return "message-circle";
  return "graduation-cap";
}

/** Pick a colour scheme for a learning subject based on its slug. */
function subjectColor(slug: string): string {
  if (slug.includes("mathemat") || slug.includes("math")) return "blue";
  if (slug.includes("fran") || slug.includes("liter")) return "green";
  if (slug.includes("science") || slug.includes("physi") || slug.includes("bio")) return "teal";
  if (slug.includes("hist") || slug.includes("geog")) return "amber";
  if (slug.includes("english") || slug.includes("anglais")) return "purple";
  return "slate";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr || !roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const category_id_manual = body.category_id || null;
    const country_code = (body.country_code || "fr").toLowerCase();
    const level_filter = body.level_code ? body.level_code.toLowerCase() : null;
    const subject_filter = body.subject_id_uuid || null;
    const dry_run = body.dry_run !== false; // default true

    // ── Manual mode: verify the provided category exists ─────────────────────
    if (category_id_manual) {
      const { data: category, error: catErr } = await admin
        .from("learning_categories")
        .select("id, name")
        .eq("id", category_id_manual)
        .maybeSingle();
      if (catErr || !category) {
        return new Response(
          JSON.stringify({ error: "Invalid category_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // ── Fetch candidate objectives ────────────────────────────────────────────
    let q = admin
      .from("objectives")
      .select(
        "id, id_new, level, subject_id_uuid, domain_id_uuid, subdomain_id_uuid",
      );
    if (level_filter) q = q.eq("level", level_filter);
    if (subject_filter) q = q.eq("subject_id_uuid", subject_filter);
    const { data: objectives, error: objErr } = await q;
    if (objErr) throw objErr;

    if (!objectives || objectives.length === 0) {
      return new Response(
        JSON.stringify({
          dry_run,
          created: 0,
          skipped_existing: 0,
          links_added: 0,
          topics: [],
          message: "No objectives match the filters",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Lookup tables ─────────────────────────────────────────────────────────
    const subjectIds = [
      ...new Set(objectives.map((o) => o.subject_id_uuid).filter(Boolean)),
    ] as string[];
    const domainIds = [
      ...new Set(objectives.map((o) => o.domain_id_uuid).filter(Boolean)),
    ] as string[];
    const subdomainIds = [
      ...new Set(objectives.map((o) => o.subdomain_id_uuid).filter(Boolean)),
    ] as string[];

    const [subjectsRes, domainsRes, subdomainsRes] = await Promise.all([
      subjectIds.length
        ? admin.from("subjects").select("id, name, slug").in("id", subjectIds)
        : Promise.resolve({ data: [], error: null }),
      domainIds.length
        ? admin.from("domains").select("id, domain, label, code").in("id", domainIds)
        : Promise.resolve({ data: [], error: null }),
      subdomainIds.length
        ? admin
            .from("subdomains")
            .select("id_new, subdomain, label, code")
            .in("id_new", subdomainIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (subjectsRes.error) throw subjectsRes.error;
    if (domainsRes.error) throw domainsRes.error;
    if (subdomainsRes.error) throw subdomainsRes.error;

    const subjectMap = new Map(
      (subjectsRes.data || []).map((s: any) => [s.id, s]),
    );
    const domainMap = new Map(
      (domainsRes.data || []).map((d: any) => [d.id, d]),
    );
    const subdomainMap = new Map(
      (subdomainsRes.data || []).map((s: any) => [s.id_new, s]),
    );

    // ── Group objectives by (level, subdomain_id_uuid) ────────────────────────
    type GroupKey = string;
    const groups = new Map<
      GroupKey,
      {
        level: string;
        subject_id_uuid: string | null;
        domain_id_uuid: string | null;
        subdomain_id_uuid: string;
        objectives: typeof objectives;
      }
    >();
    const orphans: typeof objectives = [];

    for (const o of objectives) {
      if (!o.subdomain_id_uuid) {
        orphans.push(o);
        continue;
      }
      const key = `${o.level}|${o.subdomain_id_uuid}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          level: o.level,
          subject_id_uuid: o.subject_id_uuid,
          domain_id_uuid: o.domain_id_uuid,
          subdomain_id_uuid: o.subdomain_id_uuid,
          objectives: [],
        };
        groups.set(key, g);
      }
      g.objectives.push(o);
    }

    // ── Auto mode: upsert learning_subjects + learning_categories from domains ─
    // Categories are structural metadata (idempotent), so we create them even
    // in dry_run so the preview can show resolved category names.
    const domainToCategoryId = new Map<string, string>();
    const domainToCategoryName = new Map<string, string>();

    if (!category_id_manual) {
      // Collect unique (subject_id_uuid, domain_id_uuid) pairs in stable order
      const pairsSeen = new Set<string>();
      const pairs: { subject_id_uuid: string; domain_id_uuid: string }[] = [];
      for (const [, g] of groups) {
        if (!g.subject_id_uuid || !g.domain_id_uuid) continue;
        const pairKey = `${g.subject_id_uuid}|${g.domain_id_uuid}`;
        if (!pairsSeen.has(pairKey)) {
          pairsSeen.add(pairKey);
          pairs.push({ subject_id_uuid: g.subject_id_uuid, domain_id_uuid: g.domain_id_uuid });
        }
      }

      // Group domains by subject
      const subjectToDomains = new Map<string, string[]>();
      for (const { subject_id_uuid, domain_id_uuid } of pairs) {
        const doms = subjectToDomains.get(subject_id_uuid) ?? [];
        if (!doms.includes(domain_id_uuid)) doms.push(domain_id_uuid);
        subjectToDomains.set(subject_id_uuid, doms);
      }

      for (const [subjectUuid, domainUuids] of subjectToDomains) {
        const subj = subjectMap.get(subjectUuid) as any;
        const subjName: string = subj?.name ?? `Subject ${subjectUuid.slice(0, 8)}`;
        const subjSlug = asciiSlug(subjName);

        // learning_categories.subject_id references the `subjects` table directly.
        // Use the curriculum subject UUID as-is — no learning_subjects table in this schema.
        const learningSubjectId: string = subjectUuid;

        // Upsert one learning_category per curriculum domain
        for (let domIdx = 0; domIdx < domainUuids.length; domIdx++) {
          const domainUuid = domainUuids[domIdx];
          const dom = domainMap.get(domainUuid) as any;
          const domLabel: string =
            dom?.label ?? dom?.domain ?? `Domain ${domainUuid.slice(0, 8)}`;
          // Slug is subject-scoped so "Nombres et calculs" under Maths ≠
          // any same-named domain under another subject.
          const catSlug = asciiSlug(`${subjSlug}-${domLabel}`);

          const { data: lcRows, error: lcErr } = await admin
            .from("learning_categories")
            .upsert(
              {
                subject_id: learningSubjectId,
                name: domLabel,
                slug: catSlug,
                icon_name: "layers",
                description: null,
                order_index: domIdx,
                is_active: true,
              },
              { onConflict: "slug", ignoreDuplicates: false },
            )
            .select("id");
          if (lcErr) throw lcErr;
          const learningCategoryId = (lcRows as any[])?.[0]?.id as string | undefined;
          if (!learningCategoryId) {
            throw new Error(`Failed to upsert learning_category for domain "${domLabel}"`);
          }

          domainToCategoryId.set(domainUuid, learningCategoryId);
          domainToCategoryName.set(domainUuid, domLabel);
        }
      }
    }

    /** Resolve the category ID for a given domain (auto) or return the manual one. */
    function resolveCategory(domainId: string | null): string {
      if (category_id_manual) return category_id_manual;
      if (domainId) {
        const cid = domainToCategoryId.get(domainId);
        if (cid) return cid;
      }
      throw new Error(`No category resolved for domain_id=${domainId}`);
    }

    // ── Check existing topics ─────────────────────────────────────────────────
    const subdomainIdsForCheck = [...groups.values()].map(
      (g) => g.subdomain_id_uuid,
    );
    const levelsForCheck = [
      ...new Set([...groups.values()].map((g) => g.level)),
    ];

    let existQuery = admin
      .from("topics")
      .select("id, curriculum_level_code, curriculum_subdomain_id")
      .in(
        "curriculum_subdomain_id",
        subdomainIdsForCheck.length
          ? subdomainIdsForCheck
          : ["00000000-0000-0000-0000-000000000000"],
      )
      .in(
        "curriculum_level_code",
        levelsForCheck.length ? levelsForCheck : ["__none__"],
      );

    // In manual mode also filter by category to match original behaviour
    if (category_id_manual) {
      existQuery = existQuery.eq("category_id", category_id_manual);
    }

    const { data: existingTopics, error: existErr } = await existQuery;
    if (existErr) throw existErr;

    const existingMap = new Map<string, string>();
    for (const t of existingTopics || []) {
      existingMap.set(
        `${t.curriculum_level_code}|${t.curriculum_subdomain_id}`,
        t.id,
      );
    }

    // ── Build preview rows ────────────────────────────────────────────────────
    const preview: PreviewRow[] = [];
    for (const [key, g] of groups) {
      const sub = subdomainMap.get(g.subdomain_id_uuid) as any;
      const dom = g.domain_id_uuid ? (domainMap.get(g.domain_id_uuid) as any) : null;
      const subj = g.subject_id_uuid ? (subjectMap.get(g.subject_id_uuid) as any) : null;

      const label =
        sub?.subdomain ??
        sub?.label ??
        sub?.code ??
        `Subdomain ${g.subdomain_id_uuid.slice(0, 8)}`;
      const subCode =
        sub?.code ?? sub?.subdomain ?? g.subdomain_id_uuid.slice(0, 8);
      const slug = asciiSlug(`${g.level}-${subCode}`);

      const existing_topic_id = existingMap.get(key);
      const resolvedCategoryName = category_id_manual
        ? null // name not needed; caller knows their category
        : (g.domain_id_uuid ? domainToCategoryName.get(g.domain_id_uuid) ?? null : null);

      preview.push({
        level_code: g.level,
        subject_id_uuid: g.subject_id_uuid,
        subject_name: subj?.name ?? null,
        domain_id_uuid: g.domain_id_uuid,
        domain_name: dom?.label ?? dom?.domain ?? null,
        category_id: category_id_manual ?? (g.domain_id_uuid ? (domainToCategoryId.get(g.domain_id_uuid) ?? null) : null),
        category_name: resolvedCategoryName,
        subdomain_id_uuid: g.subdomain_id_uuid,
        topic_name: label,
        slug,
        objective_count: g.objectives.length,
        status: existing_topic_id ? "already_exists" : "will_create",
        existing_topic_id,
      });
    }

    for (const o of orphans) {
      preview.push({
        level_code: o.level,
        subject_id_uuid: o.subject_id_uuid,
        subject_name: o.subject_id_uuid
          ? (subjectMap.get(o.subject_id_uuid) as any)?.name ?? null
          : null,
        domain_id_uuid: o.domain_id_uuid,
        domain_name: null,
        category_id: null,
        category_name: null,
        subdomain_id_uuid: null,
        topic_name: `(orphan: ${o.id})`,
        slug: "",
        objective_count: 1,
        status: "skipped_orphan",
      });
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          auto_categories: !category_id_manual,
          categories_created: domainToCategoryId.size,
          created: 0,
          skipped_existing: preview.filter((p) => p.status === "already_exists")
            .length,
          links_added: 0,
          topics: preview,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── COMMIT: upsert topics ─────────────────────────────────────────────────
    const toUpsert = preview
      .filter((p) => p.status !== "skipped_orphan")
      .map((p, idx) => ({
        category_id: resolveCategory(p.domain_id_uuid),
        name: p.topic_name,
        slug: `${p.slug}-${p.subdomain_id_uuid?.slice(0, 6) ?? idx}`,
        description: null,
        curriculum_country_code: country_code,
        curriculum_level_code: p.level_code,
        curriculum_subject_id: p.subject_id_uuid,
        curriculum_domain_id: p.domain_id_uuid,
        curriculum_subdomain_id: p.subdomain_id_uuid,
        is_active: true,
        order_index: idx,
      }));

    const CHUNK = 50;
    const upsertedTopics: {
      id: string;
      curriculum_level_code: string;
      curriculum_subdomain_id: string;
    }[] = [];
    // Only insert rows that are genuinely new (not already in existingMap)
    const toInsert = toUpsert.filter((row) => {
      const key = `${row.curriculum_level_code}|${row.curriculum_subdomain_id}`;
      return !existingMap.has(key);
    });
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const slice = toInsert.slice(i, i + CHUNK);
      const { data, error } = await admin
        .from("topics")
        .insert(slice)
        .select("id, curriculum_level_code, curriculum_subdomain_id");
      if (error) throw error;
      if (data) upsertedTopics.push(...(data as any));
    }

    const topicIdMap = new Map<string, string>();
    for (const t of upsertedTopics) {
      topicIdMap.set(
        `${t.curriculum_level_code}|${t.curriculum_subdomain_id}`,
        t.id,
      );
    }

    let created = 0;
    let skipped_existing = 0;
    for (const p of preview) {
      if (p.status === "will_create") created++;
      if (p.status === "already_exists") skipped_existing++;
    }

    // ── Build and upsert topic_objective_links ────────────────────────────────
    const linkRows: {
      topic_id: string;
      objective_id: string;
      objective_id_uuid: string;
      order_index: number;
    }[] = [];
    for (const [key, g] of groups) {
      const topicId = topicIdMap.get(key) ?? existingMap.get(key);
      if (!topicId) continue;
      g.objectives.forEach((o, idx) => {
        linkRows.push({
          topic_id: topicId,
          objective_id: o.id,
          objective_id_uuid: o.id_new,
          order_index: idx,
        });
      });
    }

    let links_added = 0;
    for (let i = 0; i < linkRows.length; i += CHUNK) {
      const slice = linkRows.slice(i, i + CHUNK);
      const { data: inserted, error } = await admin
        .from("topic_objective_links")
        .insert(slice)
        .select("id");
      if (error) {
        // If insert fails (e.g. duplicate), try ignoring duplicates via upsert
        const { error: e2 } = await admin
          .from("topic_objective_links")
          .upsert(slice, { ignoreDuplicates: true });
        if (e2) throw e2;
        links_added += slice.length; // approximate
      } else {
        links_added += inserted?.length ?? 0;
      }
    }

    return new Response(
      JSON.stringify({
        dry_run: false,
        auto_categories: !category_id_manual,
        categories_created: domainToCategoryId.size,
        created,
        skipped_existing,
        links_added,
        topics: preview,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("generate-topics-from-objectives error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
