import {
  authenticateRequest,
  createAdminClient,
  handleCors,
  jsonResponse,
  parseJsonBody,
  recordSecurityAuditEvent,
} from "../_shared/security.ts";

const MAX_BODY_BYTES = Number(Deno.env.get("TRAINING_IMPORT_MAX_BODY_BYTES") ?? 20_000_000);
const CHUNK_SIZE = 100;
const ALLOWED_ITEM_TYPES = new Set([
  "multiple_choice",
  "short_answer",
  "numeric",
  "free_response",
  "guided_problem",
  "document_question",
  "proof",
  "calculation",
]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const ALLOWED_STATUSES = new Set(["draft", "reviewed", "published", "rejected"]);

type ImportMode = "upsert" | "replace";

interface TrainingItem {
  id: string;
  source_exercise_id?: string | null;
  paper_id?: string | null;
  exam: string;
  subject_slug: string;
  level?: string | null;
  skill_tags?: string[];
  curriculum_objective_ids?: string[] | null;
  item_type: string;
  prompt: string;
  context?: string | null;
  documents?: unknown[];
  choices?: unknown[] | null;
  expected_answer?: unknown | null;
  solution?: string | null;
  hints?: unknown[] | null;
  questions?: unknown[];
  difficulty: string;
  exam_style?: string | null;
  source_year?: number | null;
  source_label?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
}

interface Payload {
  mode?: ImportMode;
  training_items?: TrainingItem[];
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function levelForExam(exam: string | undefined | null): string | null {
  if (exam === "dnb") return "3eme";
  if (exam === "bac") return "terminale";
  if (exam === "bac_francais") return "1ere";
  if (exam === "cap") return "cap";
  return null;
}

function resolveTrainingItemLevel(item: TrainingItem): string {
  return item.level?.trim() || levelForExam(item.exam) || "unknown";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateTrainingItem(item: TrainingItem): boolean {
  return (
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.exam === "string" &&
    item.exam.trim().length > 0 &&
    typeof item.subject_slug === "string" &&
    item.subject_slug.trim().length > 0 &&
    typeof item.item_type === "string" &&
    ALLOWED_ITEM_TYPES.has(item.item_type) &&
    typeof item.prompt === "string" &&
    item.prompt.trim().length > 0 &&
    typeof item.difficulty === "string" &&
    ALLOWED_DIFFICULTIES.has(item.difficulty) &&
    (item.status === undefined || ALLOWED_STATUSES.has(item.status)) &&
    (item.skill_tags === undefined || isStringArray(item.skill_tags)) &&
    (item.curriculum_objective_ids === undefined || item.curriculum_objective_ids === null || isStringArray(item.curriculum_objective_ids)) &&
    (item.documents === undefined || Array.isArray(item.documents)) &&
    (item.choices === undefined || item.choices === null || Array.isArray(item.choices)) &&
    (item.hints === undefined || item.hints === null || Array.isArray(item.hints)) &&
    (item.questions === undefined || Array.isArray(item.questions)) &&
    (item.metadata === undefined || isRecord(item.metadata)) &&
    (item.source_year === undefined || item.source_year === null || Number.isInteger(item.source_year))
  );
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  try {
    const auth = await authenticateRequest(req, { requireAdmin: true });
    if (auth.response || !auth.context) {
      return auth.response!;
    }

    const { requestId, user } = auth.context;
    const supabaseAdmin = createAdminClient();

    const bodyResult = await parseJsonBody<Payload>(req, MAX_BODY_BYTES);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const payload = bodyResult.data;
    const mode: ImportMode = payload.mode === "replace" ? "replace" : "upsert";
    const items = payload.training_items ?? [];

    if (!Array.isArray(items) || !items.every(validateTrainingItem)) {
      return jsonResponse(req, { success: false, error: "Invalid training item payload", requestId }, 400);
    }

    if (mode === "replace" && items.length > 0) {
      const ids = items.map((item) => item.id);
      for (const batch of chunk(ids, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from("exam_training_items").delete().in("id", batch);
        if (error) {
          console.error("[import-training-items] replace failed", { requestId, message: error.message });
          return jsonResponse(req, { success: false, error: "Training item import failed", requestId }, 500);
        }
      }
    }

    let count = 0;
    const rows = items.map((item) => ({
      id: item.id,
      source_exercise_id: item.source_exercise_id ?? null,
      paper_id: item.paper_id ?? null,
      exam: item.exam,
      subject_slug: item.subject_slug,
      level: resolveTrainingItemLevel(item),
      skill_tags: item.skill_tags ?? [],
      curriculum_objective_ids: item.curriculum_objective_ids ?? null,
      item_type: item.item_type,
      prompt: item.prompt,
      context: item.context ?? null,
      documents: item.documents ?? [],
      choices: item.choices ?? null,
      expected_answer: item.expected_answer ?? null,
      solution: item.solution ?? null,
      hints: item.hints ?? null,
      questions: item.questions ?? [],
      difficulty: item.difficulty,
      exam_style: item.exam_style ?? null,
      source_year: item.source_year ?? null,
      source_label: item.source_label ?? null,
      metadata: item.metadata ?? {},
      status: item.status ?? "draft",
      updated_at: new Date().toISOString(),
    }));

    for (const batch of chunk(rows, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin.from("exam_training_items").upsert(batch, { onConflict: "id" });
      if (error) {
        console.error("[import-training-items] upsert failed", { requestId, message: error.message });
        return jsonResponse(req, { success: false, error: "Training item import failed", requestId }, 500);
      }
      count += batch.length;
    }

    await recordSecurityAuditEvent(supabaseAdmin, {
      requestId,
      scope: "import-training-items",
      eventType: "admin_import",
      outcome: "success",
      actorUserId: user.id,
      metadata: {
        mode,
        trainingItemCount: count,
      },
    });

    return jsonResponse(req, {
      success: true,
      mode,
      counts: { training_items: count },
      requestId,
    });
  } catch (error) {
    console.error("[import-training-items] request failed", {
      message: (error as Error).message || String(error),
    });

    return jsonResponse(req, {
      success: false,
      error: "Training item import failed",
    }, 500);
  }
});
