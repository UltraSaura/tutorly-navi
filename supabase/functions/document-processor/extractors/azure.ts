/**
 * Azure Computer Vision OCR extraction
 */

/**
 * Extract text from image using Azure Computer Vision API
 */
export async function extractTextWithAzureOCR(fileData: string): Promise<string> {
  console.log('Starting Azure OCR extraction');
  
  const azureKey = Deno.env.get('AZURE_COMPUTER_VISION_KEY');
  const azureEndpoint = Deno.env.get('AZURE_COMPUTER_VISION_ENDPOINT');
  
  if (!azureKey || !azureEndpoint) {
    throw new Error('Azure Computer Vision credentials not configured. Please add AZURE_COMPUTER_VISION_KEY and AZURE_COMPUTER_VISION_ENDPOINT to Supabase secrets.');
  }
  
  try {
    // Convert base64 to binary
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('Making Azure Computer Vision API request...');
    
    // Submit OCR job
    const submitResponse = await fetch(`${azureEndpoint}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/octet-stream'
      },
      body: bytes.buffer
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Azure OCR submit error:', submitResponse.status, errorText);
      throw new Error(`Azure OCR submit failed: ${submitResponse.status}`);
    }
    
    // Get operation location from headers
    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure OCR');
    }
    
    console.log('Azure OCR job submitted, polling for results...');
    
    // Poll for results
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      
      const resultResponse = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey
        }
      });
      
      if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        console.error('Azure OCR result error:', resultResponse.status, errorText);
        throw new Error(`Azure OCR result failed: ${resultResponse.status}`);
      }
      
      const result = await resultResponse.json();
      console.log(`Azure OCR attempt ${attempts}, status: ${result.status}`);
      
      if (result.status === 'succeeded') {
        if (result.analyzeResult && result.analyzeResult.readResults) {
          let extractedText = '';
          
          for (const page of result.analyzeResult.readResults) {
            if (page.lines) {
              for (const line of page.lines) {
                extractedText += line.text + '\n';
              }
            }
          }
          
          console.log(`Azure OCR extracted ${extractedText.length} characters`);
          return extractedText.trim();
        } else {
          throw new Error('No text found in Azure OCR response');
        }
      } else if (result.status === 'failed') {
        throw new Error('Azure OCR processing failed');
      }
      
      // Continue polling if status is 'running' or 'notStarted'
    }
    
    throw new Error('Azure OCR timed out after 30 seconds');
    
  } catch (error) {
    console.error('Azure OCR extraction failed:', error);
    throw new Error(`Azure OCR failed: ${(error as Error).message || String(error)}`);
  }
}