import { useState, useMemo, useEffect } from 'react';
import { Message } from '@/types/chat';
import { useAdmin } from '@/context/AdminContext';
import { handleFileUpload, handlePhotoUpload } from '@/utils/chatFileHandlers';
import { sendMessageToAI } from '@/services/chatService';
import { generateFallbackResponse } from '@/utils/fallbackResponses';
import { detectHomeworkInMessage } from '@/utils/homeworkExtraction';
import { classifyHomework } from '@/services/homeworkService';

export const useChat = () => {
  const { selectedModelId, getAvailableModels, subjects, getActiveSubjects } = useAdmin();
  
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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // Keep track of which AI messages are responses to homework submissions
  const [homeworkResponseIds, setHomeworkResponseIds] = useState<Set<string>>(new Set());
  
  // Get model info to display
  const activeModel = (() => {
    const models = getAvailableModels();
    const model = models.find(m => m.id === selectedModelId);
    return model ? model.name : 'AI Model';
  })();
  
  // Get subject info
  const activeSubject = useMemo(() => {
    if (!selectedSubject) return null;
    return subjects.find(s => s.id === selectedSubject);
  }, [selectedSubject, subjects]);
  
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
    
    try {
      // Get active subjects for classification
      const activeSubjects = getActiveSubjects();
      
      // Classify the message to detect homework and subject
      const classification = await classifyHomework(inputMessage, activeSubjects);
      
      // Use subject-specific model if a subject is selected and has a tutor model configured
      let modelToUse = selectedModelId;
      let isHomework = classification.isHomework;
      
      // If we have a selected subject with tutor active, or the message is classified for a specific subject
      const targetSubject = selectedSubject 
        ? subjects.find(s => s.id === selectedSubject)
        : classification.isHomework && classification.subjectId
          ? subjects.find(s => s.id === classification.subjectId)
          : null;
      
      if (targetSubject?.tutorActive && targetSubject?.tutorModelId) {
        modelToUse = targetSubject.tutorModelId;
        console.log(`Using subject-specific model ${modelToUse} for ${targetSubject.name}`);
      }
      
      // Enrich the message with subject information if it's homework
      const subjectInfo = classification.isHomework && classification.subjectId
        ? {
            subjectId: classification.subjectId,
            subjectName: classification.subject
          }
        : {};
      
      const { data, error } = await sendMessageToAI(
        inputMessage, 
        messages, 
        modelToUse,
        targetSubject?.tutorSystemPrompt,
        subjectInfo
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
          subjectId: classification.subjectId,
          isHomework: classification.isHomework,
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
      undefined,
      addExercises,
      subjectId || selectedSubject
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
      undefined,
      addExercises,
      subjectId || selectedSubject
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
    selectedSubject,
    setSelectedSubject,
    activeSubject,
    addMessage,
    handleSendMessage,
    handleFileUpload: handleDocumentUpload,
    handlePhotoUpload: handleImageUpload
  };
};
