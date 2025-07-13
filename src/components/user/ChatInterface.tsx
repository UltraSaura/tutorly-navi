
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
import { detectHomeworkInMessage, extractHomeworkFromMessage } from '@/utils/homework';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { GraduationCap, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/SimpleLanguageContext';

const ChatInterface = () => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showChatHistory, setShowChatHistory] = useState(false);
  
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
        // Check if the message contains a homework submission (including math problems)
        const isHomework = detectHomeworkInMessage(lastMessage.content);

        // Additional check for math expressions
        const hasMathExpression = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(lastMessage.content);
        if (isHomework || hasMathExpression) {
          console.log('Detected homework in message:', lastMessage.content);
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

  // Mobile Layout - ChatGPT Style
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Main Content Area - Exercises and Grades */}
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Overall Grade Card */}
          <Card className="mb-4 mx-4 mt-4 max-w-sm self-center">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
              <CardTitle className="text-sm font-medium">{t('grades.overallGrade')}</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="text-2xl font-bold">{grade.percentage}%</div>
              <p className="text-xs text-muted-foreground">
                {t('grades.grade')}: {grade.letter}
              </p>
            </CardContent>
          </Card>
          
          {/* Exercise List */}
          <ExerciseList 
            exercises={exercises} 
            grade={grade} 
            toggleExerciseExpansion={toggleExerciseExpansion} 
          />
        </div>

        {/* Fixed Bottom Chat Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sheet open={showChatHistory} onOpenChange={setShowChatHistory}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('chat.history')}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>{t('chat.conversationHistory')}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex-1 overflow-hidden">
                  <MessageList messages={filteredMessages} isLoading={isLoading} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
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
  }

  // Desktop Layout - Keep existing side-by-side layout
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
      
      <div className="w-full md:w-2/3 glass rounded-xl overflow-hidden flex flex-col">
        {/* Overall Grade Card */}
        <Card className="mb-3 mx-4 mt-4 md:mt-8 max-w-sm self-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
            <CardTitle className="text-sm font-medium">{t('grades.overallGrade')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <div className="text-2xl font-bold">{grade.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {t('grades.grade')}: {grade.letter}
            </p>
          </CardContent>
        </Card>
        
        {/* Exercise List */}
        <div className="flex-1">
          <ExerciseList 
            exercises={exercises} 
            grade={grade} 
            toggleExerciseExpansion={toggleExerciseExpansion} 
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
