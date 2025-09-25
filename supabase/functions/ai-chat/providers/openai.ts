
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
    console.error("OpenAI API key not configured");
    throw new Error('OpenAI API key not configured');
  }
  
  // Map gpt4o to the actual OpenAI model name
  const actualModel = model === 'gpt4o' ? 'gpt-4o' : model;
  
  // Check if this is a newer model that requires different parameters
  const isNewerModel = actualModel.startsWith('gpt-5') || 
                      actualModel.startsWith('gpt-4.1') || 
                      actualModel.startsWith('o3') || 
                      actualModel.startsWith('o4');
  
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
  
  try {
    console.log(`Calling OpenAI API with model: ${actualModel}`);
    
    // Prepare request body based on model type
    const requestBody: any = {
      model: actualModel,
      messages: messages,
    };
    
    // Use different parameters for newer vs legacy models
    if (isNewerModel) {
      requestBody.max_completion_tokens = 800;
      // Newer models don't support temperature parameter
    } else {
      requestBody.max_tokens = 800;
      requestBody.temperature = 0.7;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown error';
      console.error(`OpenAI API error (${response.status}): ${errorMessage}`);
      
      // For grading requests, return a simple INCORRECT to fail gracefully
      if (userMessage.startsWith('Grade this answer')) {
        console.log('Falling back to INCORRECT for failed grading request');
        return "INCORRECT";
      }
      
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
    
    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('Invalid response format from OpenAI:', data);
      throw new Error('Invalid response received from OpenAI');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in OpenAI API call:', error);
    
    // For grading requests, return a simple INCORRECT to fail gracefully
    if (userMessage.startsWith('Grade this answer')) {
      console.log('Falling back to INCORRECT after error for grading request');
      return "INCORRECT";
    }
    
    throw error;
  }
}
