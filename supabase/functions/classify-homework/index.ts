
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { message, subjects = [], modelId = 'gpt-4o-mini' } = await req.json();
    
    // Get OpenAI API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create the prompt for the AI to classify the message
    const classificationPrompt = `
Analyze the following message and determine:
1. Is this a homework/exercise question? (Yes/No)
2. If yes, what subject does it belong to? From these options: ${subjects.map(s => s.name).join(', ')}
3. Extract the question part from the message
4. Extract the answer part from the message (if provided)

Please format your response as valid JSON with the following structure:
{
  "isHomework": true/false,
  "confidence": 0-1 (confidence level),
  "subject": "subject name or null if not homework",
  "subjectId": "subject id or null if not homework",
  "question": "extracted question part",
  "answer": "extracted answer part"
}

User message: ${message}
`;

    // Call OpenAI API for classification using the selected model
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId, // Use the provided model ID
        messages: [
          { 
            role: 'user', 
            content: classificationPrompt 
          }
        ],
        temperature: 0.3, // Low temperature for more consistent outputs
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Get AI's response and parse it
    const aiResponse = data.choices[0].message.content;
    let classification;
    
    try {
      // Extract JSON from response (in case AI wraps it in explanations)
      const jsonMatch = aiResponse.match(/({[\s\S]*})/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      classification = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Error parsing AI response:", e);
      console.log("Raw AI response:", aiResponse);
      
      // Fallback: Use regex-based detection if AI classification fails
      const isMathProblem = /\d+\s*[\+\-\*\/]\s*\d+/.test(message);
      const hasExerciseKeywords = /\b(solve|calculate|find|compute|homework|problem)\b/i.test(message);
      
      classification = {
        isHomework: isMathProblem || hasExerciseKeywords,
        confidence: 0.6,
        subject: "Mathematics",
        subjectId: subjects.find(s => 
          s.name.toLowerCase() === "mathematics" || 
          s.name.toLowerCase() === "math"
        )?.id || null,
        question: message,
        answer: ""
      };
    }
    
    console.log("Classification result:", classification);

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Error in classify-homework function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        isHomework: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
