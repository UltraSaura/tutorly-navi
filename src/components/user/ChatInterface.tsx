
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { detectHomeworkInMessage, extractHomeworkFromMessage } from '@/utils/homeworkExtraction';

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
        // Check if the message contains a homework submission (including math problems)
        const isHomework = detectHomeworkInMessage(lastMessage.content);
        if (isHomework) {
          processHomeworkFromChat(lastMessage.content);
        }
        
        // Additional check for math expressions even if not explicitly marked as homework
        const hasMathExpression = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(lastMessage.content);
        if (hasMathExpression && !isHomework) {
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
    
    // Also detect if the AI is responding to a math problem
    const isMathResponse = /\b(CORRECT|INCORRECT)\b/i.test(content) &&
                         /\d+\s*[\+\-\*\/]\s*\d+/.test(content);
    
    return exerciseKeywords.some(keyword => contentLower.includes(keyword)) || isMathResponse;
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
