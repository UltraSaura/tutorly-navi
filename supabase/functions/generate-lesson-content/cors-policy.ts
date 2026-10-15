export const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'https://stuwy-practice-staging.grittydace256.chatgpt.site',
  'https://9092df94-4f5e-4523-82c3-11c1874777fa.lovableproject.com',
  'https://id-preview--9092df94-4f5e-4523-82c3-11c1874777fa.lovable.app',
];

export function isAllowedOrigin(origin: string | null, allowedOrigins: ReadonlySet<string>): boolean {
  return origin === null || allowedOrigins.has(origin);
}

export function corsHeadersFor(origin: string | null, allowedOrigins: ReadonlySet<string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-family-grant',
    Vary: 'Origin',
  };
  if (origin !== null && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
