
import "https://deno.land/x/xhr@0.1.0/mod.ts";

/**
 * Extract text from a document based on file type
 */
export async function extractTextFromFile(fileData: string, fileType: string): Promise<string> {
  console.log(`Processing file of type: ${fileType}`);

  try {
    // Primary method: Use OpenAI Vision for all file types
    try {
      console.log('Attempting to extract text using OpenAI Vision API');
      return await extractTextWithOpenAIVision(fileData);
    } catch (openaiError) {
      console.error('OpenAI Vision extraction failed, falling back to DeepSeek:', openaiError);
      
      // Fallback to DeepSeek for different file types
      if (fileType.includes('pdf')) {
        console.log('Processing PDF document with DeepSeek');
        return await extractTextWithDeepSeekVL2(fileData);
      } else if (fileType.includes('image')) {
        console.log('Processing image file with DeepSeek');
        return await extractTextWithDeepSeekVL2(fileData);
      } else if (fileType.includes('word') || fileType.includes('docx') || fileType.includes('text')) {
        console.log('Processing Word/text document with DeepSeek');
        return await extractTextWithDeepSeekVL2(fileData);
      } else {
        console.log('Unrecognized file type, attempting image extraction as fallback with DeepSeek');
        return await extractTextWithDeepSeekVL2(fileData);
      }
    }
  } catch (error) {
    console.error("Error extracting text:", error);
    throw new Error(`Failed to extract content: ${error.message}`);
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
            content: "You are an OCR system. Extract all text content from the document, preserving format and structure. Focus on identifying questions, problems, exercises, and their associated answers if present."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this document, especially any exercises, problems, questions and answers:" },
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
export async function extractTextWithDeepSeekVL2(fileUrl: string): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error("DeepSeek API key not configured for visual extraction");
  }

  try {
    console.log('Making DeepSeek API request for content extraction');
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
            role: "system",
            content: "You are an OCR system. Extract all text content from the document, preserving format and structure. Focus on identifying questions, problems, exercises, and their associated answers if present."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this document, especially any exercises, problems, questions and answers:" },
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
      console.error('DeepSeek API error response:', errorData);
      throw new Error(`DeepSeek API error: ${errorData}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error("DeepSeek API returned error:", data.error);
      throw new Error(`DeepSeek API error: ${data.error.message}`);
    }

    console.log('Successfully extracted text from document');
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek extraction:", error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}
