import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveProviderKey } from "../_shared/resolveProviderKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { data: edition, error: editionError } = await admin
      .from("curriculum_edition")
      .select("id, subject, cycle, bo_reference, source_pdf_url, status")
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

    const { data: existingDomains } = await admin
      .from("domains")
      .select("id")
      .eq("edition_id", edition_id)
      .limit(1);

    if (existingDomains && existingDomains.length > 0) {
      return json({ error: "Edition already has ingested domains. Delete them first to re-ingest." }, 409);
    }

    const { value: mistralKey } = await resolveProviderKey("Mistral");
    const { value: deepSeekKey } = await resolveProviderKey("DeepSeek");

    console.log(`[ingest] Fetching PDF: ${edition.source_pdf_url}`);
    const pdfRes = await fetch(edition.source_pdf_url);
    if (!pdfRes.ok) {
      return json({ error: `Failed to fetch PDF (${pdfRes.status}): ${edition.source_pdf_url}` }, 502);
    }
    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
    console.log(`[ingest] PDF fetched (${pdfBytes.length} bytes)`);

    console.log("[ingest] Extracting text with Mistral OCR...");
    const pdfText = await extractTextFromPdf(pdfBytes, mistralKey);
    console.log(`[ingest] Extracted ${pdfText.length} characters of text`);

    console.log("[ingest] Pass 1: extracting domain structure...");
    const domainStructures = await extractDomainStructure(
      pdfText,
      edition.subject,
      edition.cycle,
      edition.bo_reference,
      deepSeekKey,
    );
    console.log(`[ingest] Pass 1 done: ${domainStructures.length} domains`);

    // Insert domains and subdomains immediately (Phase 1)
    const insertedDomains: Array<{ domainId: string; subdomainIds: Map<string, string>; ds: DomainStructure }> = [];

    for (const ds of domainStructures) {
      const { data: domainRow, error: domainErr } = await admin
        .from("domains")
        .insert({ code: ds.code, label: ds.label, domain: ds.description, edition_id })
        .select("id")
        .single();

      if (domainErr || !domainRow) {
        throw new Error(`Failed to insert domain "${ds.label}": ${domainErr?.message}`);
      }

      const domainId = domainRow.id as string;
      const subdomainIds = new Map<string, string>();

      for (const sub of ds.subdomains) {
        const { data: subRow, error: subErr } = await admin
          .from("subdomains")
          .insert({ code: sub.code, label: sub.label, subdomain: sub.description, domain_id_new: domainId })
          .select("id_new")
          .single();

        if (subErr || !subRow) {
          throw new Error(`Failed to insert subdomain "${sub.label}": ${subErr?.message}`);
        }

        subdomainIds.set(sub.label, subRow.id_new as string);
      }

      insertedDomains.push({ domainId, subdomainIds, ds });
    }

    console.log(`[ingest] Phase 1 saved: ${insertedDomains.length} domains to DB`);

    // Phase 2: objectives — run in background, return 202 immediately
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil(
      (async () => {
        try {
          console.log("[ingest] Pass 2: extracting objectives...");
          let objectivesMap = new Map<string, ExtractedObjective[]>();
          try {
            objectivesMap = await extractAllObjectives(pdfText, domainStructures, edition.cycle, deepSeekKey);
          } catch (err) {
            console.warn(`[ingest] Pass 2 objectives extraction failed: ${err}`);
          }

          let totalObjectives = 0;
          let totalCriteria = 0;

          for (const { domainId, subdomainIds, ds } of insertedDomains) {
            for (const sub of ds.subdomains) {
              const subdomainIdNew = subdomainIds.get(sub.label);
              if (!subdomainIdNew) continue;

              const objectives = objectivesMap.get(`${ds.label}||${sub.label}`) ?? [];

              for (const objective of objectives) {
                const { data: objRow, error: objErr } = await admin
                  .from("objectives")
                  .insert({
                    id: crypto.randomUUID(),
                    text: objective.text,
                    level: objective.levels.join(","),
                    subdomain: sub.description,
                    domain_id_uuid: domainId,
                    subdomain_id_uuid: subdomainIdNew,
                  })
                  .select("id, id_new")
                  .single();

                if (objErr || !objRow) {
                  console.warn(`[ingest] Failed to insert objective: ${objErr?.message}`);
                  continue;
                }

                totalObjectives++;

                let criteriaTexts = objective.successCriteria.filter((c) => c.trim().length > 0);
                const source: "official" | "generated" = criteriaTexts.length > 0 ? "official" : "generated";

                if (criteriaTexts.length === 0) {
                  criteriaTexts = await generateSuccessCriteria(
                    objective.text,
                    edition.subject,
                    objective.levels,
                    deepSeekKey,
                  );
                }

                if (criteriaTexts.length > 0) {
                  const { error: cErr } = await admin.from("success_criteria").insert(
                    criteriaTexts.map((text) => ({
                      id: crypto.randomUUID(),
                      text,
                      source,
                      objective_id_uuid: objRow.id_new as string,
                      domain_id_uuid: domainId,
                      subdomain_id_uuid: subdomainIdNew,
                    })),
                  );
                  if (cErr) console.warn(`[ingest] Failed to insert criteria: ${cErr.message}`);
                  else totalCriteria += criteriaTexts.length;
                }
              }
            }
          }

          const contentHash = await sha256Hex(JSON.stringify({ domainStructures }));
          await admin
            .from("curriculum_edition")
            .update({ content_hash: contentHash, ingested_at: new Date().toISOString() })
            .eq("id", edition_id);

          console.log(`[ingest] Phase 2 done: ${totalObjectives} objectives, ${totalCriteria} criteria`);
        } catch (err) {
          console.error("[ingest] Phase 2 background error:", err);
        }
      })(),
    );

    return json({
      success: true,
      edition_id,
      bo_reference: edition.bo_reference,
      status: "phase1_complete",
      message: "Domains and subdomains saved. Objectives extraction running in background.",
      stats: { domains: insertedDomains.length },
    }, 202);

  } catch (error) {
    console.error("[ingest] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
});
