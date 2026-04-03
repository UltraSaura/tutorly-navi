/**
 * Mistral OCR Extractor
 * Uses Mistral's OCR API (mistral-ocr-latest) for document and image text extraction.
 * Supports images (PNG, JPEG, etc.) and PDFs.
 * Returns structured markdown text preserving headings, lists, tables, and math.
 */

/**
 * Extract exercises from an image using Mistral Vision (chat/completions with image).
 * Returns a JSON array of {question, answer} or null if it fails.
 */
export async function extractWithMistralVision(fileData: string, fileType: string): Promise<Array<{question: string, answer: string}> | null> {
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
            { type: 'text', text: 'Extract ALL math exercises from this image. For each exercise, identify the complete math expression/question and the student\'s written answer if one is visible. Return ONLY a JSON array like: [{"question": "23 × 4", "answer": "92"}]. If no answer is visible for an exercise, set answer to empty string "". Use × for multiplication, ÷ for division. Include ALL exercises you can see. Do not add any explanation, just the JSON array.' }
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

    return valid.map((ex: any) => ({
      question: ex.question,
      answer: ex.answer || '',
    }));
  } catch (error) {
    console.error('🔮 Mistral Vision: Error:', (error as Error).message);
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
