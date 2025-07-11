
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

// Pure OCR using Google Vision Text Detection API
export async function extractTextWithGoogleVisionOCR(fileData: string): Promise<string> {
  const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  
  if (!googleApiKey) {
    throw new Error("Google Vision API key not configured for OCR extraction");
  }

  try {
    console.log('Making Google Vision Text Detection API request');
    
    // Extract base64 data
    let base64Image = fileData;
    if (fileData.startsWith('data:image/')) {
      const base64Match = fileData.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        base64Image = base64Match[1];
      }
    }
    
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
