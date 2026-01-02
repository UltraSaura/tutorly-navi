
// OpenAI provider implementation
export async function callOpenAI(
  systemMessage: any, 
  history: any[], 
  userMessage: string, 
  model: string, 
  isExercise: boolean = false,
  requestExplanation: boolean = false,
  maxTokens: number = 800
): Promise<any> {
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
  
  try {
    console.log(`Calling OpenAI API with model: ${actualModel}, maxTokens: ${maxTokens}, requestExplanation: ${requestExplanation}`);
    
    // Prepare request body based on model type
    const requestBody: any = {
      model: actualModel,
      messages: messages,
    };
    
    // Add tool calling for explanation requests
    if (requestExplanation) {
      requestBody.tools = [{
        type: "function",
        function: {
          name: "generate_math_explanation",
          description: "Generate structured math explanation with distinct examples",
          parameters: {
            type: "object",
            properties: {
              isMath: { 
                type: "boolean",
                description: "Whether this is math-related content"
              },
              exercise: { 
                type: "string",
                description: "The original exercise statement"
              },
              sections: {
                type: "object",
                properties: {
                  concept: { 
                    type: "string",
                    description: "Core mathematical concept explanation"
                  },
                  example: { 
                    type: "string",
                    description: "Example with DIFFERENT numbers (different magnitude, at least 5 units away), NEVER revealing final answer (use ___)"
                  },
                  strategy: { 
                    type: "string",
                    description: "Step-by-step approach WITHOUT revealing the actual answer"
                  },
                  pitfall: { 
                    type: "string",
                    description: "Common mistakes students make"
                  },
                  check: { 
                    type: "string",
                    description: "How to verify the answer WITHOUT revealing it"
                  },
                  practice: { 
                    type: "string",
                    description: "Suggestion for improving at this topic"
                  }
                },
                required: ["concept", "example", "strategy", "pitfall", "check", "practice"]
              }
            },
            required: ["isMath", "exercise", "sections"]
          }
        }
      }];
      requestBody.tool_choice = { type: "function", function: { name: "generate_math_explanation" }};
    }
    
    // Use different parameters for newer vs legacy models
    if (isNewerModel) {
      requestBody.max_completion_tokens = maxTokens;
    } else {
      requestBody.max_tokens = maxTokens;
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
      
      if (userMessage.startsWith('Grade this answer')) {
        console.log('Falling back to INCORRECT for failed grading request');
        return "INCORRECT";
      }
      
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
    
    const data = await response.json();
    
    // Handle tool calling response
    if (requestExplanation && data.choices?.[0]?.message?.tool_calls) {
      return {
        tool_calls: data.choices[0].message.tool_calls,
        content: data.choices[0].message.content
      };
    }
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('Invalid response format from OpenAI:', data);
      throw new Error('Invalid response received from OpenAI');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in OpenAI API call:', error);
    
    if (userMessage.startsWith('Grade this answer')) {
      console.log('Falling back to INCORRECT after error for grading request');
      return "INCORRECT";
    }
    
    throw error;
  }
}
