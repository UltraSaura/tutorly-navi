
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processDocument } from "./documentService.ts";
import { corsHeaders } from "./utils.ts";

serve(async (req) => {
  // More permissive CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { fileData, fileType, fileName, subjectId } = await req.json();
    
    if (!fileData) {
      throw new Error("File data is required");
    }
    
    console.log(`Processing document: ${fileName} (${fileType})`);
    
    // Process the document using the documentService
    const result = await processDocument(fileData, fileType, fileName, subjectId);
    
    // Return the processed result
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
    
  } catch (error) {
    console.error('Edge Function error:', error);
    
    return new Response(JSON.stringify({ error: (error as Error).message || 'Processing failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  }
});
