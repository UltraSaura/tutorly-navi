
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
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are a simple OCR system. Extract ALL visible text, numbers, and mathematical content from the image exactly as you see it. Do not format or structure the output - just provide all visible text."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Please extract ALL visible text from this French math worksheet. Include:\n- All instruction text\n- All numbers and fractions (like 6/8, 12/15, etc.)\n- All mathematical symbols and expressions\n- All labels and section headers\n\nJust provide the raw text as you see it in the image, line by line. Don't try to structure it or format it - I just need all the visible content." 
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
                text: "Please extract ALL visible text from this French math worksheet. Include:\n- All instruction text\n- All numbers and fractions (like 6/8, 12/15, etc.)\n- All mathematical symbols and expressions\n- All labels and section headers\n\nJust provide the raw text as you see it in the image, line by line. Don't try to structure it or format it - I just need all the visible content."
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
