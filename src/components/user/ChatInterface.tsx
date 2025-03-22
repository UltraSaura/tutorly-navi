import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { detectHomeworkInMessage } from '@/utils/homeworkExtraction';
import { extractExerciseFromMessage } from '@/utils/homeworkExtraction';

const ChatInterface = () => {
  const { 
    messages, 
    inputMessage, 
    setInputMessage, 
    isLoading, 
    activeModel,
    addMessage,
    handleSendMessage, 
    handleFileUpload, 
    handlePhotoUpload 
  } = useChat();
  
  const {
    exercises,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat
  } = useExercises();

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.role === 'user') {
        const isHomework = detectHomeworkInMessage(lastMessage.content);
        if (isHomework) {
          processHomeworkFromChat(lastMessage.content);
        }
      } else if (lastMessage.role === 'assistant') {
        const isExercise = detectExerciseInMessage(lastMessage.content);
        
        if (isExercise) {
          const { question, explanation } = extractExerciseFromMessage(lastMessage.content);
          
          if (question) {
            createExerciseFromAI(question, explanation || "Review this exercise and complete the solution.");
          }
        }
      }
    }
  }, [messages]);
  
  const detectExerciseInMessage = (content: string): boolean => {
    const exerciseKeywords = [
      'solve this', 'calculate', 'find the answer', 'homework', 
      'exercise', 'problem', 'question', 'assignment', 'solve for',
      'quiz', 'test', 'practice problem', 'compute', 'determine'
    ];
    
    const contentLower = content.toLowerCase();
    
    return exerciseKeywords.some(keyword => contentLower.includes(keyword));
  };
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-4">
      <ChatPanel 
        messages={messages}
        isLoading={isLoading}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSendMessage}
        handleFileUpload={handleFileUpload}
        handlePhotoUpload={handlePhotoUpload}
        activeModel={activeModel}
      />
      
      <div className="w-full md:w-2/3 glass rounded-xl overflow-hidden">
        <ExerciseList
          exercises={exercises}
          grade={grade}
          toggleExerciseExpansion={toggleExerciseExpansion}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
