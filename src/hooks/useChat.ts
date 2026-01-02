
import { useState, useMemo } from 'react';
import { Message } from '@/types/chat';
import { useAdmin } from '@/context/AdminContext';
import { handleFileUpload, handlePhotoUpload } from '@/utils/chatFileHandlers';
import { sendUnifiedMessage, generateUnifiedFallback } from '@/services/unifiedChatService';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useUserContext } from './useUserContext';

export interface CalculationState {
  isProcessing: boolean;
  currentStep: 'detecting' | 'analyzing' | 'solving' | 'grading' | 'complete';
  message?: string;
}

export const useChat = () => {
  const { selectedModelId, getAvailableModels, activePromptTemplate } = useAdmin();
  const { language, t } = useLanguage();
  const { userContext } = useUserContext();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('chat.welcomeMessage'),
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  // Add calculation state
  const [calculationState, setCalculationState] = useState<CalculationState>({
    isProcessing: false,
    currentStep: 'detecting'
  });

  const updateCalculationStatus = (
    step: CalculationState['currentStep'], 
    message?: string
  ) => {
    console.log('[useChat] updateCalculationStatus called with:', { step, message });
    setCalculationState({
      isProcessing: step !== 'complete',
      currentStep: step,
      message
    });
    console.log('[useChat] calculationState updated to:', { 
      isProcessing: step !== 'complete', 
      currentStep: step, 
      message 
    });
  };
  
  // Debug logging for input state changes
  const debugSetInputMessage = (message: string) => {
    console.log('[DEBUG] setInputMessage called with:', message);
    console.log('[DEBUG] Current inputMessage state:', inputMessage);
    setInputMessage(message);
  };
  
  // Keep track of which AI messages are responses to homework submissions that create exercises
  const [homeworkResponseIds, setHomeworkResponseIds] = useState<Set<string>>(new Set());
  
  // Get model info to display
  const activeModel = (() => {
    const models = getAvailableModels();
    const model = models.find(m => m.id === selectedModelId);
    return model ? model.name : 'AI Model';
  })();
  
  // Only filter messages when exercises are actually created, not for all math questions
  const filteredMessages = useMemo(() => {
    // For now, show all messages - let the interface decide what to display
    return messages;
  }, [messages]);
  
  // Add a message directly to the chat
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  const handleSendMessage = async (overrideMessage?: string) => {
    console.log('[DEBUG] handleSendMessage called');
    const effectiveMessage = overrideMessage ?? inputMessage;
    console.log('[DEBUG] Effective message before send:', effectiveMessage);
    console.log('[DEBUG] effectiveMessage length:', effectiveMessage?.length || 0);
    
    if (!effectiveMessage || effectiveMessage.trim() === '') {
      console.log('[DEBUG] Empty message, returning early');
      return;
    }
    
    const messageToSend = effectiveMessage; // Use passed-in value if provided
    console.log('[DEBUG] Message to send:', messageToSend);
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    console.log('[DEBUG] Sending unified message with model:', selectedModelId);
    setIsLoading(true);
    
    try {
      console.log('[useChat] Sending unified message to AI:', messageToSend);
      const { data, error } = await sendUnifiedMessage(
        messageToSend, 
        messages, 
        selectedModelId, 
        language,
        undefined,
        userContext
      );
      
      console.log('[useChat] Response received:', { 
        hasData: !!data, 
        hasError: !!error,
        data: data ? { isMath: data.isMath, contentLength: data.content?.length } : null
      });
      
      // Store the full response for potential exercise handling
      if (data) {
        console.log('[useChat] Processing response with data:', {
          isMath: data.isMath,
          includesNotMath: data.content.includes('NOT_MATH'),
          contentPreview: data.content.substring(0, 100)
        });
        
        setLastResponse(data);
        
        // Check if this is a NOT_MATH response
        if (!data.isMath || data.content.includes('NOT_MATH')) {
          console.log('[useChat] Detected NOT_MATH response, showing redirect');
          const redirectMessage = language === 'fr' 
            ? "Cette question ne semble pas être liée aux mathématiques. Cette interface est dédiée uniquement aux questions mathématiques. Pour les questions générales, veuillez utiliser la page de chat général."
            : "This question doesn't appear to be math-related. This interface is dedicated to mathematics questions only. For general questions, please use the general chat page.";
          
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: redirectMessage,
            timestamp: new Date(),
          };
          
          setMessages(prev => {
            console.log('[useChat] Adding redirect message to chat');
            return [...prev, aiResponse];
          });
        } else {
          console.log('[useChat] Math response detected, adding to messages');
          // Add AI response to messages - now includes automatic grading if answer provided
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
          };
          
          console.log('[useChat] Unified AI response created:', { 
            isMath: data.isMath, 
            hasAnswer: data.hasAnswer,
            isCorrect: data.isCorrect,
            confidence: data.confidence,
            selectedModelId, 
            messageId: aiResponse.id,
            content: data.content.substring(0, 100) 
          });
          
          setMessages(prev => {
            const updated = [...prev, aiResponse];
            console.log('[useChat] Messages updated, new count:', updated.length);
            return updated;
          });
        }
      } else if (error) {
        console.error('[useChat] Error in response:', error);
        // Use unified fallback response if the API call fails
        const fallbackResponse = generateUnifiedFallback(messageToSend, language);
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackResponse.content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        console.error('[useChat] No data and no error - unexpected state');
      }
    } finally {
      console.log('[useChat] Request complete, setting isLoading to false');
      setIsLoading(false);
    }
  };
  
  // Handle document upload with exercise processor and subject ID
  const handleDocumentUpload = (
    file: File, 
    addExercises?: (exercises: any[]) => Promise<void>,
    subjectId?: string
  ) => {
    handleFileUpload(
      file, 
      messages, 
      setMessages, 
      setIsLoading, 
      selectedModelId, // selectedModelId is now required parameter
      undefined, // No longer need processHomeworkFromChat as primary processor
      addExercises, // Pass the exercise processor directly
      subjectId // Pass the subject ID
    );
  };
  
  // Handle image upload with exercise processor and subject ID
  const handleImageUpload = (
    file: File, 
    addExercises?: (exercises: any[]) => Promise<void>,
    subjectId?: string
  ) => {
    handlePhotoUpload(
      file, 
      messages, 
      setMessages, 
      setIsLoading, 
      selectedModelId, // selectedModelId is now required parameter
      undefined, // No longer need processHomeworkFromChat as primary processor
      addExercises, // Pass the exercise processor directly
      subjectId, // Pass the subject ID
      handleSendMessage // Pass handleSendMessage to route through chat flow
    );
  };
  
  return {
    messages,
    filteredMessages,
    inputMessage,
    setInputMessage: debugSetInputMessage,
    isLoading,
    activeModel,
    lastResponse,
    addMessage,
    handleSendMessage,
    handleFileUpload: handleDocumentUpload,
    handlePhotoUpload: handleImageUpload,
    // Add calculation state back to return
    calculationState,
    updateCalculationStatus
  };
};
