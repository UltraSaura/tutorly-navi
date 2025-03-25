
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { 
  detectHomeworkInMessage, 
  extractHomeworkFromMessage
} from '@/utils/homeworkExtraction';

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
    processHomeworkFromChat,
    pendingEvaluations
  } = useExercises();

  // Track processed message IDs to prevent duplication
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());

  // Process user messages to detect homework submissions
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Skip if we've already processed this message
      if (processedMessageIds.has(lastMessage.id)) {
        console.log("Message already processed:", lastMessage.id);
        return;
      }
      
      if (lastMessage.role === 'user') {
        // Check if the message contains a homework submission (including math problems)
        const isHomework = detectHomeworkInMessage(lastMessage.content);
        
        // Additional check for math expressions
        const hasMathExpression = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(lastMessage.content);
        
        if (isHomework || hasMathExpression) {
          console.log("Processing homework submission:", lastMessage.content);
          
          // Process the homework
          processHomeworkFromChat(lastMessage.content);
          
          // Mark this message as processed
          setProcessedMessageIds(prev => new Set([...prev, lastMessage.id]));
          console.log("Marked message as processed:", lastMessage.id);
        }
      }
    }
  }, [messages, processedMessageIds, processHomeworkFromChat]);
  
  // Debug information
  useEffect(() => {
    console.log("ChatInterface - Current exercises count:", exercises.length);
    console.log("ChatInterface - Exercises with explanations:", 
                exercises.filter(ex => !!ex.explanation).length);
    console.log("ChatInterface - Expanded exercises:", 
                exercises.filter(ex => ex.expanded).length);
  }, [exercises]);
  
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
          pendingEvaluations={pendingEvaluations}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
