import React from 'react';
import { ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showXpToast } from '@/components/game/XpToast';
import { TwoCards } from './TwoCards';
import { useTwoCardTeaching, TeachingSections } from './useTwoCardTeaching';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { HomeworkSmartLearningResourcesCard } from '@/components/learning/HomeworkSmartLearningResourcesCard';
import type { SafeHomeworkLearningRow } from '@/services/homeworkLearningResources';

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
              />
              {(onLike || onDislike) && (
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    type="button"
                    variant={feedback === 'like' ? 'default' : 'outline'}
                    size="sm"
                    disabled={feedbackLoading}
                    onClick={onLike}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {t('common.like', { defaultValue: 'Like' })}
                  </Button>
                  <Button
                    type="button"
                    variant={feedback === 'dislike' ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={feedbackLoading}
                    onClick={onDislike}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    {t('common.dislike', { defaultValue: 'Dislike' })}
                  </Button>
                </div>
              )}
              {homeworkLearningRows.length > 0 && (
                <div className="mt-4">
                  <HomeworkSmartLearningResourcesCard
                    rows={homeworkLearningRows}
                    sourceId={homeworkSourceId}
                    title={homeworkTitle || exerciseQuestion || sections.exercise}
                    onPracticeClick={onTryAgain}
                  />
                </div>
              )}
            </>
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

        <div className="p-5 border-t border-border">
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
      </div>
    </div>
  );
}
