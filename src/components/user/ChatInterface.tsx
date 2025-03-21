
import { useState } from 'react';
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
    submitExerciseAnswer
  } = useExercises();
  
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
