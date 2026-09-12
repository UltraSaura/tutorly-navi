import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AIResponse from './chat/AIResponse';
import MessageInput from './chat/MessageInput';
import WelcomeFox from './chat/WelcomeFox';
import { useChat } from '@/hooks/useChat';
import { useExercises } from '@/hooks/useExercises';
import { useAdmin } from '@/context/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOverlay } from '@/context/OverlayContext';
import { useAuth } from '@/context/AuthContext';
import { useTutorAdaptiveProblem, type TutorAdaptiveData } from '@/hooks/useTutorAdaptiveProblem';
import { TutorRemediationPanel } from './chat/TutorRemediationPanel';
import CalculationStatus from './chat/CalculationStatus';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageMeta } from '@/components/seo/PageMeta';
import { classifyProblemSubmission } from '@/utils/problemClassifier';
import { QuizOverlayController } from '@/components/learning/QuizOverlayController';

const ChatInterface = ({ adaptiveData }: { adaptiveData?: TutorAdaptiveData } = {}) => {
  const ui = useInterfaceTranslation();
  const { user } = useAuth();
  const tutorAdaptive = useTutorAdaptiveProblem(user?.id, user?.user_metadata?.level, adaptiveData);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { hasActiveOverlay } = useOverlay();

  const {
    inputMessage,
    setInputMessage,
    isLoading,
    addMessage,
    clearMessages,
    removeMessage,
    handleSendMessage,
    submitGroupedProblemAnswers,
    handleFileUpload,
    handlePhotoUpload,
    filteredMessages,
    calculationState,
  } = useChat();
  const {
    processHomeworkFromChat,
    addExercises,
    clearExercises,
  } = useExercises();
  const { getActiveSubjects } = useAdmin();

  const [uploadRequest, setUploadRequest] = useState<'document' | 'photo' | 'camera' | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const activeSubjects = getActiveSubjects();
  const defaultSubject = activeSubjects.length > 0 ? activeSubjects[0].id : undefined;

  const handleKeyboardChange = (visible: boolean, height?: number) => {
    setKeyboardVisible(visible);
    setKeyboardHeight(height || 0);
  };

  const handleDocumentFileUpload = (file: File) => {
    handleFileUpload(file, addExercises, defaultSubject);
  };

  const handlePhotoFileUpload = (file: File) => {
    handlePhotoUpload(file, addExercises, defaultSubject);
  };

  const handleSendMessageWithGrading = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage ?? inputMessage;
    if (!messageToSend || messageToSend.trim() === '') return;

    const classification = classifyProblemSubmission(messageToSend);
    if (classification.type !== 'simple_exercise') {
      await handleSendMessage(overrideMessage);
      return;
    }

    const looksLikeMathExercise = /\d.*=.*\d/.test(messageToSend.trim());
    if (looksLikeMathExercise) {
      try {
        const result = await processHomeworkFromChat(messageToSend);
        if (result.localGraded) {
          if (result.exercise) tutorAdaptive.recordEvaluated(result.exercise);
          addMessage({
            id: Date.now().toString(),
            role: 'user',
            content: messageToSend,
            timestamp: new Date(),
          });
          const grade = result.isCorrect ? '10/10' : '0/10';
          addMessage({
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.isCorrect ? `CORRECT\n${grade}` : `INCORRECT\n${grade}`,
            timestamp: new Date(),
          });
          setInputMessage('');
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('[ChatInterface] Local grading failed', error);
      }
    }

    await handleSendMessage(overrideMessage);

    try {
      const result = await processHomeworkFromChat(messageToSend, { persist: false });
      if (result.exercise) tutorAdaptive.recordEvaluated(result.exercise);
    } catch (error) {
      if (import.meta.env.DEV) console.error('[ChatInterface] Homework evaluation failed', error);
    }
  };

  const handleAnswerSubmit = async (question: string, answer: string) => {
    await handleSendMessageWithGrading(`${question}=${answer}`);
  };

  const showWelcomeState =
    filteredMessages.filter((message) => message.role === 'user').length === 0 &&
    !isLoading &&
    !calculationState.isProcessing;

  return (
    <div
      className={`relative h-[calc(100vh-4rem)] overflow-x-hidden max-w-full ${showWelcomeState ? 'bg-white' : 'bg-neutral-bg'}`}
    >
      <PageMeta
        title={ui('Tutor')}
        description={ui('Get guided help with homework, exercises, photos, and documents from your Stuwy tutor.')}
      />

      <div
        className={`h-full overflow-x-hidden ${showWelcomeState ? 'overflow-auto bg-white' : 'overflow-auto'}`}
        style={{
          paddingBottom: showWelcomeState
            ? `${isMobile ? 150 : 100}px`
            : keyboardVisible && keyboardHeight > 0
              ? `${keyboardHeight + 80}px`
              : `${isMobile ? 128 : 80}px`,
        }}
      >
        <AnimatePresence mode="wait">
          {showWelcomeState && (
            <motion.div
              key="welcome-fox"
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.25 } }}
            >
              <WelcomeFox
                onUploadDocument={() => setUploadRequest('document')}
                onUploadPhoto={() => setUploadRequest('photo')}
                onOpenCamera={() => setUploadRequest('camera')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ErrorBoundary
          fallback={
            <div className="p-4 m-4 bg-card border rounded-lg text-center">
              <p className="text-muted-foreground">{ui('Unable to display responses. Please refresh.')}</p>
            </div>
          }
        >
          <AIResponse
            messages={filteredMessages}
            isLoading={isLoading}
            onSubmitAnswer={handleAnswerSubmit}
            onSubmitGroupedAnswers={submitGroupedProblemAnswers}
            onClearAll={() => { clearMessages(); clearExercises(); tutorAdaptive.reset(); }}
            onDismissExercise={(messageId) => removeMessage(messageId)}
          />
        </ErrorBoundary>

        <TutorRemediationPanel tutorAdaptive={tutorAdaptive} />
        <CalculationStatus
          isProcessing={calculationState.isProcessing}
          status={calculationState.currentStep}
          message={calculationState.message}
        />
        <QuizOverlayController />
      </div>

      {location.pathname === '/chat' && !hasActiveOverlay && tutorAdaptive.view?.phase !== 'active' && (
        <div
          data-explanation-hide="chat-input"
          className="fixed left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border transition-all duration-300 ease-in-out"
          style={{
            bottom: keyboardVisible && keyboardHeight > 0 ? `${Math.max(keyboardHeight, 0)}px` : (isMobile ? '88px' : '0px'),
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            zIndex: keyboardVisible ? 10001 : 50,
            maxHeight: '30vh',
          }}
        >
          <div className="px-[10px] py-1">
            <MessageInput
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              handleSendMessage={handleSendMessageWithGrading}
              handleFileUpload={handleDocumentFileUpload}
              handlePhotoUpload={handlePhotoFileUpload}
              isLoading={isLoading}
              onKeyboardChange={handleKeyboardChange}
              uploadRequest={uploadRequest}
              onUploadRequestHandled={() => setUploadRequest(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default ChatInterface;
