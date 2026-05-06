
// DeepSeek AI provider implementation
export async function callDeepSeek(
  systemMessage: any, 
  history: any[], 
  userMessage: string, 
  model: string, 
  isExercise: boolean = false,
  requestExplanation: boolean = false,
  maxTokens: number = 800
): Promise<any> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured');
  }
  
  console.log(`[DeepSeek] Calling with model: ${model}, maxTokens: ${maxTokens}, requestExplanation: ${requestExplanation}`);
  
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
  
  const requestBody: any = {
    model: model,
    messages: messages,
    temperature: 0.7,
    max_tokens: maxTokens,
  };

  // Add tool calling for explanation requests (DeepSeek is OpenAI-compatible)
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
            steps: {
              type: "array",
              description: "Ordered TwoCard explanation steps. Render exactly in this order.",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  icon: {
                    type: "string",
                    enum: ["lightbulb", "magnifier", "divide", "checklist", "warning", "target"]
                  },
                  kind: {
                    type: "string",
                    enum: ["concept", "example", "strategy", "pitfall", "check"]
                  }
                },
                required: ["title", "body", "icon", "kind"]
              }
            },
            meta: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["concept", "solution"] },
                revealAnswer: { type: "boolean" }
              }
            },
            sections: {
              type: "object",
              description: "Legacy fallback only. Prefer steps for new explanations."
            }
          },
          required: ["isMath", "exercise", "steps"]
        }
      }
    }];
    requestBody.tool_choice = { type: "function", function: { name: "generate_math_explanation" }};
  }
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
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

  // Handle tool calling response
  if (requestExplanation && data.choices?.[0]?.message?.tool_calls) {
    return {
      tool_calls: data.choices[0].message.tool_calls,
      content: data.choices[0].message.content
    };
  }

  return data.choices[0].message.content;
}
