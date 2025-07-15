
import { useState, useMemo } from 'react';
import { Message } from '@/types/chat';
import { useAdmin } from '@/context/AdminContext';
import { handleFileUpload, handlePhotoUpload } from '@/utils/chatFileHandlers';
import { sendMessageToAI } from '@/services/chatService';
import { generateFallbackResponse } from '@/utils/fallbackResponses';
import { detectHomeworkInMessage } from '@/utils/homework';
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
  
  // Keep track of which AI messages are responses to homework submissions
  const [homeworkResponseIds, setHomeworkResponseIds] = useState<Set<string>>(new Set());
  
  // Get model info to display
  const activeModel = (() => {
    const models = getAvailableModels();
    const model = models.find(m => m.id === selectedModelId);
    return model ? model.name : 'AI Model';
  })();
  
  // Filter out AI messages that are responses to homework submissions
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      // Keep all user messages
      if (message.role === 'user') return true;
      
      // Filter out AI messages that are responses to homework
      return !homeworkResponseIds.has(message.id);
    });
  }, [messages, homeworkResponseIds]);
  
  // Add a message directly to the chat
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages([...messages, newMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    // Check if this message is a homework submission
    const isHomework = detectHomeworkInMessage(inputMessage);
    
    try {
      const { data, error } = await sendMessageToAI(
        inputMessage, 
        messages, 
        selectedModelId, 
        language,
        activePromptTemplate?.prompt,
        userContext
      );
      
      // Store the full response for potential exercise handling
      if (data) {
        setLastResponse(data);
        
        // Add AI response to messages
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
        };
        
        // If this is a homework-related message, add it to our tracking set
        if (isHomework) {
          setHomeworkResponseIds(prev => new Set([...prev, aiResponse.id]));
        }
        
        setMessages(prev => [...prev, aiResponse]);
      } else if (error) {
        // Use fallback response if the API call fails
        const fallbackResponse = generateFallbackResponse(inputMessage);
        setMessages(prev => [...prev, fallbackResponse]);
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
      undefined, // No longer need processHomeworkFromChat as primary processor
      addExercises, // Pass the exercise processor directly
      subjectId // Pass the subject ID
    );
  };
  
  return {
    messages,
    filteredMessages,
    inputMessage,
    setInputMessage,
    isLoading,
    activeModel,
    lastResponse,
    addMessage,
    handleSendMessage,
    handleFileUpload: handleDocumentUpload,
    handlePhotoUpload: handleImageUpload
  };
};
