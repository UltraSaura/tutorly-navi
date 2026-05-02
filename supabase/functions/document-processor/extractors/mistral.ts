/**
 * Mistral OCR Extractor
 * Uses Mistral's OCR API (mistral-ocr-latest) for document and image text extraction.
 * Supports images (PNG, JPEG, etc.) and PDFs.
 * Returns structured markdown text preserving headings, lists, tables, and math.
 */

/**
 * Extract exercises from an image using Mistral Vision (chat/completions with image).
 * Returns a JSON array of extracted exercises or null if it fails.
 */
export async function extractWithMistralVision(fileData: string, fileType: string): Promise<Array<{question: string, answer: string, responseType?: 'true_false', choices?: string[]}> | null> {
  const apiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!apiKey) {
    console.log('🔮 Mistral Vision: No API key, skipping');
    return null;
  }

  console.log('🔮 Mistral Vision: Starting LLM-based extraction...');

  let dataUrl: string;
  if (fileData.startsWith('data:')) {
    dataUrl = fileData;
  } else {
    const mime = fileType || 'image/png';
    dataUrl = `data:${mime};base64,${fileData}`;
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: 'Extract ALL math exercises from this image. For each exercise, identify the complete math expression/question and the student\'s written answer if one is visible. Return ONLY a JSON array like: [{"question": "23 × 4", "answer": "92"}]. If no answer is visible for an exercise, set answer to empty string "". For one-page multi-part problems with shared context (for example geometry figures, PARTIE A/B, numbered questions, rectangle/carré dimensions, construction tasks), include the shared statement/context inside each question so the app can reconstruct the grouped problem. For French true/false affirmation worksheets with instructions like "dire si elle est vraie ou fausse", return one item per affirmation with responseType "true_false", choices ["Vrai","Faux"], and answer "" unless the student visibly selected Vrai or Faux. Do NOT treat numbers printed inside an affirmation, such as prices or proposed values, as the student answer. Include shared context needed to judge each affirmation in the question. Use × for multiplication, ÷ for division. Include ALL exercises you can see. Do not add any explanation, just the JSON array.' }
          ]
        }],
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔮 Mistral Vision: API error ${response.status}: ${errorText}`);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    console.log(`🔮 Mistral Vision: Raw response: ${content}`);

    if (!content) return null;

    // Extract JSON array from response (may be wrapped in markdown code block)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('🔮 Mistral Vision: No JSON array found in response');
      return null;
    }

    const exercises = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(exercises) || exercises.length === 0) {
      console.log('🔮 Mistral Vision: Parsed but empty or not an array');
      return null;
    }

    // Validate structure
    const valid = exercises.filter((ex: any) => ex.question && typeof ex.question === 'string');
    console.log(`🔮 Mistral Vision: Successfully extracted ${valid.length} exercises`);
    valid.forEach((ex: any, i: number) => {
      console.log(`  Exercise ${i + 1}: "${ex.question}" -> "${ex.answer || ''}"`);
    });

    return valid.map((ex: any) => {
      const isTrueFalse =
        ex.responseType === 'true_false' ||
        /\bAffirmation\s+[A-Z]\b|vraie?\s+ou\s+fausse?|vrai\s+ou\s+faux/i.test(ex.question);
      const answer = String(ex.answer || '').trim();
      const normalizedAnswer = /^(vrai|true)$/i.test(answer)
        ? 'Vrai'
        : /^(faux|false)$/i.test(answer)
          ? 'Faux'
          : '';

      return {
        question: ex.question,
        answer: isTrueFalse ? normalizedAnswer : answer,
        responseType: isTrueFalse ? 'true_false' as const : undefined,
        choices: isTrueFalse ? (Array.isArray(ex.choices) && ex.choices.length ? ex.choices : ['Vrai', 'Faux']) : undefined,
      };
    });
  } catch (error) {
    console.error('🔮 Mistral Vision: Error:', (error as Error).message);
    return null;
  }
}

export interface JustificationVisionResult {
  rawText: string;
  normalizedText?: string;
  confidence?: number;
  warnings?: string[];
}

function extractJsonObject(content: string): any | null {
  try {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : content;
    return JSON.parse(candidate);
  } catch {
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function normalizeJustificationVisionPayload(payload: any): JustificationVisionResult | null {
  if (!payload || typeof payload !== 'object') return null;
  const rawText = typeof payload.rawText === 'string' ? payload.rawText.trim() : '';
  const normalizedText = typeof payload.normalizedText === 'string' ? payload.normalizedText.trim() : undefined;
  if (!rawText && !normalizedText) return null;

  return {
    rawText: normalizedText || rawText,
    normalizedText,
    confidence: typeof payload.confidence === 'number' ? payload.confidence : undefined,
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.filter((warning: unknown): warning is string => typeof warning === 'string' && warning.trim().length > 0)
      : undefined,
  };
}

export async function extractJustificationWithMistralVision(
  fileData: string,
  fileType: string,
  context: { rowPrompt?: string; problemContext?: string } = {}
): Promise<JustificationVisionResult | null> {
  const apiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!apiKey) {
    console.log('🔮 Justification Vision: No API key, skipping');
    return null;
  }

  const dataUrl = fileData.startsWith('data:')
    ? fileData
    : `data:${fileType || 'image/png'};base64,${fileData}`;

  const prompt = `You are reading ONE student's handwritten math justification image.
