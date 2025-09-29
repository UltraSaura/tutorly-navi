
import React, { useRef, useState } from 'react';
import { Send, Calculator, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/context/AdminContext';
import CameraCapture from './CameraCapture';
import AttachmentMenu from './AttachmentMenu';
import { MathLiveInput } from '@/components/math';

interface MessageInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (file: File) => void;
  handlePhotoUpload: (file: File) => void;
  isLoading: boolean;
  onKeyboardChange?: (isVisible: boolean, height: number) => void;
}

const MessageInput = ({ 
  inputMessage, 
  setInputMessage, 
  handleSendMessage, 
  handleFileUpload, 
  handlePhotoUpload, 
  isLoading,
  onKeyboardChange 
}: MessageInputProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { selectedModelId, getAvailableModels } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMathMode, setIsMathMode] = useState(false);

  // Get the model display name
  const activeModel = getAvailableModels().find(model => model.id === selectedModelId);
  const modelDisplayName = activeModel ? `${activeModel.provider} • ${activeModel.name}` : selectedModelId;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('[DEBUG] Enter key pressed in textarea, calling handleSendMessage');
      handleSendMessage();
    }
  };

  const handleMathEnter = () => {
    console.log('[DEBUG] Enter key pressed in math input, calling handleSendMessage');
    handleSendMessage();
  };

  const handleSendClick = () => {
    console.log('[DEBUG] Send button clicked');
    console.log('[DEBUG] Current inputMessage:', inputMessage);
    console.log('[DEBUG] inputMessage length:', inputMessage.length);
    console.log('[DEBUG] isLoading:', isLoading);
    
    if (!inputMessage.trim()) {
      console.log('[DEBUG] Empty message, not sending');
      return;
    }
    
    console.log('[DEBUG] Calling handleSendMessage');
    handleSendMessage();
  };

  const toggleMathMode = () => {
    setIsMathMode(!isMathMode);
    // If switching to text mode, ensure input gets focus
    if (isMathMode) {
      setTimeout(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
      }, 100);
    }
  };

  const handleMathEscape = () => {
    console.log('[DEBUG] Math input escape pressed, switching to text mode');
    setIsMathMode(false);
    // Focus the textarea after switching
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.focus();
    }, 100);
  };

  // Auto-detect math content and suggest math mode
  // Only suggest math mode for LaTeX syntax or algebraic expressions with variables
  // NOT for natural language math expressions like "four times two = five"
  const shouldSuggestMathMode = !isMathMode && (
    // LaTeX commands
    /\\[a-zA-Z]/.test(inputMessage) ||
    // Fractions with LaTeX syntax
    /\\frac\{/.test(inputMessage) ||
    // Algebraic expressions with variables
    /[a-zA-Z]\s*[\+\-\*/\^]\s*\d+/.test(inputMessage) ||
    /\d+\s*[\+\-\*/\^]\s*[a-zA-Z]/.test(inputMessage) ||
    // Mathematical notation with exponents or complex expressions
    /[a-zA-Z]\^/.test(inputMessage) ||
    // Fraction notation (numbers only, not words)
    /^\s*\d+\s*\/\s*\d+\s*$/.test(inputMessage)
  ) && 
  // Exclude natural language patterns
  !/\b(one|two|three|four|five|six|seven|eight|nine|ten|plus|minus|times|divided|equals)\b/i.test(inputMessage);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const triggerPhotoUpload = () => {
    photoInputRef.current?.click();
  };

  const openCameraDialog = () => {
    setIsCameraOpen(true);
  };

  const handleCameraCapture = (file: File) => {
    handlePhotoUpload(file);
    toast({
      title: t('upload.photoUploaded'),
      description: t('upload.photoSuccess'),
    });
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>, isPhoto: boolean) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('upload.fileTooLarge'),
          description: t('upload.maxFileSize'),
          variant: "destructive"
        });
        return;
      }

      if (isPhoto) {
        // Check that it's an image
        if (!file.type.startsWith('image/')) {
          toast({
            title: t('upload.invalidFileType'),
            description: t('upload.imageFileError'),
            variant: "destructive"
          });
          return;
        }
        handlePhotoUpload(file);
        toast({
          title: t('upload.photoUploaded'),
          description: t('upload.photoSuccess'),
        });
      } else {
        // For documents, check that it's a valid type
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!validTypes.includes(file.type)) {
          toast({
            title: t('upload.invalidFileType'),
            description: t('upload.documentFileError'),
            variant: "destructive"
          });
          return;
        }
        handleFileUpload(file);
        toast({
          title: t('upload.documentUploaded'),
          description: `${file.name} ${t('upload.documentSuccess')}`,
        });
      }
      
      // Reset the input value so the same file can be uploaded again
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Math Mode Suggestion */}
      {shouldSuggestMathMode && (
        <div className="flex justify-center">
          <div className="bg-brand-primary/10 text-brand-primary text-xs px-3 py-2 rounded-md">
            LaTeX notation detected - <button onClick={toggleMathMode} className="underline font-medium">Switch to math mode</button> for advanced formatting
          </div>
        </div>
      )}
      
      {/* Main Input Area - Moved below and made full width */}
      <div className="relative w-full">
        <div className="flex items-center gap-2 bg-neutral-surface rounded-button border border-neutral-border p-2 w-full">
          {/* Attachment Menu */}
          <AttachmentMenu
            onFileUpload={triggerFileUpload}
            onPhotoUpload={triggerPhotoUpload}
            onCameraOpen={openCameraDialog}
          />
          
          {/* Hidden File Inputs */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.txt" 
            onChange={(e) => onFileSelected(e, false)}
          />
          <input 
            type="file" 
            ref={photoInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => onFileSelected(e, true)}
          />
          
          {/* Input Field */}
          <div className="flex-1">
            {isMathMode ? (
              <MathLiveInput
                value={inputMessage}
                onChange={(value) => {
                  console.log('[DEBUG] MathLiveInput onChange called with:', value);
                  setInputMessage(value);
                }}
                onEnter={handleMathEnter}
                onEscape={handleMathEscape}
                onKeyboardChange={onKeyboardChange}
                placeholder={t('chat.mathInputPlaceholder', 'Type mathematical expressions...')}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
                disabled={isLoading}
              />
            ) : (
              <Textarea 
                placeholder={t('chat.inputPlaceholder')}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[40px] max-h-32 resize-none border-0 shadow-none focus-visible:ring-0 text-neutral-text placeholder:text-neutral-muted bg-transparent"
                disabled={isLoading}
              />
            )}
          </div>
          
          {/* Mode Toggle Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMathMode}
            className="h-9 w-9 text-neutral-muted hover:text-neutral-text hover:bg-neutral-surface flex-shrink-0"
            title={isMathMode ? "Switch to text mode" : "Switch to math mode"}
          >
            {isMathMode ? <Type className="h-4 w-4" /> : <Calculator className="h-4 w-4" />}
          </Button>
          
          {/* Send Button */}
          <Button
            type="button"
            size="icon"
            disabled={!inputMessage.trim() || isLoading}
            className="h-9 w-9 bg-brand-primary hover:bg-brand-navy text-white rounded-button flex-shrink-0"
            onClick={handleSendClick}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default MessageInput;
