import React, { memo, useMemo } from 'react';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';
import DOMPurify from 'dompurify';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useState } from 'react';

interface AIResponseProps {
  messages: Message[];
  isLoading: boolean;
}

interface ExerciseCardProps {
  userMessage: Message;
  aiResponse: Message;
}

// Helper functions moved outside component to prevent recreation
const parseUserMessage = (message: string) => {
  // Try to find "response" keyword to split question and answer
  const responseMatch = message.match(/^(.+?)\s+response\s+(.+)$/i);
  if (responseMatch) {
    return {
      question: responseMatch[1].trim(),
      answer: responseMatch[2].trim()
    };
  }
  
  // Fallback: try to split by "=" for math equations like "2+2=33"
  const equalsMatch = message.match(/^(.+?)=(.+)$/);
  if (equalsMatch) {
    return {
      question: equalsMatch[1].trim(),
      answer: equalsMatch[2].trim()
    };
  }
  
  // If no pattern found, treat entire message as question
  return {
    question: message,
    answer: message
  };
};

const getStatusStyles = (content: string) => {
  // Check the first line or beginning of content for status
  const contentTrimmed = content.trim();
  const firstLine = contentTrimmed.split('\n')[0];
  
  const isCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const isIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);
  
  // Use explicit color classes
  if (isIncorrect) {
    return 'bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800';
  }
  if (isCorrect) {
    return 'bg-green-50 dark:bg-green-950/20 border-2 border-green-300 dark:border-green-800';
  }
  
  return 'bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700';
};

const formatExplanation = (content: string) => {
  const cleanContent = content.replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '').trim();
  
  return cleanContent
    .replace(/\*\*Problem:\*\*/g, '<strong class="text-studywhiz-600 dark:text-studywhiz-400">Problem:</strong>')
    .replace(/\*\*Guidance:\*\*/g, '<strong class="text-studywhiz-600 dark:text-studywhiz-400">Guidance:</strong>')
    .replace(/^Guidance:\s*Problem:\s*/gm, '')
    .replace(/^\s*$/gm, '')
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('<br />');
};

// Add this new function to parse JSON responses
const parseAIResponse = (content: string) => {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to parse the entire content as JSON
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    return null;
  }
};

