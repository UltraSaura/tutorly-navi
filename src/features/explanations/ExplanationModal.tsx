import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showXpToast } from '@/components/game/XpToast';
import { TwoCards } from './TwoCards';
import { useTwoCardTeaching, TeachingSections } from './useTwoCardTeaching';
import { useLanguage } from '@/context/SimpleLanguageContext';
import type { SafeHomeworkLearningRow } from '@/services/homeworkLearningResources';
import { QuizOverlay } from '@/components/learning/QuizOverlay';
import { useAuth } from '@/context/AuthContext';
import type { QuizBank } from '@/types/quiz-bank';

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
  subjectSlug?: string;
  topicSlug?: string;
  homeworkLearningRows?: SafeHomeworkLearningRow[];
  homeworkSourceId?: string;
  homeworkTitle?: string;
  onLike?: () => void;
  onDislike?: () => void;
  feedback?: 'like' | 'dislike' | null;
  feedbackLoading?: boolean;
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
  topicId,
  subjectSlug,
  topicSlug,
  homeworkLearningRows = [],
  homeworkSourceId,
  homeworkTitle,
  onLike,
  onDislike,
  feedback = null,
  feedbackLoading = false,
}: ExplanationModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [generatedPractice, setGeneratedPractice] = React.useState<QuizBank | null>(null);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add('explanation-modal-open');

    return () => {
      document.body.classList.remove('explanation-modal-open');
    };
  }, [open]);
  
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
      showXpToast(5, t('exercises.explanation.xp.great_effort'));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg md:h-[85vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
          <h3 className="font-semibold text-lg text-foreground">
            {generatedPractice?.title || t("exercises.explanation.modal_title")}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => generatedPractice ? setGeneratedPractice(null) : onClose()}
            className="h-6 w-6"
            aria-label={t("form.aria.close")}
          >
            <X size={16} />
          </Button>
        </div>

        <div className={generatedPractice ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-hidden p-5"}>
          {generatedPractice && user ? (
            <QuizOverlay
              bank={generatedPractice}
              userId={user.id}
              onClose={() => setGeneratedPractice(null)}
              recordAttempt={false}
              embedded
            />
          ) : loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : sections ? (
            <div className="flex h-full min-h-0 flex-col">
              {console.log('[ExplanationModal] Rendering TwoCards with sections:', sections)}
              {imageUrl && (
                <div className="mb-6 shrink-0">
                  <img 
                    src={imageUrl} 
                    alt={t('exercises.explanation.image_alt')}
                    className="max-h-[60vh] w-auto mx-auto rounded-xl shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <TwoCards 
                s={sections} 
                topicId={topicId} 
                subjectSlug={subjectSlug}
                topicSlug={topicSlug}
                onClose={onClose} 
                onStartGeneratedPractice={setGeneratedPractice}
              />
            </div>
          ) : (
            <>
              {console.log('[ExplanationModal] No sections available, showing fallback')}
              <div className="text-center text-muted-foreground">
                <p>{t('exercises.explanation.empty.no_data')}</p>
                <p className="text-xs mt-2">{t('exercises.explanation.empty.sections')}: {sections ? t('common.present') : t('common.none')}</p>
              </div>
            </>
          )}
        </div>

        {!sections && (
          <div className="shrink-0 border-t border-border p-5">
            {process.env.NODE_ENV !== "production" && (
              <div className="mb-4 text-xs text-muted-foreground">
                <button 
                  onClick={() => console.log("[Explain] sections", sections)}
                  className="hover:text-foreground transition-colors"
                >
                  {t('exercises.explanation.debug.log_sections')}
                </button>
                <span className="mx-2">•</span>
                <button 
                  onClick={() => alert(t('exercises.explanation.debug.help_message'))}
                  className="hover:text-foreground transition-colors"
                >
                  {t('exercises.explanation.debug.help')}
                </button>
              </div>
            )}
            <Button 
              onClick={handleTryAgain}
              className="w-full"
              size="lg"
            >
              {t('exercises.try_again', { xp: 5 })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
