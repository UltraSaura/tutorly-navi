
// Extract exercises from document text
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Enhanced pattern matching to find question-answer pairs
  // Look for Problem/Answer, Question/Answer, Exercise/Solution patterns
  const patterns = [
    /(?:Problem|Question|Exercise)[^:]*:\s*(.*?)(?:\n|$)(?:.*?)(?:Answer|Submission|Solution)[^:]*:\s*(.*?)(?:\n\s*\n|$)/gis,
    /(\d+\s*[\.\)]\s*.*?)(?:\n|$)(?:.*?)(?:Answer|Solution)(?:[^:]*)?:\s*(.*?)(?:\n\s*\n|$)/gis,
    /([A-Z][\.\)]\s*.*?)(?:\n|$)(?:.*?)(?:Answer|Solution)(?:[^:]*)?:\s*(.*?)(?:\n\s*\n|$)/gis,
    // Simple numbered exercises without explicit answer labels
    /(\d+\s*[\.\)]\s*[^0-9\n]+(?:\n(?!\d+\s*[\.\)])[^\n]*)*)/gis,
    // Letter-labeled exercises
    /([a-zA-Z]\s*[\.\)]\s*[^a-zA-Z\n]+(?:\n(?![a-zA-Z]\s*[\.\)])[^\n]*)*)/gis
  ];
  
  // Try each pattern to extract question-answer pairs
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1]) {
        // For patterns with explicit answers
        if (match[2]) {
          exercises.push({
            question: match[1].trim(),
            answer: match[2].trim()
          });
        } else {
          // For simple exercise patterns without explicit answers
          exercises.push({
            question: match[1].trim(),
            answer: "" // Will be filled by user
          });
        }
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
    console.log('Starting AI-based exercise extraction');
    let systemPrompt = `You are an exercise extractor. Your task is to identify ALL exercises, problems, questions and their answers or solutions from the provided text or image content.

IMPORTANT: Extract EVERY exercise you can find - don't stop at just one or two. Look for:
- Numbered exercises (1., 2., 3., etc.)
- Lettered exercises (a), b), c), etc.)
- Math problems and equations
- Questions with or without explicit answers
- Problem statements
- Any content that looks like it could be an exercise or homework problem

${subjectId ? `Focus specifically on exercises related to the subject: ${subjectId}.` : ''}

Format your response as a JSON object with an "exercises" array containing objects with 'question' and 'answer' properties. If an exercise doesn't have an explicit answer in the text, set the answer to an empty string. Make sure to extract ALL exercises - aim for completeness.

Example format:
{
  "exercises": [
    {"question": "What is 2 + 2?", "answer": "4"},
    {"question": "Solve for x: 3x + 5 = 14", "answer": "x = 3"},
    {"question": "Define photosynthesis", "answer": ""}
  ]
}`;

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
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error response:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI API returned error:", data.error);
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    // Parse the JSON response
    try {
      console.log('Parsing AI extraction response');
      const content = data.choices[0].message.content;
      console.log('AI response content:', content.substring(0, 500) + '...');
      const parsed = JSON.parse(content);
      
      if (parsed.exercises && Array.isArray(parsed.exercises)) {
        console.log(`Successfully extracted ${parsed.exercises.length} exercises via AI`);
        
        // Validate exercises have reasonable content
        const validExercises = parsed.exercises.filter(ex => 
          ex.question && ex.question.trim().length > 5
        );
        
        if (validExercises.length !== parsed.exercises.length) {
          console.log(`Filtered out ${parsed.exercises.length - validExercises.length} invalid exercises`);
        }
        
        return validExercises;
      } else if (parsed.length && Array.isArray(parsed)) {
        // Handle case where AI returns array directly
        console.log(`AI returned direct array with ${parsed.length} exercises`);
        return parsed.filter(ex => ex.question && ex.question.trim().length > 5);
      } else {
        console.error("Unexpected format from AI extraction:", parsed);
        return [];
      }
    } catch (parseError) {
      console.error("Error parsing AI extraction result:", parseError);
      console.error("Raw content:", data.choices[0].message.content);
      return [];
    }
  } catch (error) {
    console.error("Error in AI extraction:", error);
    return [];
  }
}
