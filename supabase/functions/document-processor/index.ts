
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processDocument } from "./documentService.ts";
import { corsHeaders } from "./utils.ts";

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
    
    // Process the document using the documentService
    const result = await processDocument(fileUrl, fileType, fileName, subjectId);
    
    // Return the processed result
    return new Response(
      JSON.stringify(result),
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
