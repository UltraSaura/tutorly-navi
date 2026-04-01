/**
 * MathPix OCR Extractor (Stub)
 * Future provider for math-heavy document extraction.
 * Requires MATHPIX_APP_ID and MATHPIX_APP_KEY secrets to be configured.
 */

export async function extractTextWithMathPixOCR(fileData: string): Promise<string> {
  const appId = Deno.env.get('MATHPIX_APP_ID');
  const appKey = Deno.env.get('MATHPIX_APP_KEY');

  if (!appId || !appKey) {
    throw new Error('MathPix OCR not configured: MATHPIX_APP_ID and MATHPIX_APP_KEY required');
  }

  // Future implementation placeholder
  throw new Error('MathPix OCR not yet implemented');
}
