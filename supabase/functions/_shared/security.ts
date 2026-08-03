import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:8080",
  "capacitor://localhost",
];

type JsonRecord = Record<string, unknown>;

export interface AuthenticatedRequestContext {
  adminClient: SupabaseClient;
  token: string;
  user: User;
  isAdmin: boolean;
  requestId: string;
}

export interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  reset_at: string;
}

function normalizeOrigin(origin: string | null): string | null {
  if (!origin) return null;

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function getAllowedOrigins(): string[] {
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => normalizeOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));

  const inferredOrigins = [
    Deno.env.get("PUBLIC_APP_URL"),
    Deno.env.get("APP_URL"),
    Deno.env.get("SITE_URL"),
  ]
    .map((value) => normalizeOrigin(value ?? null))
    .filter((value): value is string => Boolean(value));

  return unique([...configuredOrigins, ...inferredOrigins, ...DEFAULT_DEV_ORIGINS]);
}

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("cf-connecting-ip") || "unknown";
}

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function isOriginAllowed(req: Request): boolean {
  const origin = normalizeOrigin(req.headers.get("origin"));
  if (!origin) return true;

  return getAllowedOrigins().includes(origin);
}

export function buildCorsHeaders(
  req: Request,
  methods: string[],
  headers: string[],
): HeadersInit {
  const normalizedOrigin = normalizeOrigin(req.headers.get("origin"));
  const responseHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": headers.join(", "),
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (normalizedOrigin && isOriginAllowed(req)) {
    responseHeaders["Access-Control-Allow-Origin"] = normalizedOrigin;
  }

  return responseHeaders;
}

export function jsonResponse(
  req: Request,
  body: JsonRecord,
  status = 200,
  methods = ["POST", "OPTIONS"],
  headers = ["authorization", "x-client-info", "apikey", "content-type"],
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req, methods, headers),
      "Content-Type": "application/json",
    },
  });
}

export function handleCors(
  req: Request,
  methods = ["POST", "OPTIONS"],
  headers = ["authorization", "x-client-info", "apikey", "content-type"],
): Response | null {
  if (!isOriginAllowed(req)) {
    return jsonResponse(
      req,
      { error: "Origin not allowed" },
      403,
      methods,
      headers,
    );
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(req, methods, headers),
    });
  }

  return null;
}

export function enforceMethod(req: Request, allowedMethods: string[]): Response | null {
  if (allowedMethods.includes(req.method)) {
    return null;
  }

  return jsonResponse(req, { error: "Method not allowed" }, 405, [...allowedMethods, "OPTIONS"]);
}

export async function parseJsonBody<T>(
  req: Request,
  maxBytes: number,
): Promise<{ data?: T; response?: Response; rawText?: string }> {
  let rawText: string;

  try {
    rawText = await req.text();
  } catch {
    return {
      response: jsonResponse(req, { error: "Unable to read request body" }, 400),
    };
  }

  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength === 0) {
    return {
      response: jsonResponse(req, { error: "Request body is required" }, 400),
    };
  }

  if (byteLength > maxBytes) {
    return {
      response: jsonResponse(req, { error: "Request too large" }, 413),
    };
  }

  try {
    return { data: JSON.parse(rawText) as T, rawText };
  } catch {
    return {
      response: jsonResponse(req, { error: "Invalid JSON body" }, 400),
    };
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function authenticateRequest(
  req: Request,
  options?: { requireAdmin?: boolean },
): Promise<{ context?: AuthenticatedRequestContext; response?: Response }> {
  const token = getBearerToken(req);
  const requestId = getRequestId(req);

  if (!token) {
    return {
      response: jsonResponse(req, { error: "Authentication required", requestId }, 401),
    };
  }

  const adminClient = createAdminClient();
  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return {
      response: jsonResponse(req, { error: "Invalid authentication", requestId }, 401),
    };
  }

  let isAdmin = false;
  if (options?.requireAdmin) {
    const { data: roles, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);

    if (roleError || !roles || roles.length === 0) {
      return {
        response: jsonResponse(req, { error: "Forbidden", requestId }, 403),
      };
    }

    isAdmin = true;
  }

  return {
    context: {
      adminClient,
      token,
      user,
      isAdmin,
      requestId,
    },
  };
}

export async function consumeRateLimit(
  adminClient: SupabaseClient,
  params: {
    scope: string;
    actorKey: string;
    limit: number;
    windowSeconds: number;
  },
): Promise<RateLimitResult> {
  const { data, error } = await adminClient.rpc("consume_security_rate_limit", {
    p_scope: params.scope,
    p_actor_key: params.actorKey,
    p_limit: params.limit,
    p_window_seconds: params.windowSeconds,
  });

  if (error) {
    throw new Error(`RATE_LIMIT_ERROR:${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return result as RateLimitResult;
}

export async function recordSecurityAuditEvent(
  adminClient: SupabaseClient,
  payload: {
    requestId: string;
    scope: string;
    eventType: string;
    outcome: string;
    actorUserId?: string | null;
    metadata?: JsonRecord;
  },
): Promise<void> {
  const { error } = await adminClient.from("security_audit_events").insert({
    request_id: payload.requestId,
    scope: payload.scope,
    event_type: payload.eventType,
    outcome: payload.outcome,
    actor_user_id: payload.actorUserId ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    console.error("[security_audit_events] insert failed", {
      requestId: payload.requestId,
      scope: payload.scope,
      eventType: payload.eventType,
    });
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error("TIMEOUT"));
      }, timeoutMs);
    }),
  ]);
}
