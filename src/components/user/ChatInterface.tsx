import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Message } from '@/types/chat';
import ExerciseList from './chat/ExerciseList';
import ChatPanel from './chat/ChatPanel';
import CameraCapture from './chat/CameraCapture';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useAdmin } from '@/context/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOverlay } from '@/context/OverlayContext';
import { detectMathWithAI } from '@/services/aiMathDetection';
import { processAIDetectedExercise, processMultipleAIExercises } from '@/utils/exerciseProcessor';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FileText, Image, Camera, Upload } from 'lucide-react';

const ChatInterface = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const location = useLocation();
  const { hasActiveOverlay } = useOverlay();
  
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
    getActiveSubjects,
    selectedModelId
  } = useAdmin();

  // Track processed message IDs to prevent duplication
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  
  // Upload sheet state
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Get active subjects and language
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
        // Use AI-powered math detection
        (async () => {
          try {
            const mathDetection = await detectMathWithAI(lastMessage.content, selectedModelId, language);
            console.log('AI Math Detection Result:', mathDetection);
            
            if (mathDetection.isMath && mathDetection.confidence > 50 && !mathDetection.isQuestion) {
              if (mathDetection.isMultiple) {
                console.log('Processing multiple exercises from AI detection');
                processMultipleAIExercises(
                  lastMessage.content, 
                  mathDetection, 
                  exercises, 
                  processedMessageIds, 
                  language,
                  selectedModelId
                ).then(newExercises => {
                  if (newExercises.length > 0) {
                    addExercises(newExercises);
                  }
                });
              } else {
                console.log('Processing single exercise from AI detection');
                processAIDetectedExercise(
                  lastMessage.content,
                  mathDetection,
                  exercises,
                  processedMessageIds,
                  language,
                  selectedModelId
                ).then(result => {
                  if (result) {
                    if (result.isUpdate) {
                      // Update existing exercise
                      const updatedExercises = exercises.map(ex => 
                        ex.id === result.exercise.id ? result.exercise : ex
                      );
                      addExercises(updatedExercises);
                    } else {
                      // Add new exercise
                      addExercises([result.exercise]);
                    }
                  }
                });
              }
              
              // Mark this message as processed
              setProcessedMessageIds(prev => new Set([...prev, lastMessage.id]));
            }
          } catch (error) {
            console.error('Error in AI math detection:', error);
          }
        })();
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
  }, [messages, processedMessageIds, selectedModelId, language]);

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

  // Exercise-Focused Layout with Chat Integration
  return (
    <div className="relative h-[calc(100vh-4rem)] bg-neutral-bg">
      <div className="h-full flex flex-col md:flex-row gap-0">
        {/* Exercise List - Takes 2/3 on desktop, full width on mobile */}
        <div className="flex-1 md:flex-[2] h-full overflow-auto">
          <ExerciseList
            exercises={exercises}
            grade={grade}
            toggleExerciseExpansion={toggleExerciseExpansion}
            onSubmitAnswer={submitAnswer}
            onClearExercises={clearExercises}
          />
        </div>

        {/* Chat Panel - Takes 1/3 on desktop, full width on mobile */}
        {location.pathname === '/chat' && !hasActiveOverlay && (
          <div className="md:flex-[1] h-full">
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
          </div>
        )}
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