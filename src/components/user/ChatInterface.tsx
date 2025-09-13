import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import ExerciseList from './chat/ExerciseList';
import MessageInput from './chat/MessageInput';
import CameraCapture from './chat/CameraCapture';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useAdmin } from '@/context/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { detectHomeworkInMessage, extractHomeworkFromMessage, hasMultipleExercises } from '@/utils/homework';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FileText, Image, Camera, Upload } from 'lucide-react';

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
  
  // Upload sheet state
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

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

        // Additional check for math expressions (including roots, variables, Unicode superscripts)
        const hasMathExpression = [
          /\d+\s*[\+\-\*\/]\s*\d+\s*=/,            // Basic equations
          /√|\\sqrt|sqrt\(/,                        // Square roots
          /[a-zA-Z]+\s*\^\s*\d+/,                  // Variable exponents (x^2)
          /\d+[²³⁴⁵⁶⁷⁸⁹⁰¹]/,                     // Unicode superscripts (2²)
          /[a-zA-Z]+[²³⁴⁵⁶⁷⁸⁹⁰¹]/               // Variable with Unicode superscripts (x²)
        ].some(pattern => pattern.test(lastMessage.content));
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

  // Handle question submission through chat pipeline
  const handleSubmitQuestion = async (question: string) => {
    if (question.trim()) {
      setInputMessage(question);
      // Wait for next tick to ensure inputMessage is set
      setTimeout(async () => {
        await handleSendMessage();
      }, 0);
    }
  };

  // Handle upload sheet opening
  const handleUploadHomework = () => {
    setShowUploadSheet(true);
  };

  // Handle document upload from sheet
  const handleDocumentUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleDocumentFileUpload(file);
        setShowUploadSheet(false);
      }
    };
    input.click();
  };

  // Handle photo upload from sheet
  const handlePhotoUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoFileUpload(file);
        setShowUploadSheet(false);
      }
    };
    input.click();
  };

  // Handle camera capture
  const handleCameraOpen = () => {
    setShowUploadSheet(false);
    setShowCamera(true);
  };

  const handleCameraCapture = (file: File) => {
    handlePhotoFileUpload(file);
    setShowCamera(false);
  };

  // Exercise-Focused Layout with Chat Input
  return (
    <div className="relative h-[calc(100vh-4rem)] bg-neutral-bg">
      {/* Exercise List */}
      <div className="h-full overflow-auto pb-32">
        <ExerciseList
          exercises={exercises}
          grade={grade}
          toggleExerciseExpansion={toggleExerciseExpansion}
          onSubmitAnswer={submitAnswer}
          onClearExercises={clearExercises}
        />
      </div>

      {/* Fixed Chat Input */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-neutral-bg border-t border-neutral-border shadow-lg px-6 py-4">
        <MessageInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSendMessage={handleSendMessage}
          handleFileUpload={handleDocumentFileUpload}
          handlePhotoUpload={handlePhotoFileUpload}
          isLoading={isLoading}
        />
      </div>

      {/* Upload Bottom Sheet */}
      <Sheet open={showUploadSheet} onOpenChange={setShowUploadSheet}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle className="text-h2 font-semibold text-neutral-text">
              Upload Homework
            </SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 mb-4">
            {/* Document Upload */}
            <Button
              onClick={handleDocumentUploadClick}
              className="flex flex-col items-center justify-center gap-3 h-24 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 rounded-card"
              variant="outline"
            >
              <FileText size={32} />
              <span className="text-body font-medium">Upload Document (PDF)</span>
            </Button>

            {/* Photo Upload */}
            <Button
              onClick={handlePhotoUploadClick}
              className="flex flex-col items-center justify-center gap-3 h-24 bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-700 rounded-card"
              variant="outline"
            >
              <Image size={32} />
              <span className="text-body font-medium">Upload Photo</span>
            </Button>

            {/* Camera */}
            <Button
              onClick={handleCameraOpen}
              className="flex flex-col items-center justify-center gap-3 h-24 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 text-orange-700 rounded-card"
              variant="outline"
            >
              <Camera size={32} />
              <span className="text-body font-medium">Take Photo</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default ChatInterface;