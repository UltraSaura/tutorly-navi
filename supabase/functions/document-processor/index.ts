
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processDocument } from "./documentService.ts";
import {
  authenticateRequest,
  consumeRateLimit,
  handleCors,
  jsonResponse,
  parseJsonBody,
  recordSecurityAuditEvent,
  withTimeout,
} from "../_shared/security.ts";

const MAX_BODY_BYTES = Number(Deno.env.get("DOCUMENT_PROCESSOR_MAX_BODY_BYTES") ?? 12_000_000);
const MAX_PDF_BYTES = Number(Deno.env.get("DOCUMENT_PROCESSOR_MAX_PDF_BYTES") ?? 8_000_000);
const MAX_IMAGE_BYTES = Number(Deno.env.get("DOCUMENT_PROCESSOR_MAX_IMAGE_BYTES") ?? 5_000_000);
const MAX_PDF_PAGES = Number(Deno.env.get("DOCUMENT_PROCESSOR_MAX_PDF_PAGES") ?? 10);
const REQUEST_LIMIT = Number(Deno.env.get("DOCUMENT_PROCESSOR_RATE_LIMIT") ?? 20);
const REQUEST_WINDOW_SECONDS = Number(Deno.env.get("DOCUMENT_PROCESSOR_RATE_WINDOW_SECONDS") ?? 3600);
const PROCESSING_TIMEOUT_MS = Number(Deno.env.get("DOCUMENT_PROCESSOR_TIMEOUT_MS") ?? 60_000);

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type DocumentProcessorBody = {
  fileData?: unknown;
  fileType?: unknown;
  fileName?: unknown;
  subjectId?: unknown;
  mode?: unknown;
  rowPrompt?: unknown;
  problemContext?: unknown;
};

function extractBase64Payload(fileData: string): string | null {
  const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return match[2];
}

function decodeBase64(fileData: string): Uint8Array | null {
  const payload = extractBase64Payload(fileData);
  if (!payload) return null;

  try {
    const binary = atob(payload);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function hasPngSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function hasJpegSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function hasWebpSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = new TextDecoder().decode(bytes.slice(0, 4));
  const webp = new TextDecoder().decode(bytes.slice(8, 12));
  return riff === "RIFF" && webp === "WEBP";
}

function detectActualMimeType(bytes: Uint8Array): string | null {
  if (hasPdfSignature(bytes)) return "application/pdf";
  if (hasPngSignature(bytes)) return "image/png";
  if (hasJpegSignature(bytes)) return "image/jpeg";
  if (hasWebpSignature(bytes)) return "image/webp";
  return null;
}

function estimatePdfPageCount(bytes: Uint8Array): number {
  const text = new TextDecoder().decode(bytes);
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth.response || !auth.context) {
      return auth.response!;
    }

    const { adminClient, user, requestId } = auth.context;

    const bodyResult = await parseJsonBody<DocumentProcessorBody>(req, MAX_BODY_BYTES);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const rateLimit = await consumeRateLimit(adminClient, {
      scope: "document-processor",
      actorKey: user.id,
      limit: REQUEST_LIMIT,
      windowSeconds: REQUEST_WINDOW_SECONDS,
    });

    if (!rateLimit.allowed) {
      await recordSecurityAuditEvent(adminClient, {
        requestId,
        scope: "document-processor",
        eventType: "rate_limit",
        outcome: "blocked",
        actorUserId: user.id,
      });
      return jsonResponse(req, { error: "Usage limit reached", requestId }, 429);
    }

    const { fileData, fileType, fileName, subjectId, mode, rowPrompt, problemContext } = bodyResult.data;

    if (
      typeof fileData !== "string" ||
      typeof fileType !== "string" ||
      typeof fileName !== "string" ||
      fileData.trim().length === 0 ||
      fileName.trim().length === 0
    ) {
      return jsonResponse(req, { error: "Invalid request body", requestId }, 400);
    }

    if (!SUPPORTED_MIME_TYPES.has(fileType)) {
      return jsonResponse(req, { error: "Unsupported file type", requestId }, 415);
    }

    const bytes = decodeBase64(fileData);
    if (!bytes) {
      return jsonResponse(req, { error: "Malformed file data", requestId }, 400);
    }

    const detectedMimeType = detectActualMimeType(bytes);
    if (!detectedMimeType || detectedMimeType !== fileType) {
      return jsonResponse(req, { error: "Unsupported or spoofed file type", requestId }, 415);
    }

    const sizeLimit = fileType === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (bytes.byteLength > sizeLimit) {
      return jsonResponse(req, { error: "File too large", requestId }, 413);
    }

    if (fileType === "application/pdf") {
      const estimatedPages = estimatePdfPageCount(bytes);
      if (estimatedPages > MAX_PDF_PAGES) {
        return jsonResponse(req, { error: "PDF exceeds page limit", requestId }, 413);
      }
    }

    const result = await withTimeout(
      processDocument(fileData, fileType, fileName, typeof subjectId === "string" ? subjectId : undefined, {
        mode,
        rowPrompt,
        problemContext,
      }),
      PROCESSING_TIMEOUT_MS,
    );

    await recordSecurityAuditEvent(adminClient, {
      requestId,
      scope: "document-processor",
      eventType: "request",
      outcome: "success",
      actorUserId: user.id,
      metadata: {
        fileType,
        fileSizeBytes: bytes.byteLength,
      },
    });

    return jsonResponse(req, result as Record<string, unknown>, 200);
  } catch (error) {
    console.error("[document-processor] request failed", {
      name: (error as Error).name,
      message: (error as Error).message || String(error),
    });

    if ((error as Error).message === "TIMEOUT") {
      return jsonResponse(req, { error: "Document processing timed out" }, 504);
    }

    return jsonResponse(req, { error: "Document processing failed" }, 500);
  }
});
