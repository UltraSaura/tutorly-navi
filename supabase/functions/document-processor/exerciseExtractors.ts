
// Extract exercises from document text
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Enhanced pattern matching for various exercise formats
  const patterns = [
    // French/international format: a., b., c. with fractions
    /([a-zA-Z]\s*\.\s*\d+\/\d+\s*=\s*[\.…\s]*)/gis,
    // Letter-labeled exercises with mathematical content
    /([a-zA-Z]\s*\.\s*[^a-zA-Z\n\.]+(?:\n(?![a-zA-Z]\s*\.)[^\n]*)*)/gis,
    // Numbered exercises with fractions
    /(\d+\s*[\.\)]\s*\d+\/\d+\s*=\s*[\.…\s]*)/gis,
    // Problem/Answer, Question/Answer, Exercise/Solution patterns
    /(?:Problem|Question|Exercise)[^:]*:\s*(.*?)(?:\n|$)(?:.*?)(?:Answer|Submission|Solution)[^:]*:\s*(.*?)(?:\n\s*\n|$)/gis,
    /(\d+\s*[\.\)]\s*.*?)(?:\n|$)(?:.*?)(?:Answer|Solution)(?:[^:]*)?:\s*(.*?)(?:\n\s*\n|$)/gis,
    /([A-Z][\.\)]\s*.*?)(?:\n|$)(?:.*?)(?:Answer|Solution)(?:[^:]*)?:\s*(.*?)(?:\n\s*\n|$)/gis,
    // Simple numbered exercises without explicit answer labels
    /(\d+\s*[\.\)]\s*[^0-9\n]+(?:\n(?!\d+\s*[\.\)])[^\n]*)*)/gis,
    // Generic letter-labeled exercises
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
  
  // Fallback: manual splitting by letter patterns if no exercises found
  if (exercises.length === 0) {
    console.log('No exercises found with patterns, trying manual letter splitting');
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Look for lines starting with letters followed by periods or parentheses
      if (/^[a-zA-Z]\s*[\.\)]\s*.+/.test(trimmedLine)) {
        exercises.push({
          question: trimmedLine,
          answer: ""
        });
      }
    }
  }
  
  console.log(`Pattern matching extracted ${exercises.length} exercises`);
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
    console.log('Text length for AI extraction:', text.length);
    console.log('First 200 characters:', text.substring(0, 200));
    
    let systemPrompt = `You are a specialized exercise extractor for educational content. Your task is to identify ALL exercises, problems, and questions from the provided text.

CRITICAL INSTRUCTIONS:
1. Extract EVERY SINGLE exercise you can find - never stop at just one
2. This appears to be a math worksheet with multiple exercises
3. Look specifically for patterns like:
   - Letter-labeled exercises: a., b., c., d., e., etc.
   - Numbered exercises: 1., 2., 3., etc.
   - Fraction problems: 30/63 = ..., 18/45 = ...
   - Mathematical expressions with equals signs
   - Any exercise format in French or English

4. For math worksheets, each line starting with a letter or number is likely a separate exercise
5. If you see incomplete answers (dots, lines, or empty spaces), leave the answer empty

${subjectId ? `Focus specifically on exercises related to the subject: ${subjectId}.` : ''}

Format your response as a JSON object with an "exercises" array. Extract ALL exercises you can identify:

Example format:
{
  "exercises": [
    {"question": "a. 30/63 = ", "answer": ""},
    {"question": "b. 18/45 = ", "answer": ""},
    {"question": "c. 24/36 = ", "answer": ""}
  ]
}

REMEMBER: Extract ALL exercises, not just the first one!`;

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
            content: systemPrompt
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
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
