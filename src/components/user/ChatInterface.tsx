import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Message } from '@/types/chat';
import ExerciseList from './chat/ExerciseList';
import AIResponse from './chat/AIResponse';
import MessageInput from './chat/MessageInput';
import CameraCapture from './chat/CameraCapture';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useAdmin } from '@/context/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOverlay } from '@/context/OverlayContext';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FileText, Image, Camera, Upload } from 'lucide-react';
import CalculationStatus from './chat/CalculationStatus';

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
    filteredMessages,
    // Add calculation state
    calculationState
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

  // Keyboard handling
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Get active subjects and language
  const activeSubjects = getActiveSubjects();
  const defaultSubject = activeSubjects.length > 0 ? activeSubjects[0].id : undefined;
  
  // Simplified: AI now handles all detection and processing directly
  // No need for complex client-side math detection anymore

  // Keyboard change handler
  const handleKeyboardChange = (visible: boolean, height?: number) => {
    console.log('[DEBUG] Keyboard change:', visible, height);
    setKeyboardVisible(visible);
    setKeyboardHeight(height || 0);
  };

  // Create wrappers for the file upload handlers
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
      {/* Scrollable Content Area */}
      <div 
        className="h-full overflow-auto"
        style={{
          paddingBottom: keyboardVisible && keyboardHeight > 0
            ? `${keyboardHeight + 80}px`  // Keyboard height + input height
            : `${isMobile ? 128 : 80}px`  // Normal bottom padding
        }}
      >
        {/* DEBUG: Highly visible test div */}
        <div style={{ 
          backgroundColor: '#ff0000', 
          color: 'white', 
          padding: '20px', 
          fontSize: '18px', 
          margin: '10px'
        }}>
          <div style={{ fontSize: '24px', textAlign: 'center', marginBottom: '10px' }}>
            🚨 ChatInterface Debug Info 🚨
          </div>
          <div>
            <p>📊 Messages Count: {filteredMessages.length}</p>
            <p>⏳ Is Loading: {isLoading ? 'YES' : 'NO'}</p>
            <p>📝 Input Message: "{inputMessage}"</p>
            <p>📍 Current Path: {location.pathname}</p>
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer' }}>Click to see messages</summary>
              <pre style={{ fontSize: '12px', marginTop: '10px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {JSON.stringify(filteredMessages, null, 2)}
              </pre>
            </details>
          </div>
        </div>
        
        {/* AI Response - Display the latest AI explanation/response */}
        <AIResponse
          messages={filteredMessages}
          isLoading={isLoading}
        />
        
        {/* Exercise List - Display exercises if any */}
        {exercises.length > 0 && (
          <ExerciseList
            exercises={exercises}
            grade={grade}
            toggleExerciseExpansion={toggleExerciseExpansion}
            onSubmitAnswer={submitAnswer}
            onClearExercises={clearExercises}
          />
        )}
        
        {/* Add Calculation Status - Shows processing status */}
        <CalculationStatus
          isProcessing={calculationState.isProcessing}
          status={calculationState.currentStep}
          message={calculationState.message}
        />
      </div>

      {/* Fixed Chat Input - Only show on /chat route when no overlays are active */}
      {location.pathname === '/chat' && !hasActiveOverlay && (
        <div 
          className={`fixed left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border transition-all duration-300 ease-in-out`}
          style={{ 
            bottom: keyboardVisible && keyboardHeight > 0
              ? `${Math.max(keyboardHeight, 0)}px`  // Ensure non-negative
              : (isMobile ? '64px' : '0px'),  // Default position
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            zIndex: keyboardVisible ? 10001 : 50,  // Above keyboard when visible
            maxHeight: '30vh'  // Prevent input from taking too much space
          }}
        >
          <div className="px-[10px] py-1">
            <MessageInput
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              handleSendMessage={handleSendMessage}
              handleFileUpload={handleDocumentFileUpload}
              handlePhotoUpload={handlePhotoFileUpload}
              isLoading={isLoading}
              onKeyboardChange={handleKeyboardChange}
            />
          </div>
        </div>
      )}

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