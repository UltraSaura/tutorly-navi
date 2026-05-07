
// Google AI provider implementation
export async function callGoogle(
  systemMessage: any, 
  history: any[], 
  userMessage: string, 
  model: string, 
  isExercise: boolean = false,
  maxTokens: number = 800
): Promise<string> {
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
  
  if (!googleApiKey) {
    throw new Error('Google API key not configured');
  }
  
  console.log(`[Google] Calling with model: ${model}, maxTokens: ${maxTokens}`);
  
  // Google has a different API structure
  const combinedHistory = history.map(msg => msg.content).join("\n");
  const exerciseNote = isExercise ? "\n\nNote: Format this as an educational exercise if it's a homework question." : "";
  
  const promptText = `${systemMessage.content}\n\n${combinedHistory}\n\nUser: ${userMessage}${exerciseNote}\nAssistant:`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: promptText
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Google API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
