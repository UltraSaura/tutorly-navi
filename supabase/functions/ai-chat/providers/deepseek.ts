
// DeepSeek AI provider implementation
export async function callDeepSeek(
  systemMessage: any, 
  history: any[], 
  userMessage: string, 
  model: string, 
  isExercise: boolean = false,
  maxTokens: number = 800
): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured');
  }
  
  console.log(`[DeepSeek] Calling with model: ${model}, maxTokens: ${maxTokens}`);
  
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
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
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
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: { message: errorText } };
    }
    console.error('DeepSeek API error details:', {
      status: response.status,
      statusText: response.statusText,
      errorData: errorData
    });
    throw new Error(`DeepSeek API error (${response.status}): ${errorData.error?.message || errorText || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}
