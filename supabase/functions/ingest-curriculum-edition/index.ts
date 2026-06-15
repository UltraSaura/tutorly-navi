import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveProviderKey } from "../_shared/resolveProviderKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types matching the resolveEdition.ts service expectations ────────────────

interface ExtractedObjective {
  text: string;
  levels: string[]; // e.g. ["CM1", "CM2", "6e"] or ["CM1"] for level-specific
  successCriteria: string[]; // plain text criteria to insert as success_criteria rows
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

function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = encoder.encode(data);
  return crypto.subtle.digest("SHA-256", buf).then((hash) =>
    Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function uploadPdfToOpenAI(pdfBytes: Uint8Array, apiKey: string): Promise<string> {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, "programme.pdf");
  form.append("purpose", "user_data");

  const res = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI file upload failed: ${err}`);
  }

  const data = await res.json();
  return data.id as string;
}

async function deleteOpenAIFile(fileId: string, apiKey: string): Promise<void> {
  await fetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => {}); // non-fatal
}

async function extractCurriculumFromPdf(
  fileId: string,
  subject: string,
  cycle: string,
  boReference: string,
  apiKey: string,
): Promise<ExtractionResult> {
  const cycleLevels: Record<string, string[]> = {
    "cycle 2": ["CP", "CE1", "CE2"],
    "cycle 3": ["CM1", "CM2", "6e"],
  };
  const levels = cycleLevels[cycle] ?? [];

  const prompt = `Tu es un expert du système éducatif français. Ce document est le programme officiel de "${subject}" pour le "${cycle}" (${boReference}).

Extrais FIDÈLEMENT la structure du programme en JSON. Ne paraphrase pas, ne résume pas, copie exactement les textes du document.

Niveaux concernés par ce cycle : ${levels.join(", ")}.

Structure attendue (JSON valide uniquement, sans markdown) :
{
  "domains": [
    {
      "code": "code court ou null si absent",
      "label": "nom court du domaine (≤ 60 car.)",
      "description": "intitulé complet du domaine tel qu'il apparaît dans le document",
      "subdomains": [
        {
          "code": "code ou null",
          "label": "nom court de la sous-partie (≤ 80 car.)",
          "description": "intitulé complet de la compétence/thème",
          "objectives": [
            {
              "text": "énoncé exact de l'attendu de fin de cycle ou objectif d'apprentissage",
              "levels": ["CM1", "CM2", "6e"],
              "successCriteria": [
                "exemple de réussite ou critère observable tel qu'il apparaît dans le livret ou le programme"
              ]
            }
          ]
        }
      ]
    }
  ]
}

Règles :
- "levels" contient les niveaux auxquels l'objectif s'applique. S'il s'applique à tout le cycle, inclus tous les niveaux du cycle.
- Si le document fournit des exemples de réussite (livret d'exemples), inclus-les dans "successCriteria". Sinon, laisse le tableau vide.
- Ne génère AUCUN contenu. Extrais uniquement ce qui est dans le document.
- Réponds avec du JSON valide, sans balises markdown.`;

  const body = {
    model: "gpt-5",
    messages: [
      {
        role: "user",
        content: [
          { type: "file", file: { file_id: fileId } },
          { type: "text", text: prompt },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI extraction failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");

  try {
    return JSON.parse(content) as ExtractionResult;
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`);
  }
}

