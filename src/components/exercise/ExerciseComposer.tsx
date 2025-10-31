import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface ExerciseComposerProps {
  onSubmitQuestion: (question: string) => void;
  onUpload: () => void;
  disabled?: boolean;
}

const ExerciseComposer = ({
  onSubmitQuestion,
  onUpload,
  disabled = false
}: ExerciseComposerProps) => {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

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

  return (
    <div className="p-6 border-t border-neutral-border bg-neutral-surface">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3">
          {/* Upload Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={onUpload}
            disabled={disabled}
            className="flex-shrink-0 h-12 w-12 p-0 border-neutral-border hover:bg-neutral-bg"
            aria-label={t("form.aria.uploadHomework")}
          >
            <Plus size={20} className="text-neutral-text" />
          </Button>
          
          {/* Input */}
          <div className="flex-1 relative">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("form.placeholders.questionOrHomework")}
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
              aria-label={t("form.aria.sendQuestion")}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} className="text-neutral-surface" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseComposer;