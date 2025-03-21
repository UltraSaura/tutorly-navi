
import React from 'react';
import { Send, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface MessageInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  isLoading: boolean;
}

const MessageInput = ({ inputMessage, setInputMessage, handleSendMessage, isLoading }: MessageInputProps) => {
  const { toast } = useToast();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    toast({
      title: "Upload Homework or Exercise",
      description: "You can upload PDFs, Word documents, or images of your homework to get help.",
    });
    // File upload functionality would be implemented here
  };
  
  const handlePhotoUpload = () => {
    toast({
      title: "Take a Photo of Your Work",
      description: "Take a picture of your homework or written exercise to get immediate feedback.",
    });
    // Photo upload functionality would be implemented here
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex gap-2">
        <Button variant="outline" size="icon" className="shrink-0" onClick={handleFileUpload}>
          <Upload className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" className="shrink-0" onClick={handlePhotoUpload}>
          <Camera className="h-5 w-5" />
        </Button>
        <Textarea 
          placeholder="Type your message..." 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-10 resize-none"
        />
        <Button 
          size="icon" 
          className="shrink-0 bg-studywhiz-600 hover:bg-studywhiz-700"
          disabled={inputMessage.trim() === '' || isLoading}
          onClick={handleSendMessage}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
