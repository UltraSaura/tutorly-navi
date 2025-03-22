
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';

const ChatInterface = () => {
  const [currentTab, setCurrentTab] = useState('chat');
  
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
    newExercise,
    setNewExercise,
    grade,
    toggleExerciseExpansion,
    submitAsExercise,
    submitExerciseAnswer,
    createExerciseFromAI
  } = useExercises();

  // Effect to detect homework exercises in AI responses
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only process assistant messages
      if (lastMessage.role === 'assistant') {
        // Check if this looks like a homework exercise
        const isHomework = detectHomeworkInMessage(lastMessage.content);
        
        if (isHomework) {
          // Extract the exercise and explanation
          const { question, explanation } = extractExerciseFromMessage(lastMessage.content);
          
          if (question) {
            // Create a new exercise from the AI response
            createExerciseFromAI(question, explanation || "Solve this exercise step by step.");
            
            // Automatically switch to exercise tab
            setCurrentTab('chat');
          }
        }
      }
    }
  }, [messages]);
  
  const detectHomeworkInMessage = (content: string): boolean => {
    // Keywords that might indicate a homework problem
    const homeworkKeywords = [
      'solve this', 'calculate', 'find the answer', 'homework', 
      'exercise', 'problem', 'question', 'assignment', 'solve for',
      'quiz', 'test', 'practice problem', 'compute', 'determine'
    ];
    
    const contentLower = content.toLowerCase();
    
    // Check if any keywords are in the content
    return homeworkKeywords.some(keyword => contentLower.includes(keyword));
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
  
  const handleSubmitExercise = () => {
    const exercise = submitAsExercise();
    if (exercise) {
      // Add a message to the chat about the exercise submission
      const confirmMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `I've added your exercise to the list. Let's work on it together! You can see it in the exercise panel.`,
        timestamp: new Date(),
      };
      
      addMessage(confirmMessage);
    }
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
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        newExercise={newExercise}
        setNewExercise={setNewExercise}
        submitAsExercise={handleSubmitExercise}
        activeModel={activeModel}
      />
      
      {/* Exercise Panel */}
      <div className="w-full md:w-2/3 glass rounded-xl overflow-hidden">
        <ExerciseList
          exercises={exercises}
          grade={grade}
          toggleExerciseExpansion={toggleExerciseExpansion}
          submitExerciseAnswer={submitExerciseAnswer}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
