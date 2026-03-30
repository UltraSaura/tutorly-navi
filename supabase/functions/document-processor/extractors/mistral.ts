/**
 * Mistral OCR Extractor
 * Uses Mistral's OCR API (mistral-ocr-latest) for document and image text extraction.
 * Supports images (PNG, JPEG, etc.) and PDFs.
 * Returns structured markdown text preserving headings, lists, tables, and math.
 */

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
