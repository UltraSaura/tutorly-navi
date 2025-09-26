
import { useState, useMemo } from 'react';
import { Message } from '@/types/chat';
import { useAdmin } from '@/context/AdminContext';
import { handleFileUpload, handlePhotoUpload } from '@/utils/chatFileHandlers';
import { sendUnifiedMessage, generateUnifiedFallback } from '@/services/unifiedChatService';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useUserContext } from './useUserContext';

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
  
  const handleSendMessage = async () => {
    console.log('[DEBUG] handleSendMessage called');
    console.log('[DEBUG] Current inputMessage before send:', inputMessage);
    console.log('[DEBUG] inputMessage length:', inputMessage.length);
    
    if (inputMessage.trim() === '') {
      console.log('[DEBUG] Empty message, returning early');
      return;
    }
    
    const messageToSend = inputMessage; // Capture the message before clearing
    console.log('[DEBUG] Message to send:', messageToSend);
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };
    
    setMessages([...messages, newMessage]);
    setInputMessage('');
    console.log('[DEBUG] Sending unified message with model:', selectedModelId);
    setIsLoading(true);
    
    try {
      console.log('[DEBUG] Sending unified message to AI:', messageToSend);
      const { data, error } = await sendUnifiedMessage(
        messageToSend, 
        messages, 
        selectedModelId, 
        language,
        activePromptTemplate?.prompt_content,
        userContext
      );
      
      // Store the full response for potential exercise handling
      if (data) {
        setLastResponse(data);
        
        // Check if this is a NOT_MATH response
        if (!data.isMath || data.content.includes('NOT_MATH')) {
          const redirectMessage = language === 'fr' 
            ? "Cette question ne semble pas être liée aux mathématiques. Cette interface est dédiée uniquement aux questions mathématiques. Pour les questions générales, veuillez utiliser la page de chat général."
            : "This question doesn't appear to be math-related. This interface is dedicated to mathematics questions only. For general questions, please use the general chat page.";
          
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: redirectMessage,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, aiResponse]);
        } else {
          // Add AI response to messages - now includes automatic grading if answer provided
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
          };
          
          console.log('[DEBUG] Unified AI response created:', { 
            isMath: data.isMath, 
            hasAnswer: data.hasAnswer,
            isCorrect: data.isCorrect,
            confidence: data.confidence,
            selectedModelId, 
            content: data.content.substring(0, 100) 
          });
          
          setMessages(prev => [...prev, aiResponse]);
        }
      } else if (error) {
        // Use unified fallback response if the API call fails
        const fallbackResponse = generateUnifiedFallback(messageToSend, language);
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackResponse.content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } finally {
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
      subjectId // Pass the subject ID
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
    handlePhotoUpload: handleImageUpload
  };
};
