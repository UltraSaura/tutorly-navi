import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import UploadModal from '@/components/upload/UploadModal';

type UploadType = 'document' | 'photo' | 'camera';

interface ExerciseComposerProps {
  onSubmitQuestion: (question: string) => void;
  onUpload: (type: UploadType) => void;
  disabled?: boolean;
}

const ExerciseComposer = ({
  onSubmitQuestion,
  onUpload,
  disabled = false
}: ExerciseComposerProps) => {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitQuestion(question.trim());
      setQuestion('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleUploadSelect = (type: UploadType) => {
    onUpload(type);
    setShowUploadModal(false);
  };

  return (
    <div className="p-6 border-t border-neutral-border bg-neutral-surface">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3">
          {/* Upload Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowUploadModal(true)}
            disabled={disabled}
            className="flex-shrink-0 h-12 w-12 p-0 border-neutral-border hover:bg-neutral-bg"
            aria-label="Upload homework"
          >
            <Plus size={20} className="text-neutral-text" />
          </Button>
          
          {/* Input */}
          <div className="flex-1 relative">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question or homework here..."
              disabled={disabled || isSubmitting}
              className={cn(
                "min-h-12 pr-12 resize-none border-neutral-border",
                "focus:border-brand-primary focus:ring-1 focus:ring-brand-primary",
                "placeholder:text-neutral-muted"
              )}
            />
            
            {/* Send Button */}
            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || isSubmitting || disabled}
              size="sm"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0",
                "bg-brand-primary hover:bg-brand-primary/90 disabled:bg-neutral-border"
              )}
              aria-label="Send question"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} className="text-neutral-surface" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Helper text */}
        <p className="text-caption text-neutral-muted mt-2 text-center">
          Ask questions, upload homework, or get help with any subject
        </p>
      </div>
      
      {/* Upload Modal */}
      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSelect={handleUploadSelect}
      />
    </div>
  );
};

export default ExerciseComposer;