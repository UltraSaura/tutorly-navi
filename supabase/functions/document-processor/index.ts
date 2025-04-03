
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractTextWithDeepSeekVL2, extractTextFromPDFWithDeepSeekVL2 } from "./extractors.ts";
import { extractExercisesFromText, extractExercisesWithAI } from "./exerciseExtractors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from a document based on file type
async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
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

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { fileUrl, fileType, fileName, subjectId } = await req.json();
    
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (exercises.length < 2 && extractedText.length > 50 && openAIApiKey) {
      console.log("Using AI to extract exercises from unstructured text");
      const aiExercises = await extractExercisesWithAI(extractedText, subjectId);
      
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
