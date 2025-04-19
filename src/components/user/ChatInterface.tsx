import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatPanel from './chat/ChatPanel';
import ExerciseList from './chat/ExerciseList';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useAdmin } from '@/context/AdminContext';

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
    filteredMessages,
    selectedSubject,
    setSelectedSubject,
    activeSubject
  } = useChat();
  
  const {
    exercises,
    exercisesBySubject,
    getExercisesBySubject,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat,
    linkAIResponseToExercise,
    addExercises
  } = useExercises();

  const { getActiveSubjects, subjects } = useAdmin();

  // Track processed message IDs to prevent duplication
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  
  // Get relevant exercises based on selected subject
  const relevantExercises = selectedSubject ? 
    getExercisesBySubject(selectedSubject) : exercises;

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
        // Process as possible homework
        processHomeworkFromChat(lastMessage.content, selectedSubject);
        // Mark this message as processed
        setProcessedMessageIds(prev => new Set([...prev, lastMessage.id]));
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
  
  // Create wrappers for the file upload handlers to pass the homework processor function and subject ID
  const handleDocumentFileUpload = (file: File) => {
    handleFileUpload(file, addExercises, selectedSubject);
  };
  
  const handlePhotoFileUpload = (file: File) => {
    handlePhotoUpload(file, addExercises, selectedSubject);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row h-[calc(100vh-11rem)] gap-4">
        <ChatPanel 
          messages={filteredMessages}
          isLoading={isLoading}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSendMessage={handleSendMessage}
          handleFileUpload={handleDocumentFileUpload}
          handlePhotoUpload={handlePhotoFileUpload}
          activeModel={activeModel}
          activeSubject={activeSubject}
          onSelectSubject={setSelectedSubject}
        />
        
        <div className="w-full md:w-2/3 glass rounded-xl overflow-hidden">
          <ExerciseList
            exercises={relevantExercises}
            grade={grade}
            toggleExerciseExpansion={toggleExerciseExpansion}
            subjectId={selectedSubject}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
