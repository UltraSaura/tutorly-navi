
import { useState } from 'react';
import { Message } from '@/types/chat';
import { useAdmin } from '@/context/AdminContext';
import { handleFileUpload, handlePhotoUpload } from '@/utils/chatFileHandlers';
import { sendMessageToAI } from '@/services/chatService';
import { generateFallbackResponse } from '@/utils/fallbackResponses';

export const useChat = () => {
  const { selectedModelId, getAvailableModels } = useAdmin();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi there! I'm your StudyWhiz AI tutor. How can I help you today? You can ask me questions, upload homework, or submit exercises for me to help you with.",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  
  // Get model info to display
  const activeModel = (() => {
    const models = getAvailableModels();
    const model = models.find(m => m.id === selectedModelId);
    return model ? model.name : 'AI Model';
  })();
  
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
    
    try {
      const { data, error } = await sendMessageToAI(inputMessage, messages, selectedModelId);
      
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
  
  // Using the extracted file handlers with the required state
  const handleDocumentUpload = (file: File) => {
    handleFileUpload(file, messages, setMessages, setIsLoading);
  };
  
  const handleImageUpload = (file: File) => {
    handlePhotoUpload(file, messages, setMessages, setIsLoading);
  };
  
  return {
    messages,
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
