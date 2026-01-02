import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObjectiveSuggestion {
  objective_id: string;
  confidence: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicName, topicDescription, levelCode, countryCode } = await req.json();

    if (!topicName) {
      return new Response(
        JSON.stringify({ error: 'Topic name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch objectives matching the level
    let query = supabase.from('objectives').select('id, level, domain, subdomain, text');
    
    if (levelCode) {
      query = query.ilike('level', `%${levelCode}%`);
    }

    const { data: objectives, error: objError } = await query.limit(100);

    if (objError) {
      console.error('Error fetching objectives:', objError);
      throw new Error('Failed to fetch objectives');
    }

    if (!objectives || objectives.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], message: 'No objectives found for this level' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format objectives for the AI prompt
    const objectivesList = objectives.map((obj, idx) => 
      `${idx + 1}. ${obj.id} - Domain: ${obj.domain || 'N/A'}, Subdomain: ${obj.subdomain || 'N/A'} - "${obj.text}"`
    ).join('\n');

    // Get AI model configuration
    const { data: modelConfig } = await supabase.rpc('get_model_with_fallback');
    
    let apiKey = Deno.env.get('OPENAI_API_KEY');
    let apiUrl = 'https://api.openai.com/v1/chat/completions';
    let modelId = 'gpt-4o-mini';

    // Use Lovable AI Gateway if available
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey) {
      apiKey = lovableApiKey;
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      modelId = 'google/gemini-2.5-flash';
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'No AI API key configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a curriculum expert specializing in educational content alignment. Your task is to match learning topics with the most relevant learning objectives from a curriculum.

Given a topic name, description, and a list of available objectives, identify which objectives best match the topic. Consider:
1. Direct keyword matches (e.g., "périmètre" matches objectives about perimeter/lengths)
2. Related concepts (e.g., "périmètre du rectangle" relates to geometry, shapes, measurements)
3. Prerequisites and related skills
4. Grade-level appropriateness

Return ONLY a valid JSON array of matching objectives with confidence scores (0-1) and brief reasons.
Format: [{"objective_id": "id", "confidence": 0.95, "reason": "Brief explanation"}]
Return an empty array [] if no objectives match well.
Do not include any text outside the JSON array.`;

    const userPrompt = `Topic: "${topicName}"
${topicDescription ? `Description: "${topicDescription}"` : ''}
Level: ${levelCode || 'Not specified'}
Country: ${countryCode || 'Not specified'}

Available objectives:
${objectivesList}

Identify matching objectives and return as JSON array.`;

    console.log('Calling AI API for objective suggestions...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '[]';

    console.log('AI response content:', content);

    // Parse AI response
    let suggestions: ObjectiveSuggestion[] = [];
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      suggestions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', content);
      suggestions = [];
    }

    // Enrich suggestions with objective details
    const enrichedSuggestions = suggestions
      .filter(s => s.objective_id && s.confidence >= 0.5)
      .map(s => {
        const obj = objectives.find(o => o.id === s.objective_id);
        return {
          objective_id: s.objective_id,
          objective_text: obj?.text || 'Unknown',
          domain: obj?.domain || 'Unknown',
          subdomain: obj?.subdomain || 'Unknown',
          confidence: s.confidence,
          reason: s.reason,
        };
      })
      .sort((a, b) => b.confidence - a.confidence);

    console.log(`Returning ${enrichedSuggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions: enrichedSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-topic-objectives:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
