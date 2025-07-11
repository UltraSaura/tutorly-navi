
import "https://deno.land/x/xhr@0.1.0/mod.ts";

/**
 * Extract text from a document using pure OCR approach
 */
export async function extractTextFromFile(fileData: string, fileType: string): Promise<string> {
  console.log(`Processing file of type: ${fileType} with OCR-first approach`);

  try {
    // Primary method: Use Google Vision Text Detection (pure OCR)
    console.log('Attempting to extract text using Google Vision Text Detection API');
    return await extractTextWithGoogleVisionOCR(fileData);
  } catch (googleError) {
    console.error("Google Vision OCR failed, trying Tesseract fallback:", googleError);
    
    try {
      console.log('Falling back to Tesseract OCR');
      return await extractTextWithTesseract(fileData);
    } catch (tesseractError) {
      console.error("Both Google Vision and Tesseract OCR failed:", tesseractError);
      throw new Error(`Failed to extract text with OCR: ${tesseractError.message}. Please check your configuration.`);
    }
  }
}

// Generate OAuth 2.0 access token from service account JSON
async function generateAccessToken(): Promise<string> {
  const credentialsJson = Deno.env.get('GOOGLE_VISION_CREDENTIALS');
  
  if (!credentialsJson) {
    throw new Error("Google Vision credentials not configured");
  }

  try {
    const credentials = JSON.parse(credentialsJson);
    console.log('Parsed Google Vision credentials successfully');
    
    // Create JWT header
    const header = {
      alg: "RS256",
      typ: "JWT"
    };

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600, // 1 hour
      iat: now
    };

    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({'+':'-','/':'_','=':''}[m]!));
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({'+':'-','/':'_','=':''}[m]!));
    
    // Create signature using private key
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // Import private key
    const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      new TextEncoder().encode(privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----\n/, '').replace(/\n-----END PRIVATE KEY-----/, '').replace(/\n/g, '')),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/[+/=]/g, (m) => ({'+':'-','/':'_','=':''}[m]!));
    const jwt = `${signatureInput}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully generated access token');
    return tokenData.access_token;
  } catch (error) {
    console.error('Error generating access token:', error);
    throw new Error(`Failed to generate access token: ${error.message}`);
  }
}

// Pure OCR using Google Vision Text Detection API with OAuth 2.0
export async function extractTextWithGoogleVisionOCR(fileData: string): Promise<string> {
  try {
    console.log('Generating Google Vision API access token');
    const accessToken = await generateAccessToken();
    
    console.log('Making Google Vision Text Detection API request with OAuth token');
    
    // Extract base64 data
    let base64Image = fileData;
    if (fileData.startsWith('data:image/')) {
      const base64Match = fileData.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        base64Image = base64Match[1];
      }
    }
    
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Vision API error response:', errorData);
      throw new Error(`Google Vision API error: ${errorData}`);
    }

    const data = await response.json();
    if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
      const extractedText = data.responses[0].textAnnotations[0].description;
      console.log('Successfully extracted text using Google Vision OCR');
      console.log('Raw OCR output:', extractedText.substring(0, 200) + '...');
      return extractedText;
    } else {
      throw new Error('No text found in image');
    }
  } catch (error) {
    console.error("Error in Google Vision OCR extraction:", error);
    throw new Error(`Failed to extract text with Google Vision OCR: ${error.message}`);
  }
}

// Fallback OCR using Tesseract (client-side processing for edge function)
export async function extractTextWithTesseract(fileData: string): Promise<string> {
  try {
    console.log('Using Tesseract OCR fallback');
    
    // Note: In a Deno environment, we'd need to use a different approach
    // For now, we'll simulate the extraction with a simple pattern
    // In a real implementation, you'd use a Tesseract WebAssembly build
    
    throw new Error("Tesseract OCR not yet implemented in Deno environment");
  } catch (error) {
    console.error("Error in Tesseract OCR extraction:", error);
    throw new Error(`Failed to extract text with Tesseract: ${error.message}`);
  }
}
