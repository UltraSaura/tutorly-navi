
// OpenAI provider implementation
export async function callOpenAI(
  systemMessage: any, 
  history: any[], 
  userMessage: string, 
  model: string, 
  isExercise: boolean = false
): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Enhance system message for math problems
  let enhancedSystemMessage = systemMessage;
  
  // Check if this might be a math problem (simple check for numbers and operators)
  const isMathProblem = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(userMessage);
  
  if (isMathProblem) {
    enhancedSystemMessage = {
      role: 'system',
      content: 'You are StudyWhiz, an educational AI tutor specializing in mathematics. When a student submits a math problem or equation, evaluate whether their answer is correct or incorrect. If the equation contains "=" followed by a number, treat that as the student\'s proposed answer. Format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your explanation. In the guidance section, clearly state whether the answer is CORRECT or INCORRECT at the beginning, and then provide a detailed explanation showing step-by-step work. Be precise with mathematical notation and explain concepts thoroughly.'
    };
  }
  
  // Check if this is a grading request
  const isGradingRequest = userMessage.includes("I need you to grade this");
  if (isGradingRequest) {
    enhancedSystemMessage = {
      role: 'system',
      content: 'You are StudyWhiz, an educational AI grader. Format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your detailed explanation. At the beginning of your guidance, clearly state whether the answer is CORRECT or INCORRECT, and then provide a detailed explanation showing why. Be precise with your evaluation and explain concepts thoroughly.'
    };
  }
  
  const messages = [
    enhancedSystemMessage,
    ...history,
    {
      role: 'user',
      content: userMessage
    }
  ];
  
  // If this is likely an exercise, add a formatting instruction
  if (isExercise && !isMathProblem && !isGradingRequest) {
    messages.push({
      role: 'system',
      content: 'Format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your explanation.'
    });
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}
