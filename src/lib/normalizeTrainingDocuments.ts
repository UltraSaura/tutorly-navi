import type { DocumentAsset } from "@/types/training";
import type { TrainingDocument } from "@/services/examImportService";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRenderMode(value: unknown): DocumentAsset["render_mode"] {
  if (
    value === "image_first" ||
    value === "table_first" ||
    value === "image_only" ||
    value === "table_only"
  ) {
    return value;
  }
  return "image_first";
}

function normalizeType(value: unknown): DocumentAsset["type"] | null {
  if (value === "image" || value === "table" || value === "graph") return value;
  return null;
}

function toAssetId(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function normalizeTrainingDocuments(
  documents: TrainingDocument[] | DocumentAsset[] | unknown
): DocumentAsset[] {
  if (!Array.isArray(documents)) return [];

  return documents
    .map((doc, index): DocumentAsset | null => {
      if (!isRecord(doc)) return null;

      // New format
      if (typeof doc.id === "string" && typeof doc.render_mode === "string") {
        const type = normalizeType(doc.type);
        if (!type) return null;
        return {
          id: toAssetId(doc.id, `doc_${index}`),
          type,
          render_mode: normalizeRenderMode(doc.render_mode),
          label: typeof doc.label === "string" ? doc.label : undefined,
          alt: typeof doc.alt === "string" ? doc.alt : undefined,
          usage: doc.usage === "shared" || doc.usage === "question_specific" ? doc.usage : undefined,
          linked_question_id: typeof doc.linked_question_id === "string" ? doc.linked_question_id : undefined,
          image:
            isRecord(doc.image) && typeof doc.image.public_url === "string"
              ? {
                  public_url: doc.image.public_url,
                  width: typeof doc.image.width === "number" ? doc.image.width : undefined,
                  height: typeof doc.image.height === "number" ? doc.image.height : undefined,
                }
              : undefined,
          table:
            isRecord(doc.table) && Array.isArray(doc.table.headers) && Array.isArray(doc.table.rows)
              ? {
                  headers: (doc.table.headers as unknown[]).map(String),
                  rows: (doc.table.rows as unknown[]).map((row) =>
                    Array.isArray(row) ? row.map((cell) => (typeof cell === "number" ? cell : String(cell))) : []
                  ),
                }
              : undefined,
        };
      }

      // Legacy format (TrainingDocument)
      const legacy = doc as TrainingDocument;
      const type = normalizeType(legacy.type);
      if (!type) return null;

      const publicUrl = typeof legacy.public_url === "string" ? legacy.public_url : undefined;

      return {
        id: toAssetId(legacy.id, `doc_${index}`),
        type,
        render_mode: normalizeRenderMode(legacy.render_mode),
        label: typeof legacy.label === "string" ? legacy.label : undefined,
        alt: typeof legacy.alt === "string" ? legacy.alt : undefined,
        image: publicUrl ? { public_url: publicUrl } : undefined,
        table: legacy.table
          ? {
              headers: legacy.table.headers ?? [],
              rows: (legacy.table.rows ?? []).map((row) => row.map((cell) => String(cell))),
            }
          : undefined,
      };
    })
    .filter((doc): doc is DocumentAsset => doc !== null);
}

