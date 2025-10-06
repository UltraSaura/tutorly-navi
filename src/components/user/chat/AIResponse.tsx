import React, { memo, useMemo } from 'react';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';
import DOMPurify from 'dompurify';

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
  
  // Use explicit color classes to avoid any ambiguity
  if (isIncorrect) {
    return 'bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800';
  }
  if (isCorrect) {
    return 'bg-green-50 dark:bg-green-950/20 border-2 border-green-300 dark:border-green-800';
  }
  
  // Neutral/unknown state - gray border
  return 'bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700';
};

const formatExplanation = (content: string, tFunc: (key: string) => string) => {
  const cleanContent = content.replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '').trim();
  
  return cleanContent
    .replace(/\*\*Problem:\*\*/g, `<strong class="text-studywhiz-600 dark:text-studywhiz-400">${tFunc('exercise.problem')}:</strong>`)
    .replace(/\*\*Guidance:\*\*/g, `<strong class="text-studywhiz-600 dark:text-studywhiz-400">${tFunc('exercise.guidance')}:</strong>`)
    .replace(/^Guidance:\s*Problem:\s*/gm, '')
    .replace(/^exercise\.guidance:\s*exercise\.problem:\s*.*$/gm, '')
    .replace(/^\s*$/gm, '')
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('<br />');
};

// Memoized ExerciseCard component - only re-renders if userMessage or aiResponse IDs change
const ExerciseCard = memo<ExerciseCardProps>(({ userMessage, aiResponse }) => {
  const { t } = useLanguage();
  
  const { question, answer } = parseUserMessage(userMessage.content);
  const content = aiResponse.content;
  
  // Check status from content
  const contentTrimmed = content.trim();
  const firstLine = contentTrimmed.split('\n')[0];
  
  const isCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const isIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);
  
  const formattedExplanation = formatExplanation(content, t);

  return (
    <div className="w-full">
      {/* Response Card - styled like ExerciseCard */}
      <div 
        className={cn(
          'p-4 rounded-card transition-all duration-200 hover:shadow-md',
          getStatusStyles(content)
        )}
      >
        <div className="flex items-start gap-3">
          {/* Math Icon */}
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
            'bg-neutral-surface border border-neutral-border text-blue-600'
          )}>
            <Calculator size={20} />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* User's Question */}
            <div className="text-body font-semibold text-neutral-text mb-3">
              {question}
            </div>
            
            {/* Your Answer Badge */}
            <div className="mb-3">
              <Badge 
                variant="secondary" 
                className="px-3 py-1 bg-neutral-bg text-neutral-muted"
              >
                {t('exercise.answer')}: {answer}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-0.5 h-6"
                  >
                    {t('exercise.showExplanation')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-left">
                      {question}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">{t('exercise.answer')}:</h4>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {answer}
                        </p>
                      </div>
                    </div>
                    
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
                            {isCorrect 
                              ? t('exercise.greatWork')
                              : t('exercise.learningOpportunity')}
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
                  </div>
                </DialogContent>
              </Dialog>
              
              {isIncorrect && (
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs px-2 py-0.5 h-6"
                >
                  {t('exercise.tryAgain')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if the message IDs change
  return prevProps.userMessage.id === nextProps.userMessage.id &&
         prevProps.aiResponse.id === nextProps.aiResponse.id;
});

ExerciseCard.displayName = 'ExerciseCard';

// Loading skeleton component
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
  // Get all user messages (exercises) and their corresponding AI responses
  // Skip welcome message (id: '1')
  // Use useMemo to prevent recalculating on every render
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

  // Don't show anything if there are no exercises and not loading
  if (exercisePairs.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Render all existing exercise pairs */}
        {exercisePairs.map((pair) => (
          <ExerciseCard
            key={pair.userMessage.id}
            userMessage={pair.userMessage}
            aiResponse={pair.aiResponse}
          />
        ))}
        
        {/* Show loading skeleton at the end if loading */}
        {isLoading && <LoadingSkeleton />}
      </div>
    </div>
  );
};

export default AIResponse;