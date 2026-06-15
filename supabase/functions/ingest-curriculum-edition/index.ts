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

function sha256Hex(data: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then((hash) =>
    Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function extractTextFromPdf(pdfBytes: Uint8Array, mistralKey: string): Promise<string> {
  const base64 = btoa(String.fromCharCode(...pdfBytes));
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

async function extractCurriculumFromText(
  pdfText: string,
  subject: string,
  cycle: string,
  boReference: string,
  deepSeekKey: string,
): Promise<ExtractionResult> {
  const cycleLevels: Record<string, string[]> = {
    "cycle 2": ["CP", "CE1", "CE2"],
    "cycle 3": ["CM1", "CM2", "6e"],
  };
  const levels = cycleLevels[cycle] ?? [];

  const systemPrompt =
    "Tu es un expert du système éducatif français. Tu extrais fidèlement la structure des programmes officiels. Réponds en JSON valide uniquement, sans markdown.";

  const userPrompt = `Voici le texte extrait du programme officiel de "${subject}" pour le "${cycle}" (${boReference}).
Niveaux concernés : ${levels.join(", ")}.

Extrais FIDÈLEMENT la structure en JSON. Ne paraphrase pas, copie exactement les textes.

Structure attendue :
{
  "domains": [
    {
      "code": "code court ou null si absent",
      "label": "nom court du domaine (≤ 60 car.)",
      "description": "intitulé complet du domaine tel qu'il apparaît dans le document",
      "subdomains": [
        {
          "code": "code ou null",
          "label": "nom court (≤ 80 car.)",
          "description": "intitulé complet de la compétence/thème",
          "objectives": [
            {
              "text": "énoncé exact de l'attendu ou objectif d'apprentissage",
              "levels": ${JSON.stringify(levels)},
              "successCriteria": ["exemple de réussite si présent dans le document, sinon tableau vide"]
            }
          ]
        }
      ]
    }
  ]
}

Règles :
- "levels" = niveaux auxquels l'objectif s'applique. S'il s'applique à tout le cycle, inclus tous : ${JSON.stringify(levels)}.
- "successCriteria" = exemples du livret d'accompagnement si disponibles dans le texte, sinon [].
- Ne génère AUCUN contenu. Extrais uniquement ce qui est dans le document.

TEXTE DU PROGRAMME :
${pdfText.slice(0, 60000)}`;

  const content = await callDeepSeek(systemPrompt, userPrompt, deepSeekKey, 8000);

  try {
    return JSON.parse(content) as ExtractionResult;
  } catch {
    throw new Error(`DeepSeek returned invalid JSON: ${content.slice(0, 200)}`);
  }
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

    for (const domain of extraction.domains) {
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
              console.warn(`[ingest] Failed to insert criteria: ${criteriaErr.message}`);
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