async function generateSuccessCriteria(
  objective: string,
  subject: string,
  levels: string[],
  apiKey: string,
): Promise<string[]> {
  const body = {
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content:
          "Tu es un expert pédagogique. Réponds en JSON valide uniquement, sans markdown.",
      },
      {
        role: "user",
        content: `Génère 3 à 5 critères de réussite observables et concrets pour cet objectif d'apprentissage en ${subject} pour ${levels.join("/")} (élèves français).

Objectif : "${objective}"

Les critères doivent être formulés du point de vue de l'élève ("L'élève est capable de...").
Réponds avec ce JSON :
{ "criteria": ["critère 1", "critère 2", ...] }`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 600,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  try {
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

    // Auth check — admin/teacher only
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

    // Fetch OpenAI key
    const { value: openAIKey } = await resolveProviderKey("OpenAI");

    // Fetch PDF
    console.log(`[ingest] Fetching PDF: ${edition.source_pdf_url}`);
    const pdfRes = await fetch(edition.source_pdf_url);
    if (!pdfRes.ok) {
      return json({ error: `Failed to fetch PDF (${pdfRes.status}): ${edition.source_pdf_url}` }, 502);
    }
    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
    console.log(`[ingest] PDF fetched (${pdfBytes.length} bytes)`);

    // Upload to OpenAI
    const fileId = await uploadPdfToOpenAI(pdfBytes, openAIKey);
    console.log(`[ingest] Uploaded to OpenAI as file ${fileId}`);

    let extraction: ExtractionResult;
    try {
      // Pass 1: extract curriculum hierarchy
      extraction = await extractCurriculumFromPdf(
        fileId,
        edition.subject,
        edition.cycle,
        edition.bo_reference,
        openAIKey,
      );
      console.log(`[ingest] Extracted ${extraction.domains.length} domains`);
    } finally {
      await deleteOpenAIFile(fileId, openAIKey);
    }

    const contentHash = await sha256Hex(JSON.stringify(extraction));

    // Check for existing domains on this edition (idempotency guard)
    const { data: existingDomains } = await admin
      .from("domains")
      .select("id")
      .eq("edition_id", edition_id)
      .limit(1);

    if (existingDomains && existingDomains.length > 0) {
      return json({
        error: `Edition already has ingested domains. Delete them first or use the update endpoint.`,
        domains_count: existingDomains.length,
      }, 409);
    }

    // ── Insert content tree ───────────────────────────────────────────────────

    let totalDomains = 0;
    let totalSubdomains = 0;
    let totalObjectives = 0;
    let totalCriteria = 0;

    for (const domain of extraction.domains) {
      // Insert domain
      const { data: domainRow, error: domainErr } = await admin
        .from("domains")
        .insert({
          code: domain.code,
          label: domain.label,
          domain: domain.description,
          edition_id: edition_id,
        })
        .select("id")
        .single();

      if (domainErr || !domainRow) {
        throw new Error(`Failed to insert domain "${domain.label}": ${domainErr?.message}`);
      }

      const domainId = domainRow.id as string;
      totalDomains++;

      for (const subdomain of domain.subdomains) {
        // Insert subdomain (id_new auto-generated via default gen_random_uuid())
        const { data: subdomainRow, error: subdomainErr } = await admin
          .from("subdomains")
          .insert({
            code: subdomain.code,
            label: subdomain.label,
            subdomain: subdomain.description,
            domain_id_new: domainId,
          })
          .select("id_new")
          .single();

        if (subdomainErr || !subdomainRow) {
          throw new Error(`Failed to insert subdomain "${subdomain.label}": ${subdomainErr?.message}`);
        }

        const subdomainIdNew = subdomainRow.id_new as string;
        totalSubdomains++;

        for (const objective of subdomain.objectives) {
          // Insert objective — id is required (not auto-generated)
          const { data: objectiveRow, error: objectiveErr } = await admin
            .from("objectives")
            .insert({
              id: crypto.randomUUID(),
              text: objective.text,
              level: objective.levels.join(","),
              subdomain: subdomain.description,
              domain_id_uuid: domainId,
              subdomain_id_uuid: subdomainIdNew,
            })
            .select("id, id_new")
            .single();

          if (objectiveErr || !objectiveRow) {
            throw new Error(`Failed to insert objective: ${objectiveErr?.message}`);
          }

          const objectiveIdNew = objectiveRow.id_new as string;
          totalObjectives++;

          // Determine success criteria: use extracted ones or generate if empty
          let criteriaTexts = objective.successCriteria.filter((c) => c.trim().length > 0);
          const source: "official" | "generated" = criteriaTexts.length > 0 ? "official" : "generated";

          if (criteriaTexts.length === 0) {
            // Pass 2: generate criteria for this objective
            criteriaTexts = await generateSuccessCriteria(
              objective.text,
              edition.subject,
              objective.levels,
              openAIKey,
            );
          }

          if (criteriaTexts.length > 0) {
            const criteriaRows = criteriaTexts.map((text) => ({
              id: crypto.randomUUID(),
              text,
              source,
              objective_id_uuid: objectiveIdNew,
              domain_id_uuid: domainId,
              subdomain_id_uuid: subdomainIdNew,
            }));

            const { error: criteriaErr } = await admin
              .from("success_criteria")
              .insert(criteriaRows);

            if (criteriaErr) {
              console.warn(`[ingest] Failed to insert criteria for objective: ${criteriaErr.message}`);
            } else {
              totalCriteria += criteriaTexts.length;
            }
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
