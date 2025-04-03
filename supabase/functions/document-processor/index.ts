
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get the OpenAI API key from environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Extract text from an image using OpenAI's GPT-4 Vision
async function extractTextFromImage(imageUrl: string): Promise<string> {
  if (!openAIApiKey) {
    console.error("OpenAI API key not configured");
    return "Error: OpenAI API key not configured for image extraction.";
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
      console.error("OpenAI API error:", data.error);
      return `Error extracting text from image: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI image extraction:", error);
    return `Error extracting text from image: ${error.message}`;
  }
}

// Extract text from a PDF using OpenAI
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  if (!openAIApiKey) {
    console.error("OpenAI API key not configured");
    return "Error: OpenAI API key not configured for PDF extraction.";
  }

  try {
    // For PDFs, we'll use GPT-4 Vision to analyze the PDF as an image
    // This is a simplification - in production you'd want to use a PDF parser
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
      console.error("OpenAI API error:", data.error);
      return `Error extracting text from PDF: ${data.error.message}`;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI PDF extraction:", error);
    return `Error extracting text from PDF: ${error.message}`;
  }
}

// Extract text from a document based on file type
async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
  console.log(`Processing file of type: ${fileType} from URL: ${fileUrl}`);

  try {
    // Handle different file types
    if (fileType.includes('pdf')) {
      return await extractTextFromPDF(fileUrl);
    } else if (fileType.includes('image')) {
      return await extractTextFromImage(fileUrl);
    } else if (fileType.includes('word') || fileType.includes('docx') || fileType.includes('text')) {
      // For Word and text documents, we'll also use GPT-4 Vision as a simplified approach
      // In production, you'd want to use a dedicated Word/docx parser
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

// Extract exercises from document text
function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Pattern matching to find question-answer pairs
  // Look for Problem/Answer, Question/Answer, Exercise/Solution patterns
  const patterns = [
    /(?:Problem|Question|Exercise)[^:]*:\s*(.*?)(?:\n|$)(?:.*?)(?:Answer|Submission|Solution)[^:]*:\s*(.*?)(?:\n\s*\n|$)/gis,
    /(\d+\s*[\.\)]\s*.*?)(?:\n|$)(?:.*?)(?:Answer|Solution)(?:[^:]*)?:\s*(.*?)(?:\n\s*\n|$)/gis,
    /([A-Z][\.\)]\s*.*?)(?:\n|$)(?:.*?)(?:Answer|Solution)(?:[^:]*)?:\s*(.*?)(?:\n\s*\n|$)/gis
  ];
  
  // Try each pattern to extract question-answer pairs
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1] && match[2]) {
        exercises.push({
          question: match[1].trim(),
          answer: match[2].trim()
        });
      }
    }
  }
  
  // Look for math equations
  const mathMatches = text.matchAll(/(\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+)/g);
  for (const match of mathMatches) {
    const equation = match[1].trim();
    const parts = equation.split('=');
    if (parts.length === 2) {
      exercises.push({
        question: parts[0].trim(),
        answer: parts[1].trim()
      });
    }
  }
  
  // If no structured exercises were found but there's text, ask GPT to extract them
  if (exercises.length === 0 && text.length > 50 && openAIApiKey) {
    // We'll return an empty array here and handle AI-based extraction below
    // This prevents blocking the response
  }
  
  return exercises;
}

// Use AI to extract exercises from unstructured text
async function extractExercisesWithAI(text: string): Promise<Array<{ question: string, answer: string }>> {
  if (!openAIApiKey) {
    console.error("OpenAI API key not configured");
    return [];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an exercise extractor. Your task is to identify exercises, problems, questions and their answers or solutions from the provided text. Format your response as a JSON array with objects containing 'question' and 'answer' properties. If no clear exercises are found, make your best effort to structure the content as exercises."
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI API error:", data.error);
      return [];
    }

    // Parse the JSON response
    try {
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      if (parsed.exercises && Array.isArray(parsed.exercises)) {
        return parsed.exercises;
      } else {
        console.error("Unexpected format from AI extraction:", parsed);
        return [];
      }
    } catch (parseError) {
      console.error("Error parsing AI extraction result:", parseError, data.choices[0].message.content);
      return [];
    }
  } catch (error) {
    console.error("Error in AI extraction:", error);
    return [];
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { fileUrl, fileType, fileName } = await req.json();
    
    if (!fileUrl) {
      throw new Error("File URL is required");
    }
    
    console.log(`Processing document: ${fileName} (${fileType})`);
    
    // Extract text from the document
    const extractedText = await extractTextFromFile(fileUrl, fileType);
    console.log(`Extracted text length: ${extractedText.length} characters`);
    
    // Extract exercises from the text using pattern matching
    let exercises = extractExercisesFromText(extractedText);
    
    // If pattern matching found fewer than 2 exercises and the text is substantial,
    // try using AI to extract exercises
    if (exercises.length < 2 && extractedText.length > 50 && openAIApiKey) {
      console.log("Using AI to extract exercises from unstructured text");
      const aiExercises = await extractExercisesWithAI(extractedText);
      
      if (aiExercises.length > 0) {
        exercises = aiExercises;
      }
    }
    
    // If still no exercises but have text, create a generic one
    if (exercises.length === 0 && extractedText.length > 0) {
      exercises.push({
        question: "Document submission",
        answer: extractedText.length > 300 
          ? extractedText.substring(0, 300) + "..." 
          : extractedText
      });
    }
    
    console.log(`Extracted ${exercises.length} exercises`);
    
    // Return the extracted exercises
    return new Response(
      JSON.stringify({ 
        success: true, 
        exercises,
        rawText: extractedText
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Error in document processor:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An error occurred while processing the document'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
