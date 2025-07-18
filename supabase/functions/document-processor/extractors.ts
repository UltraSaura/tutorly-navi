
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { extractTextWithSimpleTexOCR } from './extractors/simpletex.ts';
import { extractTextWithGoogleVisionOCR } from './extractors/googleVision.ts';
import { extractTextWithAzureOCR } from './extractors/azure.ts';

/**
 * Extract text from a document using multiple OCR providers with SimpleTex priority for math content
 */
export async function extractTextFromFile(fileData: string, fileType: string): Promise<string> {
  console.log(`🚀 Processing file of type: ${fileType} with SimpleTex-prioritized OCR approach`);
  console.log(`📊 File data length: ${fileData.length} characters, starts with: ${fileData.substring(0, 50)}...`);

  // PHASE 1: SimpleTex for Math Content (primary for mathematical worksheets)
  try {
    console.log('🧮 Phase 1: SimpleTex Math OCR for specialized formula recognition');
    const simpleTexResult = await extractTextWithSimpleTexOCR(fileData);
    
    if (simpleTexResult && simpleTexResult.length > 5) {
      console.log(`✅ SimpleTex succeeded with ${simpleTexResult.length} characters`);
      return simpleTexResult;
    } else {
      console.log(`⚠️ SimpleTex returned insufficient text (${simpleTexResult?.length || 0} chars)`);
    }
  } catch (simpleTexError) {
    console.error('❌ SimpleTex failed:', simpleTexError.message);
    console.log('🔄 Falling back to Google Vision...');
  }

  // PHASE 2: Google Vision with retry logic
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`🔍 Phase 2 - Attempt ${attempt}: Google Vision Text Detection API`);
      const result = await extractTextWithGoogleVisionOCR(fileData);
      console.log('✅ Google Vision OCR succeeded');
      return result;
    } catch (googleError) {
      console.error(`❌ Google Vision attempt ${attempt} failed:`, googleError.message);
      
      if (attempt === 2) {
        console.log('🔄 Google Vision exhausted, trying Azure fallback...');
        
        // PHASE 3: Azure fallback
        try {
          const result = await extractTextWithAzureOCR(fileData);
          console.log('✅ Azure OCR fallback succeeded');
          return result;
        } catch (azureError) {
          console.error('❌ Azure OCR fallback failed:', azureError.message);
          console.log('💡 To enable Azure OCR, add AZURE_COMPUTER_VISION_KEY and AZURE_COMPUTER_VISION_ENDPOINT to Supabase secrets');
          
          // PHASE 4: Emergency extraction
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

// Re-export individual OCR providers
export { extractTextWithSimpleTexOCR } from './extractors/simpletex.ts';

// Re-export the Azure OCR function from the new modular structure
export { extractTextWithAzureOCR } from './extractors/azure.ts';

// Re-export the Google Vision OCR function from the new modular structure
export { extractTextWithGoogleVisionOCR } from './extractors/googleVision.ts';

// Fallback OCR using Tesseract (deprecated - use Azure instead)
export async function extractTextWithTesseract(fileData: string): Promise<string> {
  console.log('⚠️ Tesseract OCR called but deprecated - use Azure fallback instead');
  throw new Error("Tesseract OCR not implemented in Deno environment - use Azure Computer Vision fallback");
}
