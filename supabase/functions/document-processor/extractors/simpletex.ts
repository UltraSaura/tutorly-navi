/**
 * SimpleTex OCR extraction for mathematical content
 * Specialized for LaTeX formula recognition
 */

// Generate random string for SimpleTex authentication
function generateRandomString(length: number = 16): string {
  const chars = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate MD5 hash
async function generateMD5Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create authentication headers for SimpleTex APP method
async function createSimpleTexHeaders(appId: string, appSecret: string, data: Record<string, any> = {}): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const randomStr = generateRandomString(16);
  
  const headers = {
    'timestamp': timestamp,
    'random-str': randomStr,
    'app-id': appId
  };
  
  // Create signature string
  const allKeys = [...Object.keys(data), ...Object.keys(headers)].sort();
  const signParts: string[] = [];
  
  for (const key of allKeys) {
    if (key in headers) {
      signParts.push(`${key}=${headers[key as keyof typeof headers]}`);
    } else {
      signParts.push(`${key}=${data[key]}`);
    }
  }
  
  signParts.push(`secret=${appSecret}`);
  const signString = signParts.join('&');
  
  console.log('SimpleTex signature string:', signString);
  
  const sign = await generateMD5Hash(signString);
  
  return {
    'app-id': appId,
    'timestamp': timestamp,
    'random-str': randomStr,
    'sign': sign
  };
}

/**
 * Extract text from image using SimpleTex Standard Formula Recognition API
 */
export async function extractTextWithSimpleTexOCR(fileData: string): Promise<string> {
  console.log('Starting SimpleTex OCR extraction');
  
  const appId = Deno.env.get('SIMPLETEX_APP_ID');
  const appSecret = Deno.env.get('SIMPLETEX_APP_SECRET');
  
  if (!appId || !appSecret) {
    throw new Error('SimpleTex credentials not configured. Please add SIMPLETEX_APP_ID and SIMPLETEX_APP_SECRET to Supabase secrets.');
  }

  try {
    // Strip data URL prefix if present
    let cleanBase64 = fileData;
    if (fileData.startsWith('data:')) {
      const commaIndex = fileData.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = fileData.substring(commaIndex + 1);
        console.log('Stripped data URL prefix from base64 data');
      }
    }
    
    // Convert base64 to blob for form data
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create form data
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'image/png' });
    formData.append('file', blob, 'image.png');
    
    // Create authentication headers
    const headers = await createSimpleTexHeaders(appId, appSecret, {});
    
    console.log('Making SimpleTex API request...');
    
    // Use standard model for better accuracy
    const response = await fetch('https://server.simpletex.net/api/latex_ocr', {
      method: 'POST',
      headers: headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SimpleTex API error:', response.status, errorText);
      throw new Error(`SimpleTex API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('SimpleTex API response:', JSON.stringify(result, null, 2));
    
    if (!result.status) {
      throw new Error(`SimpleTex API failed: ${result.error || 'Unknown error'}`);
    }
    
    if (result.res && result.res.latex) {
      const latexText = result.res.latex;
      const confidence = result.res.conf || 0;
      
      console.log(`SimpleTex extracted LaTeX with confidence ${confidence}: ${latexText}`);
      
      // Convert LaTeX to more readable text format for exercise extraction
      const readableText = convertLatexToReadableText(latexText);
      
      return readableText;
    }
    
    throw new Error('No text found in SimpleTex response');
    
  } catch (error) {
    console.error('SimpleTex OCR extraction failed:', error);
    throw new Error(`SimpleTex OCR failed: ${error.message}`);
  }
}

/**
 * Convert LaTeX mathematical notation to more readable text
 */
function convertLatexToReadableText(latex: string): string {
  console.log('Converting LaTeX to readable text:', latex);
  
  let text = latex
    // Fractions
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\{([^}]+)\}\/\{([^}]+)\}/g, '($1)/($2)')
    
    // Exponents and subscripts
    .replace(/\^?\{([^}]+)\}/g, '^($1)')
    .replace(/_\{([^}]+)\}/g, '_($1)')
    
    // Square roots
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    
    // Common mathematical symbols
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓')
    .replace(/\\cdot/g, '·')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\infty/g, '∞')
    
    // Greek letters
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ')
    
    // Remove remaining LaTeX commands
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log('Converted text:', text);
  return text;
}