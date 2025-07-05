
import "https://deno.land/x/xhr@0.1.0/mod.ts";

/**
 * Extract text from a document based on file type
 */
export async function extractTextFromFile(fileData: string, fileType: string): Promise<string> {
  console.log(`Processing file of type: ${fileType}`);

  try {
    // Primary method: Use OpenAI Vision for all file types
    console.log('Attempting to extract text using OpenAI Vision API');
    return await extractTextWithOpenAIVision(fileData);
  } catch (openaiError) {
    console.error("OpenAI Vision extraction failed, trying DeepSeek Vision as fallback:", openaiError);
    
    try {
      console.log('Falling back to DeepSeek Vision API');
      return await extractTextWithDeepSeekVL2(fileData);
    } catch (deepseekError) {
      console.error("Both OpenAI and DeepSeek Vision extraction failed:", deepseekError);
      throw new Error(`Failed to extract content: ${deepseekError.message}. Please check your API key configuration.`);
    }
  }
}

// New function to extract text using OpenAI Vision API
export async function extractTextWithOpenAIVision(fileUrl: string): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error("OpenAI API key not configured for visual extraction");
  }

  try {
    console.log('Making OpenAI Vision API request for content extraction');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an OCR system that extracts French math exercises with STRICT formatting. Use EXERCISE_START and EXERCISE_END delimiters for each exercise to ensure proper separation."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Extract ALL exercises from this French worksheet. Use this EXACT format for each exercise:\n\nEXERCISE_START a. [exercise content] EXERCISE_END\nEXERCISE_START b. [exercise content] EXERCISE_END\n\n**CRITICAL RULES:**\n1. Each exercise MUST be wrapped with EXERCISE_START and EXERCISE_END\n2. Keep the original numbering (a., b., c. or 1., 2., 3.)\n3. IGNORE completion lines (....), underscores (____)\n4. Include mathematical expressions and fractions\n5. Each exercise on a separate line\n\n**EXAMPLE OUTPUT:**\nEXERCISE_START a. Simplifier 3/6 EXERCISE_END\nEXERCISE_START b. Calculer 2 + 3 EXERCISE_END\nEXERCISE_START c. Résoudre x = 5 EXERCISE_END\n\nExtract ALL exercises with these delimiters:" 
              },
              { type: "image_url", image_url: { url: fileUrl } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Vision API error response:', errorData);
      throw new Error(`OpenAI Vision API error: ${errorData}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI Vision API returned error:", data.error);
      throw new Error(`OpenAI Vision API error: ${data.error.message}`);
    }

    console.log('Successfully extracted text from document using OpenAI Vision');
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI Vision extraction:", error);
    throw new Error(`Failed to extract text with OpenAI Vision: ${error.message}`);
  }
}

// Extract text from images and documents using DeepSeek-VL2
export async function extractTextWithDeepSeekVL2(fileData: string): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error("DeepSeek API key not configured for visual extraction");
  }

  try {
    console.log('Making DeepSeek Vision API request for content extraction');
    
    // Handle base64 data URL format - DeepSeek Vision expects direct base64 data
    let imageData = fileData;
    if (fileData.startsWith('data:image/')) {
      // Extract just the base64 part after the comma
      const base64Match = fileData.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        imageData = base64Match[1];
        console.log('Extracted base64 data for DeepSeek Vision API');
      }
    }
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "deepseek-vl2",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL exercises from this worksheet using STRICT formatting. Use this EXACT format:\n\nEXERCISE_START a. [exercise content] EXERCISE_END\nEXERCISE_START b. [exercise content] EXERCISE_END\n\n**CRITICAL:**\n1. Each exercise MUST be wrapped with EXERCISE_START and EXERCISE_END\n2. Keep original numbering (a., b., c. or 1., 2., 3.)\n3. IGNORE completion lines (....), underscores (____)\n4. Include all mathematical expressions\n5. Each exercise on separate line\n\nExtract ALL exercises with these delimiters:"
              },
              {
                type: "image",
                image: imageData
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek Vision API error response:', errorData);
      throw new Error(`DeepSeek Vision API error: ${errorData}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error("DeepSeek Vision API returned error:", data.error);
      throw new Error(`DeepSeek Vision API error: ${data.error.message}`);
    }

    console.log('Successfully extracted text from document using DeepSeek Vision');
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek Vision extraction:", error);
    throw new Error(`Failed to extract text with DeepSeek Vision: ${error.message}`);
  }
}
