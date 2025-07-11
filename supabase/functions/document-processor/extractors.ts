
import "https://deno.land/x/xhr@0.1.0/mod.ts";

/**
 * Extract text from a document using multiple OCR providers with robust fallback
 */
export async function extractTextFromFile(fileData: string, fileType: string): Promise<string> {
  console.log(`🚀 Processing file of type: ${fileType} with multi-provider OCR approach`);

  // Try Google Vision with retry logic
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`🔍 Attempt ${attempt}: Google Vision Text Detection API`);
      const result = await extractTextWithGoogleVisionOCR(fileData);
      console.log('✅ Google Vision OCR succeeded');
      return result;
    } catch (googleError) {
      console.error(`❌ Google Vision attempt ${attempt} failed:`, googleError.message);
      
      if (attempt === 2) {
        console.log('🔄 Google Vision exhausted, trying Azure fallback...');
        
        try {
          const result = await extractTextWithAzureOCR(fileData);
          console.log('✅ Azure OCR fallback succeeded');
          return result;
        } catch (azureError) {
          console.error('❌ Azure OCR fallback failed:', azureError.message);
          
          // Final fallback: Create a simple text extraction
          console.log('🆘 Using emergency text extraction');
          return createEmergencyExtraction(fileData, fileType);
        }
      } else {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // This should never be reached due to the loop structure above
  throw new Error('Unexpected error in OCR processing');
}

// Emergency extraction for when all OCR services fail
function createEmergencyExtraction(fileData: string, fileType: string): string {
  console.log('🆘 Creating emergency text extraction');
  
  const timestamp = new Date().toISOString();
  return `Document uploaded at ${timestamp}

File Type: ${fileType}
Status: OCR extraction failed, manual review required

This appears to be an image document that could not be processed automatically.
Please review the original file and manually input any exercises or content.

---
Image Data Available: ${fileData.length > 1000 ? 'Yes (Large Image)' : 'Yes (Small Image)'}
Suggested Action: Try uploading again or use a clearer image`;
}

// Helper function for base64url encoding
function base64urlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper function to convert PEM to binary
function pemToBinary(pem: string): Uint8Array {
  const pemContent = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryString = atob(pemContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Generate OAuth 2.0 access token from service account JSON
async function generateAccessToken(): Promise<string> {
  const credentialsJson = Deno.env.get('GOOGLE_VISION_CREDENTIALS');
  
  if (!credentialsJson) {
    throw new Error("Google Vision credentials not configured");
  }

  try {
    console.log('🔑 Starting Google Vision OAuth 2.0 token generation');
    const credentials = JSON.parse(credentialsJson);
    
    // Validate required fields
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Invalid credentials: missing client_email or private_key");
    }
    
    console.log(`📧 Using client email: ${credentials.client_email.substring(0, 20)}...`);
    
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

    console.log('📝 Created JWT payload with scope: cloud-platform');

    // Encode header and payload using proper base64url encoding
    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    
    // Create signature input
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    console.log('🔗 Created JWT signature input');
    
    // Import private key with proper PEM parsing
    const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
    console.log('🔐 Processing private key (length:', privateKeyPem.length, ')');
    
    // Convert PEM to binary format
    const privateKeyBinary = pemToBinary(privateKeyPem);
    console.log('🔄 Converted PEM to binary format');
    
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBinary,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );
    
    console.log('✅ Successfully imported private key');

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(signatureInput)
    );

    console.log('✍️ Successfully signed JWT');

    // Encode signature using proper base64url encoding
    const signatureArray = new Uint8Array(signature);
    const encodedSignature = base64urlEncode(String.fromCharCode(...signatureArray));
    const jwt = `${signatureInput}.${encodedSignature}`;

    console.log('🎫 Created final JWT (length:', jwt.length, ')');

    // Exchange JWT for access token
    console.log('🔄 Exchanging JWT for access token...');
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
      console.error('❌ Token exchange failed:', tokenResponse.status, tokenResponse.statusText);
      console.error('📄 Error response:', errorData);
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Successfully generated access token');
    
    if (!tokenData.access_token) {
      console.error('❌ No access token in response:', tokenData);
      throw new Error('No access token received in response');
    }
    
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ Error generating access token:', error.message);
    if (error.stack) {
      console.error('📚 Stack trace:', error.stack);
    }
    throw new Error(`Failed to generate access token: ${error.message}`);
  }
}

