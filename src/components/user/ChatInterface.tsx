
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';

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

  // Effect to detect homework exercises in AI responses
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Process both user and assistant messages to handle homework
      if (lastMessage.role === 'user') {
        // When user sends a message, check if it contains a homework submission
        const isHomework = detectHomeworkInMessage(lastMessage.content);
        if (isHomework) {
          processHomeworkFromChat(lastMessage.content);
        }
      } else if (lastMessage.role === 'assistant') {
        // Process assistant messages for potential exercise creation
        const isExercise = detectExerciseInMessage(lastMessage.content);
        
        if (isExercise) {
          // Extract the exercise and explanation
          const { question, explanation } = extractExerciseFromMessage(lastMessage.content);
          
          if (question) {
            // Create a new exercise from the AI response
            createExerciseFromAI(question, explanation || "Review this exercise and complete the solution.");
          }
        }
      }
    }
  }, [messages]);
  
  const detectHomeworkInMessage = (content: string): boolean => {
    // Keywords that might indicate a homework submission
    const homeworkKeywords = [
      'my answer is', 'my solution is', 'here\'s my answer', 'homework answer',
      'assignment answer', 'my homework', 'i solved', 'solve:', 'answer:'
    ];
    
    const contentLower = content.toLowerCase();
    
    // Check if any keywords are in the content
    return homeworkKeywords.some(keyword => contentLower.includes(keyword));
  };
  
  const detectExerciseInMessage = (content: string): boolean => {
    // Keywords that might indicate an exercise explanation
    const exerciseKeywords = [
      'solve this', 'calculate', 'find the answer', 'homework', 
      'exercise', 'problem', 'question', 'assignment', 'solve for',
      'quiz', 'test', 'practice problem', 'compute', 'determine'
    ];
    
    const contentLower = content.toLowerCase();
    
    // Check if any keywords are in the content
    return exerciseKeywords.some(keyword => contentLower.includes(keyword));
  };
  
  const extractExerciseFromMessage = (content: string): { question: string, explanation: string } => {
    // Simple extraction - this could be made more sophisticated
    // For now, we'll take the first paragraph as the question
    // and the rest as the explanation
    const paragraphs = content.split('\n\n');
    
    if (paragraphs.length === 0) {
      return { question: content, explanation: '' };
    }
    
    // Take the first paragraph as the question
    const question = paragraphs[0].trim();
    
    // Use the rest as the explanation
    const explanation = paragraphs.slice(1).join('\n\n').trim();
    
    return { question, explanation };
  };
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-4">
      {/* Chat Panel */}
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
      
      {/* Exercise Panel */}
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
