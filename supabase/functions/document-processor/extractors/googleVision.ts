/**
 * Google Vision OCR extraction
 */

// Generate JWT for Google Vision API authentication
async function generateAccessToken(): Promise<string> {
  console.log('Generating Google Vision access token...');
  
  const credentials = Deno.env.get('GOOGLE_VISION_CREDENTIALS');
  if (!credentials) {
    throw new Error('GOOGLE_VISION_CREDENTIALS not found in environment variables');
  }

  let parsedCredentials;
  try {
    parsedCredentials = JSON.parse(credentials);
  } catch (error) {
    console.error('Failed to parse GOOGLE_VISION_CREDENTIALS:', error);
    throw new Error('Invalid GOOGLE_VISION_CREDENTIALS format. Must be valid JSON.');
  }

  const { client_email, private_key } = parsedCredentials;
  
  if (!client_email || !private_key) {
    throw new Error('GOOGLE_VISION_CREDENTIALS missing client_email or private_key');
  }

  // Create JWT header
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  // Create JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import the private key
  const privateKeyFormatted = private_key.replace(/\\n/g, '\n');
  const key = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(privateKeyFormatted),
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
    key,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', errorText);
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('Successfully generated access token');
  return tokenData.access_token;
}

/**
 * Extract text from image using Google Vision OCR
 */
export async function extractTextWithGoogleVisionOCR(fileData: string): Promise<string> {
  console.log('Starting Google Vision OCR extraction');
  
  try {
    const accessToken = await generateAccessToken();
    
    const requestBody = {
      requests: [
        {
          image: {
            content: fileData
          },
          features: [
            {
              type: "DOCUMENT_TEXT_DETECTION",
              maxResults: 1
            }
          ],
          imageContext: {
            languageHints: ["fr", "en"] // French and English for math worksheets
          }
        }
      ]
    };

    console.log('Making Google Vision API request...');
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Vision API error:', response.status, errorText);
      throw new Error(`Google Vision API request failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Google Vision API response received');

    if (result.responses && result.responses[0]) {
      const response = result.responses[0];
      
      if (response.error) {
        console.error('Google Vision API error:', response.error);
        throw new Error(`Google Vision API error: ${response.error.message}`);
      }
      
      if (response.fullTextAnnotation && response.fullTextAnnotation.text) {
        const extractedText = response.fullTextAnnotation.text;
        console.log(`Google Vision extracted ${extractedText.length} characters`);
        return extractedText;
      }
    }

    throw new Error('No text found in Google Vision response');
    
  } catch (error) {
    console.error('Google Vision OCR extraction failed:', error);
    throw new Error(`Google Vision OCR failed: ${error.message}`);
  }
}