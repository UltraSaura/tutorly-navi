
import React, { useRef } from 'react';
import { Send, Paperclip, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface MessageInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (file: File) => void;
  handlePhotoUpload: (file: File) => void;
  isLoading: boolean;
}

const MessageInput = ({ 
  inputMessage, 
  setInputMessage, 
  handleSendMessage, 
  handleFileUpload, 
  handlePhotoUpload, 
  isLoading 
}: MessageInputProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const triggerPhotoUpload = () => {
    photoInputRef.current?.click();
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
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="relative flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.doc,.docx,.txt" 
          onChange={(e) => onFileSelected(e, false)}
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full p-2 text-gray-500" 
          onClick={triggerFileUpload}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <input 
          type="file" 
          ref={photoInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => onFileSelected(e, true)}
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full p-2 text-gray-500" 
          onClick={triggerPhotoUpload}
        >
          <Camera className="h-5 w-5" />
        </Button>
        
        <Textarea 
          placeholder={t('chat.inputPlaceholder')} 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-h-10 resize-none border-0 focus-visible:ring-0 p-3 flex-1",
            isLoading && "opacity-50"
          )}
        />
        
        <Button 
          size="icon" 
          className={cn(
            "rounded-full m-1 bg-studywhiz-600 hover:bg-studywhiz-700",
            (!inputMessage.trim() || isLoading) && "opacity-50 cursor-not-allowed"
          )}
          disabled={inputMessage.trim() === '' || isLoading}
          onClick={handleSendMessage}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
