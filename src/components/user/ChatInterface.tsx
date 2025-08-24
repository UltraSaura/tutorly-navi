
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import MessageInput from './chat/MessageInput';
import MessageList from './chat/MessageList';
import GamificationHeader from './chat/GamificationHeader';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useAdmin } from '@/context/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { detectHomeworkInMessage, extractHomeworkFromMessage, hasMultipleExercises } from '@/utils/homework';
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
    addExercises,
    submitAnswer,
    clearExercises
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
    console.log('=== DOCUMENT UPLOAD TRIGGERED ===');
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    console.log('Calling handleFileUpload...');
    handleFileUpload(file, addExercises, defaultSubject);
  };
  
  const handlePhotoFileUpload = (file: File) => {
    console.log('=== PHOTO UPLOAD TRIGGERED ===');
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    console.log('Calling handlePhotoUpload...');
    handlePhotoUpload(file, addExercises, defaultSubject);
  };

  // Mock gamification data - replace with real data when available
  const [mockGameData] = useState({
    xp: 0.65, // 65% progress to next level
    level: 3,
    streakDays: 7,
    streakActive: true,
    coins: 350
  });

  // Conversation-Focused Layout with Gamification
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Gamification Header */}
      <GamificationHeader
        xp={mockGameData.xp}
        level={mockGameData.level}
        streakDays={mockGameData.streakDays}
        streakActive={mockGameData.streakActive}
        coins={mockGameData.coins}
      />

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={filteredMessages} isLoading={isLoading} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-neutral-border bg-neutral-surface">
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
