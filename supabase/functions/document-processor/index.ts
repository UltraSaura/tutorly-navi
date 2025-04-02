
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text extraction based on file type
async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
  try {
    // For demo purposes we'll return a simulated extraction
    // In a production version, this would connect to OCR services or PDF extraction libraries
    
    console.log(`Processing file of type: ${fileType} from URL: ${fileUrl}`);
    
    // Simulate different types of content based on file type
    if (fileType.includes('pdf')) {
      return `Problem 1: What is the capital of France?\nAnswer: Paris\n\nProblem 2: Solve the equation 2x + 5 = 15\nAnswer: x = 5`;
    } else if (fileType.includes('word') || fileType.includes('docx')) {
      return `Question: Who wrote "Romeo and Juliet"?\nAnswer: William Shakespeare\n\nQuestion: What is the formula for the area of a circle?\nAnswer: A = πr²`;
    } else if (fileType.includes('image')) {
      // For images, we would use OCR in production
      return `Math Problem: 3 + 5 = 8\n\nSpelling: The quick brown fox jumps over the lazy dog.`;
    } else {
      // Default for text files or unknown types
      return `Exercise: Write a paragraph about climate change.\nSubmission: Climate change is affecting our planet in numerous ways, including rising temperatures, more frequent extreme weather events, and melting polar ice caps.`;
    }
  } catch (error) {
    console.error("Error extracting text:", error);
    return "Error extracting content from file.";
  }
}

// Extract exercises from document text
function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  // Pattern matching to find question-answer pairs
  const exercises = [];
  
  // Look for Problem/Answer pattern
  const problemMatches = text.matchAll(/(?:Problem|Question|Exercise)[^:]*:\s*(.*?)(?:\n|$)(?:.*?)(?:Answer|Submission|Solution)[^:]*:\s*(.*?)(?:\n\s*\n|$)/gis);
  
  for (const match of problemMatches) {
    if (match[1] && match[2]) {
      exercises.push({
        question: match[1].trim(),
        answer: match[2].trim()
      });
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
  
  // If no exercises were found, create a generic one
  if (exercises.length === 0 && text.length > 0) {
    exercises.push({
      question: "Document submission",
      answer: text.length > 100 ? text.substring(0, 100) + "..." : text
    });
  }
  
  return exercises;
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
    
    // Extract exercises from the text
    const exercises = extractExercisesFromText(extractedText);
    
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
