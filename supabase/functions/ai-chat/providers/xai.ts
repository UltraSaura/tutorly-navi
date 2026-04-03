
// xAI provider implementation
export async function callXAI(
  systemMessage: any, 
  history: any[], 
  userMessage: string, 
  model: string, 
  isExercise: boolean = false,
  maxTokens: number = 800
): Promise<string> {
  const xaiApiKey = Deno.env.get('XAI_API_KEY');
  
  if (!xaiApiKey) {
    throw new Error('xAI API key not configured');
  }
  
  console.log(`[xAI] Calling with model: ${model}, maxTokens: ${maxTokens}`);
  
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
  
  // xAI endpoint is hypothetical since it's not yet widely available
  const response = await fetch('https://api.xai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${xaiApiKey}`,
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
    throw new Error(`xAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}
