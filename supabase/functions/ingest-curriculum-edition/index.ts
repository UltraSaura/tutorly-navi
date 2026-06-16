import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveProviderKey } from "../_shared/resolveProviderKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ExtractedObjective {
  text: string;
  levels: string[];
  successCriteria: string[];
}

interface ExtractedSubdomain {
  code: string | null;
  label: string;
  description: string;
  objectives: ExtractedObjective[];
}

interface ExtractedDomain {
  code: string | null;
  label: string;
  description: string;
  subdomains: ExtractedSubdomain[];
}

interface ExtractionResult {
  domains: ExtractedDomain[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a short, unique domain code prefix from edition metadata.
 * Matches the manual convention used for français/maths seeds.
 * e.g. "FRA-C2", "MAT-C3A", "HIS-C3", "GEO-C2"
 */
function editionPrefix(subject: string, cycle: string): string {
  const subjMap: Record<string, string> = {
    francais: "FRA",
    mathematiques: "MAT",
    histoire: "HIS",
    geographie: "GEO",
    sciences: "SCI",
    emc: "EMC",
    arts_plastiques: "ART",
    education_musicale: "MUS",
    eps: "EPS",
    langues_vivantes: "LVE",
    technologie: "TEC",
  };
  const subjCode = subjMap[subject] ?? subject.toUpperCase().slice(0, 3);
  const cycleCode = cycle === "cycle 2" ? "C2"
    : cycle === "cycle 3" ? "C3"
    : cycle === "cycle 3 ancien" ? "C3A"
    : cycle.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  return `${subjCode}-${cycleCode}`;
}

function sha256Hex(data: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then((hash) =>
    Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function extractTextFromPdf(pdfBytes: Uint8Array, mistralKey: string): Promise<string> {
  const base64 = uint8ArrayToBase64(pdfBytes);
  const dataUrl = `data:application/pdf;base64,${base64}`;

  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mistralKey}`,
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "document_url", document_url: dataUrl },
      include_image_base64: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral OCR failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.pages || data.pages.length === 0) {
    throw new Error("Mistral OCR returned no pages");
  }

  return data.pages.map((p: { markdown: string }) => p.markdown || "").join("\n\n");
}

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  deepSeekKey: string,
  maxTokens = 8000,
): Promise<string> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepSeekKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned empty content");
  return content;
}

interface DomainStructure {
  code: string | null;
  label: string;
  description: string;
  subdomains: Array<{ code: string | null; label: string; description: string }>;
}

async function extractDomainStructure(
  pdfText: string,
  subject: string,
  cycle: string,
  boReference: string,
  deepSeekKey: string,
): Promise<DomainStructure[]> {
  const systemPrompt =
    "Tu es un expert du système éducatif français. Réponds en JSON valide uniquement, sans markdown.";

  const userPrompt = `Voici le texte du programme officiel de "${subject}" pour le "${cycle}" (${boReference}).

Extrais UNIQUEMENT la liste des domaines et leurs sous-parties (compétences/thèmes).
Ne cherche PAS les objectifs détaillés pour l'instant.

Réponds avec ce JSON :
{
  "domains": [
    {
      "code": "code ou null",
      "label": "nom court du domaine (≤ 60 car.)",
      "description": "intitulé complet tel qu'il apparaît dans le document",
      "subdomains": [
        {
          "code": "code ou null",
          "label": "nom court (≤ 80 car.)",
          "description": "intitulé complet de la compétence/thème"
        }
      ]
    }
  ]
}

TEXTE DU PROGRAMME :
${pdfText.slice(0, 40000)}`;

  const content = await callDeepSeek(systemPrompt, userPrompt, deepSeekKey, 4000);
  const parsed = JSON.parse(content);
  return parsed.domains as DomainStructure[];
}

async function extractAllObjectives(
  pdfText: string,
  domainStructures: DomainStructure[],
  cycle: string,
  deepSeekKey: string,
): Promise<Map<string, ExtractedObjective[]>> {
  const cycleLevels: Record<string, string[]> = {
    "cycle 2": ["CP", "CE1", "CE2"],
    "cycle 3": ["CM1", "CM2", "6e"],
  };
  const levels = cycleLevels[cycle] ?? [];

  // Build a nested listing: domain → subdomain → objectives
  // Use a KEYED object (not positional array) so DeepSeek can't mis-align entries
  const domainsListing = domainStructures.map((d) => ({
    domain: d.label,
    subdomains: d.subdomains.map((s) => `${s.label}: ${s.description}`),
  }));

  const systemPrompt =
    "Tu es un expert du système éducatif français. Réponds en JSON valide uniquement, sans markdown.";

  const userPrompt = `Programme officiel (${cycle}). Extrais les attendus de fin de cycle pour chaque sous-domaine ci-dessous.

Domaines et sous-domaines à traiter :
${JSON.stringify(domainsListing, null, 2)}

Pour chaque sous-domaine, extrais ses attendus de fin de cycle EXACTS tirés du texte (phrases commençant par un verbe d'action).
"levels" = toujours ${JSON.stringify(levels)}.

Réponds avec ce JSON — utilise EXACTEMENT les mêmes labels de domaine et sous-domaine qu'en entrée :
{
  "byDomain": {
    "<label exact du domaine>": {
      "<label exact du sous-domaine>": [
        { "text": "attendu exact", "levels": ${JSON.stringify(levels)}, "successCriteria": [] }
      ]
    }
  }
}

TEXTE DU PROGRAMME :
${pdfText.slice(0, 50000)}`;

  const content = await callDeepSeek(systemPrompt, userPrompt, deepSeekKey, 8000);
  console.log(`[ingest] Objectives raw (first 800): ${content.slice(0, 800)}`);

  const parsed = JSON.parse(content);
  const byDomain = parsed.byDomain ?? {};
  console.log(`[ingest] Objectives byDomain keys: ${Object.keys(byDomain).join(", ")}`);

  const result = new Map<string, ExtractedObjective[]>();
  for (const domain of domainStructures) {
    const domainEntry = byDomain[domain.label] ?? {};
    for (const sub of domain.subdomains) {
      const raw = domainEntry[sub.label];
      const objectives: ExtractedObjective[] = Array.isArray(raw)
        ? raw.map((o: { text?: string; levels?: string[]; successCriteria?: string[] }) => ({
            text: o.text ?? "",
            levels: Array.isArray(o.levels) ? o.levels : levels,
            successCriteria: Array.isArray(o.successCriteria) ? o.successCriteria : [],
          })).filter((o) => o.text.length > 0)
        : [];
      result.set(`${domain.label}||${sub.label}`, objectives);
    }
  }

  const totalObjectives = Array.from(result.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`[ingest] Objectives extracted: ${totalObjectives} total across ${result.size} subdomains`);
  return result;
}

async function extractCurriculumFromText(
  pdfText: string,
  subject: string,
  cycle: string,
  boReference: string,
  deepSeekKey: string,
): Promise<ExtractionResult> {
  // Pass 1: get domain + subdomain structure
  console.log("[ingest] Pass 1: extracting domain structure...");
  const domainStructures = await extractDomainStructure(pdfText, subject, cycle, boReference, deepSeekKey);
  console.log(`[ingest] Pass 1 done: ${domainStructures.length} domains`);

  // Pass 2: extract objectives — non-blocking, failures leave subdomains with empty objectives
  console.log("[ingest] Pass 2: extracting objectives...");
  let objectivesMap = new Map<string, ExtractedObjective[]>();
  try {
    objectivesMap = await extractAllObjectives(pdfText, domainStructures, cycle, deepSeekKey);
    console.log(`[ingest] Pass 2 done: ${objectivesMap.size} subdomains have objectives`);
  } catch (err) {
    console.warn(`[ingest] Pass 2 failed (objectives skipped): ${err}`);
  }

  const domains: ExtractedDomain[] = domainStructures.map((ds) => ({
    code: ds.code,
    label: ds.label,
    description: ds.description,
    subdomains: ds.subdomains.map((s) => ({
      code: s.code,
      label: s.label,
      description: s.description,
      objectives: objectivesMap.get(`${ds.label}||${s.label}`) ?? [],
    })),
  }));

  return { domains };
}

async function generateSuccessCriteria(
  objective: string,
  subject: string,
  levels: string[],
  deepSeekKey: string,
): Promise<string[]> {
  const systemPrompt =
    "Tu es un expert pédagogique. Réponds en JSON valide uniquement, sans markdown.";

  const userPrompt = `Génère 3 à 5 critères de réussite observables et concrets pour cet objectif en ${subject} pour ${levels.join("/")} (élèves français).

Objectif : "${objective}"

Les critères doivent être formulés du point de vue de l'élève ("L'élève est capable de...").
Réponds : { "criteria": ["critère 1", "critère 2", ...] }`;

  try {
    const content = await callDeepSeek(systemPrompt, userPrompt, deepSeekKey, 600);
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.criteria) ? parsed.criteria : [];
  } catch {
    return [];
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isServiceRole) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );

      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) return json({ error: "Unauthorized" }, 401);

      const { data: roles } = await supabaseUser
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "teacher"]);

      if (!roles || roles.length === 0) {
        return json({ error: "Forbidden: admin or teacher role required" }, 403);
      }
    }

    const body = await req.json();
    const { edition_id } = body as { edition_id?: string };
    if (!edition_id) return json({ error: "Missing edition_id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch edition
    const { data: edition, error: editionError } = await admin
      .from("curriculum_edition")
      .select("id, subject, cycle, bo_reference, source_pdf_url, status, subject_id")
      .eq("id", edition_id)
      .single();

    if (editionError || !edition) {
      return json({ error: `Edition not found: ${editionError?.message}` }, 404);
    }

    if (!edition.source_pdf_url) {
      return json(
        { error: `Edition "${edition.bo_reference}" has no source_pdf_url — add the PDF URL first.` },
        422,
      );
    }

    // Idempotency guard
    const { data: existingDomains } = await admin
      .from("domains")
      .select("id")
      .eq("edition_id", edition_id)
      .limit(1);

    if (existingDomains && existingDomains.length > 0) {
      return json({ error: "Edition already has ingested domains. Delete them first to re-ingest." }, 409);
    }

    // Resolve API keys
    const { value: mistralKey } = await resolveProviderKey("Mistral");
    const { value: deepSeekKey } = await resolveProviderKey("DeepSeek");

    // Fetch PDF
    console.log(`[ingest] Fetching PDF: ${edition.source_pdf_url}`);
    const pdfRes = await fetch(edition.source_pdf_url);
    if (!pdfRes.ok) {
      return json({ error: `Failed to fetch PDF (${pdfRes.status}): ${edition.source_pdf_url}` }, 502);
    }
    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
    console.log(`[ingest] PDF fetched (${pdfBytes.length} bytes)`);

    // Step 1: Extract text with Mistral OCR
    console.log("[ingest] Extracting text with Mistral OCR...");
    const pdfText = await extractTextFromPdf(pdfBytes, mistralKey);
    console.log(`[ingest] Extracted ${pdfText.length} characters of text`);

    // Step 2: Structure with DeepSeek
    console.log("[ingest] Structuring curriculum with DeepSeek...");
    const extraction = await extractCurriculumFromText(
      pdfText,
      edition.subject,
      edition.cycle,
      edition.bo_reference,
      deepSeekKey,
    );
    console.log(`[ingest] Extracted ${extraction.domains.length} domains`);

    const contentHash = await sha256Hex(JSON.stringify(extraction));

    // ── Insert content tree ───────────────────────────────────────────────────

    let totalDomains = 0;
    let totalSubdomains = 0;
    let totalObjectives = 0;
    let totalCriteria = 0;

    // Resolve subject_id from the edition row (populated by migration) or fall back to slug lookup.
    let subjectId: string | null = edition.subject_id ?? null;
    if (!subjectId) {
      const slugMap: Record<string, string> = {
        francais: "francais",
        mathematiques: "mathematiques",
        histoire: "history",
        geographie: "geography",
        sciences: "physics",
        emc: "emc",
      };
      const slug = slugMap[edition.subject] ?? edition.subject;
      const { data: subjectRow } = await admin
        .from("subjects")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      subjectId = subjectRow?.id ?? null;
    }

    const prefix = editionPrefix(edition.subject, edition.cycle);

    for (let di = 0; di < extraction.domains.length; di++) {
      const domain = extraction.domains[di];
      // Use coded PK to avoid collisions across editions (e.g. "FRA-C3-D1").
      const domainCode = domain.code ?? `${prefix}-D${di + 1}`;

      const { data: domainRow, error: domainErr } = await admin
        .from("domains")
        .insert({
          code: domainCode,
          label: domain.label,
          domain: domainCode,        // PK column — must be globally unique
          subject_id: subjectId,
          edition_id: edition_id,
        })
        .select("id")
        .single();

      if (domainErr || !domainRow) {
        throw new Error(`Failed to insert domain "${domain.label}": ${domainErr?.message}`);
      }

      const domainId = domainRow.id as string;
      totalDomains++;

      for (let si = 0; si < domain.subdomains.length; si++) {
        const subdomain = domain.subdomains[si];
        const subdomainCode = subdomain.code ?? `${domainCode}-S${si + 1}`;

        const { data: subdomainRow, error: subdomainErr } = await admin
          .from("subdomains")
          .insert({
            code: subdomainCode,
            label: subdomain.label,
            subdomain: subdomain.label,   // human-readable name; not a PK
            domain: domainCode,           // text FK → domains.domain
            domain_id_new: domainId,
            subject_id: subjectId,
          })
          .select("id_new")
          .single();

        if (subdomainErr || !subdomainRow) {
          throw new Error(`Failed to insert subdomain "${subdomain.label}": ${subdomainErr?.message}`);
        }

        const subdomainIdNew = subdomainRow.id_new as string;
        totalSubdomains++;

        // Insert objectives for this subdomain
        const objectiveIdMap: Array<{ idNew: string; text: string; levels: string[]; hasCriteria: boolean }> = [];

        for (const objective of subdomain.objectives) {
          const { data: objectiveRow, error: objectiveErr } = await admin
            .from("objectives")
            .insert({
              id: crypto.randomUUID(),
              text: objective.text,
              level: objective.levels.join(","),
              subdomain: subdomain.label,
              subject_id_uuid: subjectId,
              domain_id_uuid: domainId,
              subdomain_id_uuid: subdomainIdNew,
            })
            .select("id_new")
            .single();

          if (objectiveErr || !objectiveRow) {
            throw new Error(`Failed to insert objective: ${objectiveErr?.message}`);
          }

          totalObjectives++;
          const hasCriteria = objective.successCriteria.filter((c) => c.trim().length > 0).length > 0;
          objectiveIdMap.push({
            idNew: objectiveRow.id_new as string,
            text: objective.text,
            levels: objective.levels,
            hasCriteria,
          });

          // Insert official criteria immediately if the PDF contained them
          if (hasCriteria) {
            const criteriaRows = objective.successCriteria
              .filter((c) => c.trim().length > 0)
              .map((text) => ({
                id: crypto.randomUUID(),
                text,
                source: "official",
                objective_id_uuid: objectiveRow.id_new,
                domain_id_uuid: domainId,
                subdomain_id_uuid: subdomainIdNew,
              }));
            const { error: cErr } = await admin.from("success_criteria").insert(criteriaRows);
            if (cErr) console.warn(`[ingest] criteria insert warn: ${cErr.message}`);
            else totalCriteria += criteriaRows.length;
          }
        }

        // Generate criteria for objectives that had none — batched 5 at a time
        const needsGeneration = objectiveIdMap.filter((o) => !o.hasCriteria);
        const BATCH = 5;
        for (let b = 0; b < needsGeneration.length; b += BATCH) {
          const batch = needsGeneration.slice(b, b + BATCH);
          const generated = await Promise.all(
            batch.map((o) =>
              generateSuccessCriteria(o.text, edition.subject, o.levels, deepSeekKey)
                .then((criteria) => ({ idNew: o.idNew, criteria }))
            ),
          );
          for (const { idNew, criteria } of generated) {
            if (criteria.length === 0) continue;
            const rows = criteria.map((text) => ({
              id: crypto.randomUUID(),
              text,
              source: "generated",
              objective_id_uuid: idNew,
              domain_id_uuid: domainId,
              subdomain_id_uuid: subdomainIdNew,
            }));
            const { error: cErr } = await admin.from("success_criteria").insert(rows);
            if (cErr) console.warn(`[ingest] generated criteria warn: ${cErr.message}`);
            else totalCriteria += rows.length;
          }
        }
      }
    }

    // Update edition metadata
    await admin
      .from("curriculum_edition")
      .update({ content_hash: contentHash, ingested_at: new Date().toISOString() })
      .eq("id", edition_id);

    console.log(
      `[ingest] Done: ${totalDomains} domains, ${totalSubdomains} subdomains, ${totalObjectives} objectives, ${totalCriteria} criteria`,
    );

    return json({
      success: true,
      edition_id,
      bo_reference: edition.bo_reference,
      stats: {
        domains: totalDomains,
        subdomains: totalSubdomains,
        objectives: totalObjectives,
        success_criteria: totalCriteria,
      },
    });
  } catch (error) {
    console.error("[ingest] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
});