// Azure Computer Vision OCR fallback
async function extractTextWithAzureOCR(fileData: string): Promise<string> {
  const azureKey = Deno.env.get('AZURE_COMPUTER_VISION_KEY');
  const azureEndpoint = Deno.env.get('AZURE_COMPUTER_VISION_ENDPOINT');
  
  if (!azureKey || !azureEndpoint) {
    throw new Error("Azure Computer Vision not configured");
  }

  try {
    console.log('🌐 Using Azure Computer Vision OCR as fallback');
    
    // Extract base64 data and convert to binary
    let base64Image = fileData;
    if (fileData.startsWith('data:image/')) {
      const base64Match = fileData.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        base64Image = base64Match[1];
      }
    }
    
    // Convert base64 to binary
    const binaryString = atob(base64Image);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const response = await fetch(`${azureEndpoint}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/octet-stream'
      },
      body: bytes
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Azure OCR API error (${response.status}): ${errorData}`);
    }

    // Get operation location for polling
    const operationLocation = response.headers.get('operation-location');
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure OCR');
    }

    // Poll for results
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey
        }
      });

      if (!resultResponse.ok) {
        throw new Error(`Azure OCR result fetch failed: ${resultResponse.status}`);
      }

      const result = await resultResponse.json();
      
      if (result.status === 'succeeded') {
        const lines = result.analyzeResult?.readResults?.[0]?.lines || [];
        const extractedText = lines.map((line: any) => line.text).join('\n');
        console.log('✅ Successfully extracted text using Azure OCR');
        return extractedText;
      } else if (result.status === 'failed') {
        throw new Error('Azure OCR analysis failed');
      }
      
      attempts++;
    }
    
    throw new Error('Azure OCR polling timeout');
  } catch (error) {
    console.error('❌ Azure OCR failed:', error);
    throw new Error(`Azure OCR extraction failed: ${error.message}`);
  }
}

// Pure OCR using Google Vision Text Detection API with OAuth 2.0
export async function extractTextWithGoogleVisionOCR(fileData: string): Promise<string> {
  try {
    console.log('🔑 Generating Google Vision API access token');
    const accessToken = await generateAccessToken();
    
    console.log('📤 Making Google Vision Text Detection API request');
    
    // Extract base64 data
    let base64Image = fileData;
    if (fileData.startsWith('data:image/')) {
      const base64Match = fileData.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        base64Image = base64Match[1];
      }
    }
    
    console.log(`📊 Image data size: ${base64Image.length} characters`);
    
    const requestBody = {
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
    };
    
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📡 Google Vision API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Google Vision API error response:', errorData);
      throw new Error(`Google Vision API error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    console.log('📥 Received response from Google Vision API');
    
    // Check for errors in the response
    if (data.responses && data.responses[0] && data.responses[0].error) {
      const error = data.responses[0].error;
      console.error('❌ Google Vision API returned error:', error);
      throw new Error(`Google Vision API error: ${error.message || error.code}`);
    }
    
    // Extract text from response
    if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
      const extractedText = data.responses[0].textAnnotations[0].description;
      console.log('✅ Successfully extracted text using Google Vision OCR');
      console.log(`📝 Extracted text length: ${extractedText.length}`);
      console.log('📄 Preview:', extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''));
      return extractedText;
    } else {
      console.log('⚠️ No text annotations found in Google Vision response');
      console.log('🔍 Response structure:', JSON.stringify(data, null, 2));
      throw new Error('No text found in image - image may be blank or unreadable');
    }
  } catch (error) {
    console.error("❌ Error in Google Vision OCR extraction:", error.message);
    if (error.stack) {
      console.error("📚 Stack trace:", error.stack);
    }
    throw new Error(`Google Vision OCR failed: ${error.message}`);
  }
}

// Fallback OCR using Tesseract (deprecated - use Azure instead)
export async function extractTextWithTesseract(fileData: string): Promise<string> {
  console.log('⚠️ Tesseract OCR called but deprecated - use Azure fallback instead');
  throw new Error("Tesseract OCR not implemented in Deno environment - use Azure Computer Vision fallback");
}