// Memoized ExerciseCard component
const ExerciseCard = memo<ExerciseCardProps>(({ userMessage, aiResponse, onSubmitAnswer }) => {
  const { question, answer } = parseUserMessage(userMessage.content);
  const content = aiResponse.content;
  const [userAnswerInput, setUserAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if this is a question without an answer
  const hasNoAnswer = !answer || answer === question;
  
  const contentTrimmed = content.trim();
  const firstLine = contentTrimmed.split('\n')[0];
  
  const isCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const isIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);
  
  const formattedExplanation = formatExplanation(content);

  const handleSubmitAnswer = async () => {
    if (!userAnswerInput.trim() || !onSubmitAnswer) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(question, userAnswerInput.trim());
      setUserAnswerInput(''); // Clear input after submission
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  // Get status image based on answer state
  const getStatusImage = () => {
    if (isCorrect === true) {
      return '/images/Happy Green Right Answer.png';
    } else if (isCorrect === false) {
      return '/images/Sad Face wrong Answer.png';
    } else {
      return null; // No image for neutral state, we'll use a question mark icon
    }
  };

  // If we have a valid JSON response with 2-card format, use it
  const jsonResponse = parseAIResponse(content);
  if (jsonResponse && jsonResponse.isMath && jsonResponse.sections) {
    // Get grading information from JSON response
    const isCorrect = jsonResponse.isCorrect;
    const isIncorrect = jsonResponse.isCorrect === false;
    
    return (
      <div className="w-full">
        <div 
          className={cn(
            'p-4 rounded-card transition-all duration-200 hover:shadow-md relative',
            // Add bolder, darker borders based on JSON response
            isCorrect === true 
              ? 'bg-green-50 border-2 border-green-600' // Dark green border for correct
              : isCorrect === false
              ? 'bg-red-50 border-2 border-red-600' // Dark pink/red border for incorrect
              : 'bg-neutral-surface border border-neutral-border' // Neutral for no answer
          )}
        >
          {/* Status Image - Top Right Corner */}
          <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
            {isCorrect === true ? (
              <img 
                src="/images/Happy Green Right Answer.png" 
                alt="Correct answer" 
                className="w-6 h-6 object-contain"
              />
            ) : isCorrect === false ? (
              <img 
                src="/images/Sad Face wrong Answer.png" 
                alt="Incorrect answer" 
                className="w-6 h-6 object-contain"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-sm font-bold">?</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 pr-8"> {/* Add right padding to avoid overlap with status image */}
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
              isCorrect === true
                ? 'bg-green-100 border border-green-300 text-green-600'
                : isCorrect === false
                ? 'bg-blue-100 border border-blue-200 text-blue-600'
                : 'bg-neutral-surface border border-neutral-border text-blue-600'
            )}>
              <Calculator size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-body font-semibold text-neutral-text mb-3">
                {question || jsonResponse.exercise}
              </div>
              
              {/* Answer section - either show existing answer or input field */}
              <div className="mb-3">
                {hasNoAnswer ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-text">
                      Your Answer:
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={userAnswerInput}
                        onChange={(e) => setUserAnswerInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter your answer..."
                        className="flex-1"
                        disabled={isSubmitting}
                      />
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!userAnswerInput.trim() || isSubmitting}
                        size="sm"
                        className="px-3"
                      >
                        <Send size={16} className="mr-1" />
                        Submit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'px-3 py-1',
                        isCorrect === true
                          ? 'bg-green-100 border border-green-300 text-green-800'
                          : isCorrect === false
                          ? 'bg-white border border-gray-200 text-gray-600'
                          : 'bg-neutral-bg text-neutral-muted'
                      )}
                    >
                      Your Answer: {answer}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Show Explanation Button with Popup */}
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-0.5 h-6"
                    >
                      Show Explanation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Exercise Explanation</DialogTitle>
                    </DialogHeader>
                    
                    {/* 2-Card Teaching Format in Popup */}
                    <div className="space-y-4">
                      {/* Exercise card */}
                      <div className="rounded-xl border bg-muted p-4">
                        <div className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📘 Exercise</div>
                        <div className="text-blue-700 dark:text-blue-300">
                          {jsonResponse.exercise || question}
                        </div>
                      </div>

                      {/* Guidance card */}
                      <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="space-y-4">
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>💡</span>
                              <span>Concept</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.concept}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>🔍</span>
                              <span>Example</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.example}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>☑️</span>
                              <span>Strategy</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.strategy}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>⚠️</span>
                              <span>Pitfall</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.pitfall}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>🎯</span>
                              <span>Check yourself</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.check}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <span>📈</span>
                              <span>Practice Tip</span>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {jsonResponse.sections.practice}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Add Try Again button for incorrect answers */}
                {isCorrect === false && (
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs px-2 py-0.5 h-6"
                    onClick={() => {
                      setUserAnswerInput('');
                    }}
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to old format for non-JSON responses
  return (
    <div className="w-full">
      <div 
        className={cn(
          'p-4 rounded-card transition-all duration-200 hover:shadow-md relative',
          getStatusStyles(content)
        )}
      >
        {/* Status Image - Top Right Corner */}
        <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
          {isCorrect ? (
            <img 
              src="/images/Happy Green Right Answer.png" 
              alt="Correct answer" 
              className="w-6 h-6 object-contain"
            />
          ) : isIncorrect ? (
            <img 
              src="/images/Sad Face wrong Answer.png" 
              alt="Incorrect answer" 
              className="w-6 h-6 object-contain"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-sm font-bold">?</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 pr-8"> {/* Add right padding to avoid overlap with status image */}
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
            'bg-neutral-surface border border-neutral-border text-blue-600'
          )}>
            <Calculator size={20} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-body font-semibold text-neutral-text mb-3">
              {question}
            </div>
            
            {/* Answer section - either show existing answer or input field */}
            <div className="mb-3">
              {hasNoAnswer ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-text">
                    Your Answer:
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={userAnswerInput}
                      onChange={(e) => setUserAnswerInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your answer..."
                      className="flex-1"
                      disabled={isSubmitting}
                    />
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!userAnswerInput.trim() || isSubmitting}
                      size="sm"
                      className="px-3"
                    >
                      <Send size={16} className="mr-1" />
                      Submit
                    </Button>
                  </div>
                </div>
              ) : (
                <Badge 
                  variant="secondary" 
                  className="px-3 py-1 bg-neutral-bg text-neutral-muted"
                >
                  Your Answer: {answer}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-0.5 h-6"
                  >
                    Show Explanation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Exercise Explanation</DialogTitle>
                  </DialogHeader>
                  <div className={cn(
                    "p-4 rounded-lg",
                    isCorrect 
                      ? "bg-green-50 dark:bg-green-950/20" 
                      : "bg-amber-50 dark:bg-amber-950/20"
                  )}>
                    <div className="space-y-3">
                      <div className="flex items-center mb-2">
                        {isCorrect 
                          ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          : <XCircle className="w-4 h-4 mr-2 text-amber-600" />
                        }
                        <h4 className="text-sm font-medium">
                          {isCorrect ? 'Great work!' : 'Learning Opportunity'}
                        </h4>
                      </div>
                      
                      <div 
                        className="text-sm text-gray-700 dark:text-gray-300 prose-sm max-w-full"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(formattedExplanation, { 
                            ALLOWED_TAGS: ['strong', 'br', 'em', 'p'],
                            ALLOWED_ATTR: ['class']
                          }) 
                        }}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {isIncorrect && (
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs px-2 py-0.5 h-6"
                  onClick={() => {
                    setUserAnswerInput('');
                  }}
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.userMessage.id === nextProps.userMessage.id &&
         prevProps.aiResponse.id === nextProps.aiResponse.id;
});

ExerciseCard.displayName = 'ExerciseCard';

const LoadingSkeleton = () => (
  <div className="w-full">
    <div className="p-4 rounded-card border bg-neutral-surface border-neutral-border animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-button bg-neutral-bg animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-neutral-bg rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-neutral-bg rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
);

const AIResponse: React.FC<AIResponseProps> = ({ messages, isLoading }) => {
  const exercisePairs = useMemo(() => {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const aiMessages = messages.filter(msg => msg.role === 'assistant' && msg.id !== '1');
    
    return userMessages.map((userMsg, index) => ({
      userMessage: userMsg,
      aiResponse: aiMessages[index] || null
    })).filter(pair => pair.aiResponse !== null) as Array<{
      userMessage: Message;
      aiResponse: Message;
    }>;
  }, [messages]);

  if (exercisePairs.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {exercisePairs.map((pair) => (
          <ExerciseCard
            key={pair.userMessage.id}
            userMessage={pair.userMessage}
            aiResponse={pair.aiResponse}
          />
        ))}
        
        {isLoading && <LoadingSkeleton />}
      </div>
    </div>
  );
};

export default AIResponse;