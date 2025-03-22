
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
  
  const messages = [
    systemMessage,
    ...history,
    {
      role: 'user',
      content: userMessage
    }
  ];
  
  // If this is likely an exercise, add a formatting instruction
  if (isExercise) {
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