Extract only the student's handwritten work. Do not solve the original problem unless it is needed to verify the copied work.
Preserve uncertain digits with "?" instead of guessing. For example, if a digit could be 2 or 8, write "?" or "1?".
Normalize division written as ":" or a fraction bar to "/".
If you see arithmetic equations, verify whether each equation is internally consistent.
Return ONLY JSON with this shape:
{
  "rawText": "exact OCR-like transcription",
  "normalizedText": "clean normalized lines, preserving uncertain digits",
  "confidence": 0.0,
  "warnings": ["short warning strings"]
}
Use confidence from 0 to 1. Add a warning when confidence is low, a digit is uncertain, or an arithmetic equation is inconsistent.

Selected assertion: ${context.rowPrompt || 'not provided'}
Original problem context: ${context.problemContext || 'not provided'}`;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: prompt },
          ],
        }],
        temperature: 0,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔮 Justification Vision: API error ${response.status}: ${errorText}`);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = extractJsonObject(content);
    const normalized = normalizeJustificationVisionPayload(parsed);
    console.log('🔮 Justification Vision result:', JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.error('🔮 Justification Vision failed:', (error as Error).message);
    return null;
  }
}

export async function extractTextWithMistralOCR(fileData: string, fileType: string): Promise<string> {
  const apiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY not configured');
  }

  console.log('🔮 Mistral OCR: Starting extraction...');
  console.log(`🔮 Mistral OCR: File type = ${fileType}, data length = ${fileData.length}`);

  // Build the data URL from base64
  // fileData may already be a data URL (data:image/png;base64,...) or raw base64
  let dataUrl: string;
  if (fileData.startsWith('data:')) {
    dataUrl = fileData;
  } else {
    // Determine MIME type
    const mime = fileType || 'image/png';
    dataUrl = `data:${mime};base64,${fileData}`;
  }

  // Determine document type for Mistral API
  const isPdf = fileType === 'application/pdf';
  
  const documentPayload = isPdf
    ? { type: 'document_url', document_url: dataUrl }
    : { type: 'image_url', image_url: dataUrl };

  const requestBody = {
    model: 'mistral-ocr-latest',
    document: documentPayload,
    include_image_base64: false,
  };

  console.log('🔮 Mistral OCR: Calling API...');

  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`🔮 Mistral OCR: API error ${response.status}: ${errorText}`);
    throw new Error(`Mistral OCR API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log('🔮 Mistral OCR: Response received, pages:', result.pages?.length || 0);

  // Concatenate all pages' markdown content
  if (!result.pages || result.pages.length === 0) {
    throw new Error('Mistral OCR returned no pages');
  }

  const fullText = result.pages
    .map((page: { markdown: string }, index: number) => {
      console.log(`🔮 Mistral OCR: Page ${index + 1} length: ${page.markdown?.length || 0}`);
      return page.markdown || '';
    })
    .join('\n\n');

  if (!fullText || fullText.trim().length === 0) {
    throw new Error('Mistral OCR returned empty text');
  }

  console.log(`🔮 Mistral OCR: Extraction complete, total ${fullText.length} characters`);
  console.log(`🔮 Mistral OCR: Preview: ${fullText.substring(0, 300)}`);

  return fullText;
}
