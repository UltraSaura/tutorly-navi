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
  category_id: string;
  dry_run?: boolean;
}

interface PreviewRow {
  level_code: string;
  subject_id_uuid: string | null;
  subject_name: string | null;
  domain_id_uuid: string | null;
  domain_name: string | null;
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

    // Authenticated client to identify caller
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

    // Service client to bypass RLS for admin work
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify admin role
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
    if (!body.category_id) {
      return new Response(
        JSON.stringify({ error: "category_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const country_code = (body.country_code || "fr").toLowerCase();
    const level_filter = body.level_code ? body.level_code.toLowerCase() : null;
    const subject_filter = body.subject_id_uuid || null;
    const dry_run = body.dry_run !== false; // default true

    // Verify category exists
    const { data: category, error: catErr } = await admin
      .from("learning_categories")
      .select("id, name")
      .eq("id", body.category_id)
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

    // Fetch all candidate objectives
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

    // Lookup tables
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

    // Group objectives by (level, subdomain_id_uuid)
    type GroupKey = string; // `${level}|${subdomain_id_uuid}`
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

    // Check existing topics
    const subdomainIdsForCheck = [...groups.values()].map(
      (g) => g.subdomain_id_uuid,
    );
    const levelsForCheck = [...new Set([...groups.values()].map((g) => g.level))];

    const { data: existingTopics, error: existErr } = await admin
      .from("topics")
      .select("id, curriculum_level_code, curriculum_subdomain_id_uuid")
      .eq("category_id", body.category_id)
      .in("curriculum_subdomain_id_uuid", subdomainIdsForCheck.length ? subdomainIdsForCheck : ["00000000-0000-0000-0000-000000000000"])
      .in("curriculum_level_code", levelsForCheck.length ? levelsForCheck : ["__none__"]);
    if (existErr) throw existErr;

    const existingMap = new Map<string, string>();
    for (const t of existingTopics || []) {
      existingMap.set(
        `${t.curriculum_level_code}|${t.curriculum_subdomain_id_uuid}`,
        t.id,
      );
    }

    // Build preview rows
    const preview: PreviewRow[] = [];
    let orderCounter = 0;
    for (const [key, g] of groups) {
      const sub = subdomainMap.get(g.subdomain_id_uuid);
      const dom = g.domain_id_uuid ? domainMap.get(g.domain_id_uuid) : null;
      const subj = g.subject_id_uuid ? subjectMap.get(g.subject_id_uuid) : null;

      const label =
        sub?.subdomain ||
        sub?.label ||
        sub?.code ||
        `Subdomain ${g.subdomain_id_uuid.slice(0, 8)}`;
      const subCode = sub?.code || sub?.subdomain || g.subdomain_id_uuid.slice(0, 8);
      const slug = asciiSlug(`${g.level}-${subCode}`);

      const existing_topic_id = existingMap.get(key);
      preview.push({
        level_code: g.level,
        subject_id_uuid: g.subject_id_uuid,
        subject_name: subj?.name || null,
        domain_id_uuid: g.domain_id_uuid,
        domain_name: dom?.label || dom?.domain || null,
        subdomain_id_uuid: g.subdomain_id_uuid,
        topic_name: label,
        slug,
        objective_count: g.objectives.length,
        status: existing_topic_id ? "already_exists" : "will_create",
        existing_topic_id,
      });
      orderCounter++;
    }

    // Add orphans as informational rows
    for (const o of orphans) {
      preview.push({
        level_code: o.level,
        subject_id_uuid: o.subject_id_uuid,
        subject_name: o.subject_id_uuid
          ? subjectMap.get(o.subject_id_uuid)?.name || null
          : null,
        domain_id_uuid: o.domain_id_uuid,
        domain_name: null,
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

    // COMMIT MODE
    let created = 0;
    let skipped_existing = 0;
    let links_added = 0;

    // Build topic rows to upsert
    const toUpsert = preview
      .filter((p) => p.status !== "skipped_orphan")
      .map((p, idx) => ({
        category_id: body.category_id,
        name: p.topic_name,
        slug: `${p.slug}-${p.subdomain_id_uuid?.slice(0, 6) || idx}`,
        description: null,
        curriculum_country_code: country_code,
        curriculum_level_code: p.level_code,
        curriculum_subject_id_uuid: p.subject_id_uuid,
        curriculum_domain_id_uuid: p.domain_id_uuid,
        curriculum_subdomain_id_uuid: p.subdomain_id_uuid,
        is_active: true,
        order_index: idx,
      }));

    // Chunked upsert
    const CHUNK = 50;
    const upsertedTopics: { id: string; curriculum_level_code: string; curriculum_subdomain_id_uuid: string }[] = [];
    for (let i = 0; i < toUpsert.length; i += CHUNK) {
      const slice = toUpsert.slice(i, i + CHUNK);
      const { data, error } = await admin
        .from("topics")
        .upsert(slice, {
          onConflict:
            "curriculum_level_code,curriculum_subdomain_id_uuid,category_id",
          ignoreDuplicates: false,
        })
        .select("id, curriculum_level_code, curriculum_subdomain_id_uuid");
      if (error) throw error;
      if (data) upsertedTopics.push(...(data as any));
    }

    // Build a fresh map from upserted rows
    const topicIdMap = new Map<string, string>();
    for (const t of upsertedTopics) {
      topicIdMap.set(
        `${t.curriculum_level_code}|${t.curriculum_subdomain_id_uuid}`,
        t.id,
      );
    }

    for (const p of preview) {
      if (p.status === "will_create") created++;
      if (p.status === "already_exists") skipped_existing++;
    }

    // Build link rows
    const linkRows: {
      topic_id: string;
      objective_id: string;
      objective_id_uuid: string;
      order_index: number;
    }[] = [];
    for (const [key, g] of groups) {
      const topicId = topicIdMap.get(key) || existingMap.get(key);
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

    // Chunked upsert for links — rely on existing unique constraint
    for (let i = 0; i < linkRows.length; i += CHUNK) {
      const slice = linkRows.slice(i, i + CHUNK);
      const { error, count } = await admin
        .from("topic_objective_links")
        .upsert(slice, {
          onConflict: "topic_id,objective_id_uuid",
          ignoreDuplicates: true,
          count: "exact",
        });
      if (error) {
        // Fallback: try without uuid conflict target
        const { error: e2 } = await admin
          .from("topic_objective_links")
          .upsert(slice, { ignoreDuplicates: true });
        if (e2) throw e2;
      }
      links_added += count || slice.length;
    }

    return new Response(
      JSON.stringify({
        dry_run: false,
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
