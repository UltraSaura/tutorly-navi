import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showXpToast } from '@/components/game/XpToast';
import { TwoCards } from './TwoCards';
import { useTwoCardTeaching, TeachingSections } from './useTwoCardTeaching';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface ExplanationModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  sections: TeachingSections | null;
  error: string | null;
  onTryAgain?: () => void;
  exerciseQuestion?: string;
  imageUrl?: string;
  topicId?: string;
}

export function ExplanationModal({ 
  open, 
  onClose, 
  loading, 
  sections, 
  error,
  onTryAgain,
  exerciseQuestion,
  imageUrl,
  topicId
}: ExplanationModalProps) {
  const { t } = useLanguage();
  
  // Debug logging
  console.log('[ExplanationModal] Props received:', {
    open,
    loading,
    sections: sections ? 'Present' : 'Null',
    sectionsType: typeof sections,
    sectionsContent: sections,
    error,
    exerciseQuestion: exerciseQuestion?.substring(0, 50) + '...'
  });
  
  if (!open) return null;

  const handleTryAgain = () => {
    if (onTryAgain) {
      onTryAgain();
      showXpToast(5, "Great effort! Keep learning!");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground">{t("exercises.explanation.modal_title")}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
            aria-label={t("form.aria.close")}
          >
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : sections ? (
            <>
              {console.log('[ExplanationModal] Rendering TwoCards with sections:', sections)}
              {imageUrl && (
                <div className="mb-6">
                  <img 
                    src={imageUrl} 
                    alt="Exercise explanation" 
                    className="max-h-[60vh] w-auto mx-auto rounded-xl shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <TwoCards s={sections} topicId={topicId} onClose={onClose} />
            </>
          ) : (
            <>
              {console.log('[ExplanationModal] No sections available, showing fallback')}
              <div className="text-center text-muted-foreground">
                <p>No explanation data available</p>
                <p className="text-xs mt-2">Sections: {sections ? 'Present' : 'Null'}</p>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-border">
          {process.env.NODE_ENV !== "production" && (
            <div className="mb-4 text-xs text-muted-foreground">
              <button 
                onClick={() => console.log("[Explain] sections", sections)}
                className="hover:text-foreground transition-colors"
              >
                Log sections
              </button>
              <span className="mx-2">•</span>
              <button 
                onClick={() => alert("If empty, check console for raw AI output and template info.")}
                className="hover:text-foreground transition-colors"
              >
                Help
              </button>
            </div>
          )}
          <Button 
            onClick={handleTryAgain}
            className="w-full"
            size="lg"
          >
            Try again → +5 XP
          </Button>
        </div>
      </div>
    </div>
  );
}