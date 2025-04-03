
// Extract exercises from document text
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
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
  
  return exercises;
}

// Use AI to extract exercises from unstructured text
export async function extractExercisesWithAI(
  text: string, 
  subjectId?: string
): Promise<Array<{ question: string, answer: string }>> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.error("OpenAI API key not configured");
    return [];
  }

  try {
    // If a subject is specified, include it in the prompt
    let systemPrompt = "You are an exercise extractor. Your task is to identify exercises, problems, questions and their answers or solutions from the provided text.";
    
    if (subjectId) {
      systemPrompt += ` Focus specifically on exercises related to the subject: ${subjectId}.`;
    }
    
    systemPrompt += " Format your response as a JSON array with objects containing 'question' and 'answer' properties. If no clear exercises are found, make your best effort to structure the content as exercises.";

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
            content: systemPrompt
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
