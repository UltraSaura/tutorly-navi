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
    const { topicName, topicDescription, topicKeywords, levelCode, countryCode } = await req.json();

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

    // Fetch objectives matching the level, including keywords
    let query = supabase.from('objectives').select('id, level, domain, subdomain, text, keywords, notes_from_prog');
    
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

    // Format objectives for the AI prompt with keywords
    const objectivesList = objectives.map((obj, idx) => 
      `${idx + 1}. ID: ${obj.id}
   Domain: ${obj.domain || 'N/A'}
   Subdomain: ${obj.subdomain || 'N/A'}
   Text: "${obj.text}"
   Keywords: [${(obj.keywords as string[] || []).join(', ') || 'none'}]
   Notes: ${obj.notes_from_prog || 'none'}`
    ).join('\n\n');

    // Get AI API key
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

    const systemPrompt = `You are a curriculum expert specializing in educational content alignment for French-speaking African countries (Morocco, Senegal, etc.). Your task is to match learning topics with the most relevant learning objectives from a curriculum.

Given a topic name, description, keywords, and a list of available objectives, identify which objectives best match the topic.

MATCHING CRITERIA (in order of importance):
1. **Keyword match**: If topic keywords match objective keywords, this is the strongest signal
2. **Subdomain match**: The topic name often indicates the subdomain (e.g., "Multiplication" → "Quatre opérations")
3. **Semantic match**: Topic title/description aligns with objective text
4. **Domain relevance**: Topic belongs to the same domain family

EXAMPLES:
- "Multiplication" or "Tables de multiplication" → Match "Quatre opérations" (keywords: multiplication, tables, produit)
- "Périmètre du rectangle" → Match "Longueurs" (keywords: périmètre, mesurer, longueur)
- "Fractions équivalentes" → Match "Fractions" (keywords: fractions, numérateur, dénominateur)

Return ONLY a valid JSON array of matching objectives with confidence scores (0-1) and brief reasons.
Format: [{"objective_id": "actual_id_from_list", "confidence": 0.95, "reason": "Brief French explanation"}]

IMPORTANT:
- Use the EXACT objective_id from the list (e.g., "obj_ca993cdc")
- Only return objectives with confidence >= 0.7
- Return an empty array [] if no objectives match well
- Do not include any text outside the JSON array`;

    const keywordsStr = topicKeywords && topicKeywords.length > 0 
      ? `Keywords: [${topicKeywords.join(', ')}]`
      : '';

    const userPrompt = `Topic: "${topicName}"
${topicDescription ? `Description: "${topicDescription}"` : ''}
${keywordsStr}
Level: ${levelCode || 'Not specified'}
Country: ${countryCode || 'Not specified'}

Available objectives for ${levelCode || 'this level'}:
${objectivesList}

Identify matching objectives and return as JSON array.`;

    console.log('Calling AI API for objective suggestions...');
    console.log('Topic:', topicName, 'Keywords:', topicKeywords);

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
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

    console.log(`Returning ${enrichedSuggestions.length} suggestions for topic "${topicName}"`);

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