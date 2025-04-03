
import "https://deno.land/x/xhr@0.1.0/mod.ts";

/**
 * Extract text from a document based on file type
 */
export async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
  console.log(`Processing file of type: ${fileType} from URL: ${fileUrl}`);

  try {
    // Handle different file types using DeepSeek-VL2 for visual content
    if (fileType.includes('pdf')) {
      return await extractTextFromPDFWithDeepSeekVL2(fileUrl);
    } else if (fileType.includes('image')) {
      return await extractTextWithDeepSeekVL2(fileUrl);
    } else if (fileType.includes('word') || fileType.includes('docx') || fileType.includes('text')) {
      // For Word and text documents, we'll also use DeepSeek-VL2 as a simplified approach
      return await extractTextFromPDFWithDeepSeekVL2(fileUrl);
    } else {
      // For unrecognized types, we'll try the image extractor as fallback
      return await extractTextWithDeepSeekVL2(fileUrl);
    }
  } catch (error) {
    console.error("Error extracting text:", error);
    return `Error extracting content from file: ${error.message}`;
  }
}

// Extract text from an image using DeepSeek-VL2
export async function extractTextWithDeepSeekVL2(imageUrl: string): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    console.error("DeepSeek API key not configured");
    return "Error: DeepSeek API key not configured for visual extraction.";
  }

  try {
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
            content: "You are an OCR system. Extract all text content from the image, preserving format and structure. Focus on identifying questions, problems, exercises, and their associated answers if present."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this image, especially any exercises, problems, questions and answers:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("DeepSeek-VL2 API error:", data.error);
      return `Error extracting text from image: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek-VL2 image extraction:", error);
    return `Error extracting text from image: ${error.message}`;
  }
}

// Extract text from a PDF using DeepSeek-VL2
export async function extractTextFromPDFWithDeepSeekVL2(pdfUrl: string): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    console.error("DeepSeek API key not configured");
    return "Error: DeepSeek API key not configured for PDF extraction.";
  }

  try {
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
            content: "You are a PDF text extractor. Extract all text content from the PDF, preserving format and structure. Focus especially on identifying exercises, problems, questions, and their associated answers if present."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this PDF, especially any exercises, problems, questions and answers:" },
              { type: "image_url", image_url: { url: pdfUrl } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("DeepSeek-VL2 API error:", data.error);
      return `Error extracting text from PDF: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek-VL2 PDF extraction:", error);
    return `Error extracting text from PDF: ${error.message}`;
  }
}
