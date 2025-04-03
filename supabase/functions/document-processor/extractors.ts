
import { openAIApiKey, deepseekApiKey } from "./utils.ts";

// Extract text from an image using DeepSeek-VL2
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  if (!deepseekApiKey) {
    console.error("DeepSeek API key not configured");
    return "Error: DeepSeek API key not configured for image extraction.";
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "deepseek-vl",
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
        ]
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("DeepSeek API error:", data.error);
      return `Error extracting text from image: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek image extraction:", error);
    
    // Fallback to OpenAI if DeepSeek fails
    if (openAIApiKey) {
      console.log("Falling back to OpenAI for image extraction");
      return await extractTextFromImageWithOpenAI(imageUrl);
    }
    
    return `Error extracting text from image: ${error.message}`;
  }
}

// Fallback function using OpenAI if DeepSeek fails
export async function extractTextFromImageWithOpenAI(imageUrl: string): Promise<string> {
  if (!openAIApiKey) {
    return "Error: OpenAI API key not configured for fallback image extraction.";
  }

  try {
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
            content: "You are an OCR system. Extract all text content from the image, preserving format and structure."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this image:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI API error:", data.error);
      return `Error extracting text from image: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI fallback image extraction:", error);
    return `Error extracting text from image: ${error.message}`;
  }
}

// Extract text from a PDF using DeepSeek-VL2
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
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
        model: "deepseek-vl",
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
        ]
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("DeepSeek API error:", data.error);
      return `Error extracting text from PDF: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in DeepSeek PDF extraction:", error);
    
    // Fallback to OpenAI if DeepSeek fails
    if (openAIApiKey) {
      console.log("Falling back to OpenAI for PDF extraction");
      return await extractTextFromPDFWithOpenAI(pdfUrl);
    }
    
    return `Error extracting text from PDF: ${error.message}`;
  }
}

// Fallback function using OpenAI if DeepSeek fails
export async function extractTextFromPDFWithOpenAI(pdfUrl: string): Promise<string> {
  if (!openAIApiKey) {
    return "Error: OpenAI API key not configured for fallback PDF extraction.";
  }

  try {
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
            content: "You are a PDF text extractor. Extract all text content from the PDF, preserving format and structure."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this PDF:" },
              { type: "image_url", image_url: { url: pdfUrl } }
            ]
          }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI API error:", data.error);
      return `Error extracting text from PDF: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI fallback PDF extraction:", error);
    return `Error extracting text from PDF: ${error.message}`;
  }
}

// Extract text from a document based on file type
export async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
  console.log(`Processing file of type: ${fileType} from URL: ${fileUrl}`);

  try {
    // Handle different file types
    if (fileType.includes('pdf')) {
      return await extractTextFromPDF(fileUrl);
    } else if (fileType.includes('image')) {
      return await extractTextFromImage(fileUrl);
    } else if (fileType.includes('word') || fileType.includes('docx') || fileType.includes('text')) {
      // For Word and text documents, we'll also use DeepSeek-VL as a simplified approach
      return await extractTextFromPDF(fileUrl);
    } else {
      // For unrecognized types, we'll try the image extractor as fallback
      return await extractTextFromImage(fileUrl);
    }
  } catch (error) {
    console.error("Error extracting text:", error);
    return `Error extracting content from file: ${error.message}`;
  }
}
