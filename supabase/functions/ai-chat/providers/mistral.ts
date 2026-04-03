
// Mistral AI provider implementation
export async function callMistral(
  systemMessage: any, 
  history: any[], 
  userMessage: string, 
  model: string, 
  isExercise: boolean = false,
  maxTokens: number = 800
): Promise<string> {
  const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
  
  if (!mistralApiKey) {
    throw new Error('Mistral AI API key not configured');
  }
  
  console.log(`[Mistral] Calling with model: ${model}, maxTokens: ${maxTokens}`);
  
  const messages = [
    systemMessage,
    ...history,
    {
      role: 'user',
      content: isExercise
        ? `${userMessage}\n\nNote: If this is a homework question, please format your response as an exercise with clear steps.`
        : userMessage
    }
  ];
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Mistral AI API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}
