
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';
import MessageInput from './chat/MessageInput';
import MessageList from './chat/MessageList';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useAdmin } from '@/context/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { detectHomeworkInMessage, extractHomeworkFromMessage, hasMultipleExercises } from '@/utils/homework';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/SimpleLanguageContext';

const ChatInterface = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
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
    linkAIResponseToExercise,
    addExercises
  } = useExercises();
  const {
    getActiveSubjects
  } = useAdmin();

  // Track processed message IDs to prevent duplication
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());

  // Get active subjects
  const activeSubjects = getActiveSubjects();
  const defaultSubject = activeSubjects.length > 0 ? activeSubjects[0].id : undefined;
  
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Skip if we've already processed this message
      if (processedMessageIds.has(lastMessage.id)) {
        return;
      }
      if (lastMessage.role === 'user') {
        // Check if the message contains homework (single or multiple exercises)
        const isHomework = detectHomeworkInMessage(lastMessage.content);
        const hasMultiple = hasMultipleExercises(lastMessage.content);

        // Additional check for math expressions
        const hasMathExpression = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(lastMessage.content);
        if (isHomework || hasMultiple || hasMathExpression) {
          console.log('Detected homework in message (single or multiple):', lastMessage.content);
          processHomeworkFromChat(lastMessage.content);
          // Mark this message as processed
          setProcessedMessageIds(prev => new Set([...prev, lastMessage.id]));
        }
      } else if (lastMessage.role === 'assistant') {
        // Find the most recent user message to link with this AI response
        const recentUserMsgIndex = messages.slice(0, messages.length - 1).reverse().findIndex(msg => msg.role === 'user');
        if (recentUserMsgIndex !== -1) {
          const recentUserMsg = messages[messages.length - 2 - recentUserMsgIndex];
          const userMsgId = recentUserMsg.id;

          // Check if the user message was a homework submission
          if (processedMessageIds.has(userMsgId)) {
            // Link this AI response to the exercise created from the user message
            console.log('Linking AI response to exercise from user message:', recentUserMsg.content);
            linkAIResponseToExercise(recentUserMsg.content, lastMessage);
          }
        }

        // Mark this message as processed
        setProcessedMessageIds(prev => new Set([...prev, lastMessage.id]));
      }
    }
  }, [messages, processedMessageIds]);

  // Create wrappers for the file upload handlers to pass the homework processor function and subject ID
  const handleDocumentFileUpload = (file: File) => {
    handleFileUpload(file, addExercises, defaultSubject);
  };
  const handlePhotoFileUpload = (file: File) => {
    handlePhotoUpload(file, addExercises, defaultSubject);
  };

  // Exercise-Focused Layout for Both Mobile and Desktop
  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Exercise List with padding for chat input */}
      <div className="h-full overflow-y-auto pb-32">
        <div className="p-4">
          <ExerciseList 
            exercises={exercises} 
            grade={grade} 
            toggleExerciseExpansion={toggleExerciseExpansion} 
          />
        </div>
      </div>

      {/* Chat input positioned at bottom - responsive for mobile/desktop */}
      <div className={`fixed bottom-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 border-t border-border z-50 ${
        isMobile 
          ? 'left-4 right-4 p-4' 
          : 'left-[calc(var(--sidebar-width,16rem)+1.5rem)] right-6 p-3'
      }`}>
        <MessageInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSendMessage={handleSendMessage}
          handleFileUpload={handleDocumentFileUpload}
          handlePhotoUpload={handlePhotoFileUpload}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
