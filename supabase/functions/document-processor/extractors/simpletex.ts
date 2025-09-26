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

// MD5 implementation for Deno (SimpleTex requires MD5 for authentication)
function md5(text: string): string {
  // Simple MD5 implementation compatible with Deno
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // MD5 constants
  const s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
             5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
             4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
             6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  
  const K = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
             0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
             0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
             0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
             0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
             0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
             0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
             0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];
  
  // Pre-processing
  const msgLength = data.length;
  const bitLength = msgLength * 8;
  
  // Padding
  const paddedLength = Math.ceil((msgLength + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[msgLength] = 0x80;
  
  // Append length as 64-bit little-endian
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLength, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);
  
  // Initialize MD5 buffer
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  
  // Process chunks
  for (let i = 0; i < paddedLength; i += 64) {
    const w = new Array(16);
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, true);
    }
    
    let a = h0, b = h1, c = h2, d = h3;
    
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      
      f = (f + a + K[j] + w[g]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((f << s[j]) | (f >>> (32 - s[j])))) >>> 0;
    }
    
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
  }
  
  // Convert to hex string
  const toHex = (n: number) => {
    const hex = n.toString(16).padStart(8, '0');
    return hex.match(/../g)!.reverse().join('');
  };
  
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3);
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
  
  const sign = md5(signString);
  
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
    throw new Error(`SimpleTex OCR failed: ${(error as Error).message || String(error)}`);
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