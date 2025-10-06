import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { processMathContentForDisplay } from '@/utils/mathDisplayProcessor';
import { Message } from '@/types/chat';

interface AIResponseProps {
  messages: Message[];
  isLoading: boolean;
}

const AIResponse: React.FC<AIResponseProps> = ({ messages, isLoading }) => {
  // Get the latest AI response message
  const latestAIResponse = messages
    .filter(msg => msg.role === 'assistant')
    .pop();

  // Get the latest user message to understand context
  const latestUserMessage = messages
    .filter(msg => msg.role === 'user')
    .pop();

  if (!latestAIResponse && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-4 my-4 p-6 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-200 rounded-full animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!latestAIResponse) return null;

  const content = latestAIResponse.content;
  
  // Determine the type of response based on content
  const isCorrect = /\bCORRECT\b/i.test(content);
  const isIncorrect = /\bINCORRECT\b/i.test(content);
  const isNotMath = content.includes('NOT_MATH');

  // Process content for mathematical expressions
  const processedContent = processMathContentForDisplay(content);

  // Get appropriate icon and styling
  const getResponseStyle = () => {
    if (isCorrect) {
      return {
        icon: <CheckCircle className="h-6 w-6 text-green-600" />,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        title: 'Correct! ✓'
      };
    } else if (isIncorrect) {
      return {
        icon: <XCircle className="h-6 w-6 text-red-600" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        title: 'Let me help you with that'
      };
    } else if (isNotMath) {
      return {
        icon: <Info className="h-6 w-6 text-blue-600" />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        title: 'Information'
      };
    } else {
      return {
        icon: <AlertCircle className="h-6 w-6 text-amber-600" />,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        title: 'Solution'
      };
    }
  };

  const style = getResponseStyle();

  // Parse the content to extract the explanation
  const formatContent = (content: string) => {
    // Remove status indicators like CORRECT/INCORRECT from display
    let cleanContent = content
      .replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '')
      .trim();

    // Split by common separators for step-by-step explanations
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    return lines;
  };

  const contentLines = formatContent(content);

  return (
    <div className={`mx-4 my-4 p-6 ${style.bgColor} border ${style.borderColor} rounded-lg shadow-sm`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {style.icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold mb-3 ${style.textColor}`}>
            {style.title}
          </h3>
          
          {/* Show user's input for context */}
          {latestUserMessage && isIncorrect && (
            <div className="mb-3 p-3 bg-white/50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Your answer:</p>
              <p className="font-mono text-lg">{latestUserMessage.content}</p>
            </div>
          )}

          {/* Display the AI response */}
          <div className="space-y-2">
            {processedContent.isMath ? (
              <MathRenderer 
                latex={processedContent.processed} 
                inline={false}
                className="text-lg"
              />
            ) : (
              contentLines.map((line, index) => {
                // Check if this line contains math expressions
                const lineProcessed = processMathContentForDisplay(line);
                
                if (lineProcessed.isMath) {
                  return (
                    <div key={index} className="my-2">
                      <MathRenderer 
                        latex={lineProcessed.processed} 
                        inline={false}
                        className="text-base"
                      />
                    </div>
                  );
                }
                
                // Check if it's a step (starts with number or bullet)
                const isStep = /^[\d\-•*]/.test(line);
                
                return (
                  <p 
                    key={index} 
                    className={`${style.textColor} ${isStep ? 'ml-4' : ''} ${index === 0 ? 'text-base font-medium' : 'text-sm'}`}
                  >
                    {line}
                  </p>
                );
              })
            )}
          </div>

          {/* Show correct answer if the response was incorrect */}
          {isIncorrect && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-semibold text-green-800 mb-1">Correct Answer:</p>
              <p className="font-mono text-lg text-green-700">
                {/* Extract correct answer from response if available */}
                {(() => {
                  const match = content.match(/correct.*?is[:\s]+([^\n.]+)/i);
                  return match ? match[1].trim() : "See explanation above";
                })()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIResponse;