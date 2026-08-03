import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  authenticateRequest,
  handleCors,
  jsonResponse,
  parseJsonBody,
  recordSecurityAuditEvent,
} from "../_shared/security.ts";
import {
  type BundleExamAsset,
  type BundleExercise,
  type BundlePaper,
  type BundleProgramLink,
  type BundleSource,
  type ExamBundle,
  type ExamSeries,
  type ExamVariant,
  type ImportMode,
  type ParsingStatus,
  type SourceName,
  validateExamBundle,
} from "./validation.ts";
const MAX_BODY_BYTES = Number(Deno.env.get("EXAM_IMPORT_MAX_BODY_BYTES") ?? 20_000_000);

interface Diagnostic {
  table: string;
  code: string | null;
  message: string;
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function diagFromPgError(table: string, error: unknown): Diagnostic {
  return {
    table,
    code: typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") || null : null,
    message: typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message ?? "") || String(error) : String(error),
  };
}

function deterministicUuid(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const hash = new Uint8Array(new ArrayBuffer(16));
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const byte of bytes) {
    h1 ^= byte;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= byte + ((h1 >>> 24) & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  for (let i = 0; i < 16; i += 1) {
    const value = i < 8 ? h1 : h2;
    hash[i] = (value >>> ((i % 4) * 8)) & 0xff;
    h1 = Math.imul(h1 ^ hash[i], 0x01000193);
    h2 = Math.imul(h2 ^ hash[i], 0x85ebca6b);
  }
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeText(value: string | undefined | null): string {
  return value ?? '';
}

function levelForExam(exam: string | undefined | null): string | null {
  if (exam === 'dnb') return '3eme';
  if (exam === 'bac') return 'terminale';
  if (exam === 'bac_francais') return '1ere';
  if (exam === 'cap') return 'cap';
  return null;
}

function buildImportFailure(
  req: Request,
  requestId: string,
  status = 500,
  error = "Exam import failed",
): Response {
  return jsonResponse(req, {
    success: false,
    error,
    requestId,
  }, status);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const auth = await authenticateRequest(req, { requireAdmin: true });
    if (auth.response || !auth.context) {
      return auth.response!;
    }

    if (req.method !== 'POST') {
      return jsonResponse(req, {
        success: false,
        error: 'Method not allowed',
        requestId: auth.context.requestId,
      }, 405);
    }

    const supabaseAdmin = auth.context.adminClient;

    const bodyResult = await parseJsonBody<ExamBundle>(req, MAX_BODY_BYTES);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const validation = validateExamBundle(bodyResult.data);
    if (!validation.ok) {
      await recordSecurityAuditEvent(supabaseAdmin, {
        requestId: auth.context.requestId,
        scope: "import-exam-bundle",
        eventType: "validation_failed",
        outcome: "rejected",
        actorUserId: auth.context.user.id,
        metadata: {
          reason: validation.error,
        },
      });

      return jsonResponse(req, {
        success: false,
        error: validation.error,
        requestId: auth.context.requestId,
      }, validation.status);
    }

    const bundle: ExamBundle = validation.data;
    const mode: ImportMode = bundle.mode === 'replace' ? 'replace' : 'upsert';
    const sources = bundle.sources ?? [];
    const papers = bundle.papers ?? [];
    const exercises = bundle.exercises ?? [];
    const assets = bundle.exam_assets ?? [];
    const links = bundle.exercise_program_links ?? [];
    const diagnostics: Diagnostic[] = [];
    const counts = { sources: 0, papers: 0, exercises: 0, exam_assets: 0, exercise_program_links: 0 };
    const CHUNK_SIZE = 100;

    const sourceIdByUrl = new Map<string, string>();
    for (const source of sources) {
      sourceIdByUrl.set(source.source_url, deterministicUuid(`exam_source:${source.source_url}`));
    }
    for (const paper of papers) {
      if (!sourceIdByUrl.has(paper.source_url)) {
        sourceIdByUrl.set(paper.source_url, deterministicUuid(`exam_source:${paper.source_url}`));
      }
    }

    const paperIdByImportId = new Map<string, string>();
    for (const paper of papers) {
      paperIdByImportId.set(paper.id, deterministicUuid(`exam_paper:${paper.pdf_hash || paper.id}`));
    }

    const exerciseIdByImportId = new Map<string, string>();
    for (const exercise of exercises) {
      exerciseIdByImportId.set(exercise.id, deterministicUuid(`exam_exercise:${exercise.id}`));
    }

    if (mode === 'replace' && papers.length > 0) {
      const paperIds = papers.map((paper) => paperIdByImportId.get(paper.id)).filter(Boolean) as string[];
      for (const ids of chunk(paperIds, CHUNK_SIZE)) {
        const exerciseIdsForPapers = exerciseIdListForPapers(exercises, ids, paperIdByImportId, exerciseIdByImportId);
        if (exerciseIdsForPapers.length > 0) {
          const result = await supabaseAdmin.from('exam_exercise_program_links').delete().in('exercise_id', exerciseIdsForPapers);
          if (result.error) {
            console.error("[import-exam-bundle] replace delete failed", {
              requestId: auth.context.requestId,
              table: "exam_exercise_program_links",
              code: result.error.code ?? null,
            });
            return buildImportFailure(req, auth.context.requestId);
          }
        }

        let result = await supabaseAdmin.from('exam_exercises').delete().in('paper_id', ids);
        if (result.error) {
          console.error("[import-exam-bundle] replace delete failed", {
            requestId: auth.context.requestId,
            table: "exam_exercises",
            code: result.error.code ?? null,
          });
          return buildImportFailure(req, auth.context.requestId);
        }

        result = await supabaseAdmin.from('exam_papers').delete().in('id', ids);
        if (result.error) {
          console.error("[import-exam-bundle] replace delete failed", {
            requestId: auth.context.requestId,
            table: "exam_papers",
            code: result.error.code ?? null,
          });
          return buildImportFailure(req, auth.context.requestId);
        }
      }
    }

    const sourceRows = [...sourceIdByUrl.entries()].map(([source_url, id]) => {
      const source = sources.find((candidate) => candidate.source_url === source_url);
      const paper = papers.find((candidate) => candidate.source_url === source_url);
      return {
        id,
        source_name: source?.source_name ?? paper?.source_name ?? 'eduscol',
        source_url,
        fetched_at: source?.fetched_at ?? paper?.fetched_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    for (const rows of chunk(sourceRows, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin.from('exam_sources').upsert(rows, { onConflict: 'source_url' });
      if (error) {
        console.error("[import-exam-bundle] upsert failed", {
          requestId: auth.context.requestId,
          table: "exam_sources",
          code: error.code ?? null,
        });
        return buildImportFailure(req, auth.context.requestId);
      }
      counts.sources += rows.length;
    }

    const paperRows = papers.map((paper) => ({
      id: paperIdByImportId.get(paper.id)!,
      import_id: paper.id,
      source_id: sourceIdByUrl.get(paper.source_url) ?? null,
      source_name: paper.source_name,
      source_url: paper.source_url,
      fetched_at: paper.fetched_at,
      exam: paper.exam,
      level: paper.level ?? levelForExam(paper.exam),
      session_year: paper.session_year,
      discipline: paper.discipline,
      series: paper.series,
      location: paper.location,
      variant: paper.variant,
      title: paper.title ?? null,
      pdf_url: paper.pdf_url,
      pdf_hash: paper.pdf_hash,
      raw_text: normalizeText(paper.raw_text),
      parsing_status: paper.parsing_status,
      exercise_ids: paper.exercises ?? [],
      updated_at: new Date().toISOString(),
    }));

    for (const rows of chunk(paperRows, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin.from('exam_papers').upsert(rows, { onConflict: 'pdf_hash' });
      if (error) {
        console.error("[import-exam-bundle] upsert failed", {
          requestId: auth.context.requestId,
          table: "exam_papers",
          code: error.code ?? null,
        });
        return buildImportFailure(req, auth.context.requestId);
      }
      counts.papers += rows.length;
    }

    const exerciseRows = exercises.map((exercise) => ({
      id: exerciseIdByImportId.get(exercise.id)!,
      import_id: exercise.id,
      paper_id: paperIdByImportId.get(exercise.paper_id)!,
      source_name: exercise.source_name,
      source_url: exercise.source_url,
      fetched_at: exercise.fetched_at,
      exam: exercise.exam,
      session_year: exercise.session_year,
      discipline: exercise.discipline,
      series: exercise.series,
      location: exercise.location,
      variant: exercise.variant,
      pdf_url: exercise.pdf_url,
      pdf_hash: exercise.pdf_hash,
      exercise_number: exercise.exercise_number,
      title: exercise.title,
      raw_text: normalizeText(exercise.raw_text),
      parsing_status: exercise.parsing_status,
      parsed_content: exercise.parsed_content ?? null,
      parsing_confidence: exercise.parsing_confidence ?? null,
      updated_at: new Date().toISOString(),
    }));

    for (const rows of chunk(exerciseRows, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin.from('exam_exercises').upsert(rows, { onConflict: 'import_id' });
      if (error) {
        console.error("[import-exam-bundle] upsert failed", {
          requestId: auth.context.requestId,
          table: "exam_exercises",
          code: error.code ?? null,
        });
        return buildImportFailure(req, auth.context.requestId);
      }
      counts.exercises += rows.length;
    }

    const assetRows = assets.flatMap((asset, index) => {
      const exercise_id = exerciseIdByImportId.get(asset.exercise_id);
      const paper_id = paperIdByImportId.get(asset.paper_id);
      if (!exercise_id || !paper_id) {
        diagnostics.push({
          table: 'exam_assets',
          code: 'MISSING_PARENT',
          message: 'Skipped exam assets with missing parent references',
        });
        return [];
      }
      return [{
        id: deterministicUuid(`exam_asset:${asset.storage_path}`),
        exercise_id,
        paper_id,
        type: asset.type,
        label: asset.label,
        storage_path: asset.storage_path,
        public_url: asset.public_url ?? null,
        alt: asset.alt ?? null,
        page_number: asset.page_number ?? null,
        sort_order: asset.sort_order ?? index,
        updated_at: new Date().toISOString(),
      }];
    });

    for (const rows of chunk(assetRows, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin
        .from('exam_assets')
        .upsert(rows, { onConflict: 'storage_path' });
      if (error) {
        console.error("[import-exam-bundle] upsert failed", {
          requestId: auth.context.requestId,
          table: "exam_assets",
          code: error.code ?? null,
        });
        return buildImportFailure(req, auth.context.requestId);
      }
      counts.exam_assets += rows.length;
    }

    const linkRows = links.flatMap((link) => {
      const exercise_id = exerciseIdByImportId.get(link.exercise_id);
      if (!exercise_id) {
        diagnostics.push({
          table: 'exam_exercise_program_links',
          code: 'MISSING_EXERCISE',
          message: 'Skipped program links with missing exercise references',
        });
        return [];
      }
      return [{
        id: deterministicUuid(`exam_program_link:${link.exercise_id}:${link.program_entry_id}:${link.program_entry_type}`),
        exercise_id,
        exercise_import_id: link.exercise_id,
        program_entry_id: link.program_entry_id,
        program_entry_type: link.program_entry_type,
        confidence: link.confidence,
        rationale: link.rationale,
        updated_at: new Date().toISOString(),
      }];
    });

    for (const rows of chunk(linkRows, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin
        .from('exam_exercise_program_links')
        .upsert(rows, { onConflict: 'exercise_id,program_entry_id,program_entry_type' });
      if (error) {
        console.error("[import-exam-bundle] upsert failed", {
          requestId: auth.context.requestId,
          table: "exam_exercise_program_links",
          code: error.code ?? null,
        });
        return buildImportFailure(req, auth.context.requestId);
      }
      counts.exercise_program_links += rows.length;
    }

    const verification = await verifyImport(supabaseAdmin, {
      sourceIds: [...sourceIdByUrl.values()],
      paperIds: [...paperIdByImportId.values()],
      exerciseIds: [...exerciseIdByImportId.values()],
      expected: {
        sources: sourceRows.length,
        papers: paperRows.length,
        exercises: exerciseRows.length,
        exam_assets: assetRows.length,
        exercise_program_links: linkRows.length,
      },
    });

    await recordSecurityAuditEvent(supabaseAdmin, {
      requestId: auth.context.requestId,
      scope: "import-exam-bundle",
      eventType: "bundle_import",
      outcome: diagnostics.length === 0 ? "success" : "partial_success",
      actorUserId: auth.context.user.id,
      metadata: {
        mode,
        counts,
        warningCount: diagnostics.length,
      },
    });

    return jsonResponse(req, {
      success: diagnostics.length === 0,
      mode,
      counts,
      diagnostics,
      verification,
      requestId: auth.context.requestId,
    });
  } catch (error) {
    console.error("[import-exam-bundle] request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return buildImportFailure(req, crypto.randomUUID());
  }
});

function exerciseIdListForPapers(
  exercises: BundleExercise[],
  paperIds: string[],
  paperIdByImportId: Map<string, string>,
  exerciseIdByImportId: Map<string, string>,
): string[] {
  const paperIdSet = new Set(paperIds);
  return exercises
    .filter((exercise) => paperIdSet.has(paperIdByImportId.get(exercise.paper_id) ?? ''))
    .map((exercise) => exerciseIdByImportId.get(exercise.id))
    .filter(Boolean) as string[];
}

async function verifyImport(
  supabaseAdmin: SupabaseClient,
  ids: {
    sourceIds: string[];
    paperIds: string[];
    exerciseIds: string[];
    expected: { sources: number; papers: number; exercises: number; exam_assets: number; exercise_program_links: number };
  },
) {
  const [sources, papers, exercises, assets, links] = await Promise.all([
    ids.sourceIds.length
      ? supabaseAdmin.from('exam_sources').select('*', { count: 'exact', head: true }).in('id', ids.sourceIds)
      : Promise.resolve({ count: 0, error: null }),
    ids.paperIds.length
      ? supabaseAdmin.from('exam_papers').select('*', { count: 'exact', head: true }).in('id', ids.paperIds)
      : Promise.resolve({ count: 0, error: null }),
    ids.exerciseIds.length
      ? supabaseAdmin.from('exam_exercises').select('*', { count: 'exact', head: true }).in('id', ids.exerciseIds)
      : Promise.resolve({ count: 0, error: null }),
    ids.expected.exam_assets > 0 && ids.exerciseIds.length
      ? supabaseAdmin.from('exam_assets').select('*', { count: 'exact', head: true }).in('exercise_id', ids.exerciseIds)
      : Promise.resolve({ count: 0, error: null }),
    ids.exerciseIds.length
      ? supabaseAdmin.from('exam_exercise_program_links').select('*', { count: 'exact', head: true }).in('exercise_id', ids.exerciseIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const fk_errors = [sources, papers, exercises, assets, links]
    .filter((result) => result.error)
    .map((result, index) => diagFromPgError(['exam_sources', 'exam_papers', 'exam_exercises', 'exam_assets', 'exam_exercise_program_links'][index], result.error));

  const actual = {
    sources: sources.count ?? 0,
    papers: papers.count ?? 0,
    exercises: exercises.count ?? 0,
    exam_assets: assets.count ?? 0,
    exercise_program_links: links.count ?? 0,
  };
  const count_mismatches = Object.entries(ids.expected)
    .filter(([key, expected]) => actual[key as keyof typeof actual] !== expected)
    .map(([key, expected]) => ({
      table: key,
      expected,
      actual: actual[key as keyof typeof actual],
    }));

  return {
    ...actual,
    fk_errors,
    count_mismatches,
  };
}
