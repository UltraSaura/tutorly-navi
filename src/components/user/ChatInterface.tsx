
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
    handlePhotoUpload,
    filteredMessages
  } = useChat();
  
  const {
    exercises,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat,
    linkAIResponseToExercise
  } = useExercises();

  // Track processed message IDs to prevent duplication
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Skip if we've already processed this message
      if (processedMessageIds.has(lastMessage.id)) {
        return;
      }
      
      if (lastMessage.role === 'user') {
        // Check if the message contains a homework submission (including math problems)
        const isHomework = detectHomeworkInMessage(lastMessage.content);
        
        // Additional check for math expressions
        const hasMathExpression = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(lastMessage.content);
        
        if (isHomework || hasMathExpression) {
          processHomeworkFromChat(lastMessage.content);
          // Mark this message as processed
          setProcessedMessageIds(prev => new Set([...prev, lastMessage.id]));
        }
      } else if (lastMessage.role === 'assistant') {
        // Find the most recent user message to link with this AI response
        const recentUserMsgIndex = messages.slice(0, messages.length - 1)
          .reverse()
          .findIndex(msg => msg.role === 'user');
          
        if (recentUserMsgIndex !== -1) {
          const recentUserMsg = messages[messages.length - 2 - recentUserMsgIndex];
          const userMsgId = recentUserMsg.id;
          
          // Check if the user message was a homework submission
          if (processedMessageIds.has(userMsgId)) {
            // Link this AI response to the exercise created from the user message
            linkAIResponseToExercise(recentUserMsg.content, lastMessage);
          }
        }
        
        // Mark this message as processed
        setProcessedMessageIds(prev => new Set([...prev, lastMessage.id]));
      }
    }
  }, [messages, processedMessageIds]);
  
  // Create wrappers for the file upload handlers to pass the homework processor function
  const handleDocumentFileUpload = (file: File) => {
    handleFileUpload(file, processHomeworkFromChat);
  };
  
  const handlePhotoFileUpload = (file: File) => {
    handlePhotoUpload(file, processHomeworkFromChat);
  };
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-4">
      <ChatPanel 
        messages={filteredMessages}
        isLoading={isLoading}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSendMessage}
        handleFileUpload={handleDocumentFileUpload}
        handlePhotoUpload={handlePhotoFileUpload}
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
