import React from "react";
import type { TeachingSections } from "./useTwoCardTeaching";
import { useResolveText } from "@/hooks/useResolveText";
import { useEffect, useState } from 'react'; // NEW
import { supabase } from '@/integrations/supabase/client'; // NEW
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import { useUserContext } from '@/hooks/useUserContext';
import { extractExpressionFromText } from '@/utils/mathStepper/parser';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { toChildFriendlyExplanationText } from './childFriendlyText';
import ExplanationCards from './ExplanationCards';
import { trackLearningInteraction } from '@/services/learningAnalytics';

function Section({ title, text }: { title: string; text: string }) {
  const resolveText = useResolveText();
  if (!text) return null;

  const content = toChildFriendlyExplanationText(resolveText(text));

  return (
    <div className="mt-4 first:mt-0">
      <div className="font-medium">{title}</div>
      <div
        className={[
          // readable body + robust resets against global styles
          "explain-text prose prose-neutral max-w-none",
          "leading-relaxed break-words",
          "whitespace-pre-wrap",
          "!tracking-normal [letter-spacing:normal] [word-spacing:normal]",
          "text-sm text-muted-foreground",
        ].join(" ")}
        style={{
          whiteSpace: "pre-wrap",
          letterSpacing: "normal",
          wordSpacing: "normal",
        }}
      >
        {content}
      </div>
    </div>
  );
}

export function TwoCards({ 
  s, 
  topicId, 
  onClose,
  subjectSlug,
  topicSlug 
}: { 
  s: TeachingSections; 
  topicId?: string; 
  onClose?: () => void;
  subjectSlug?: string;
  topicSlug?: string;
}) {
  console.log('[TwoCards] Component rendered with sections:', s);
  const resolveText = useResolveText();
  const [isGuardian, setIsGuardian] = useState(false); // NEW
  const { userContext } = useUserContext(); // NEW: Get user context for grade level
  const { t, language } = useLanguage();
  const trackedExplanationKeyRef = React.useRef<string | null>(null);
  const trackedSupportKeyRef = React.useRef<string | null>(null);
  const trackedCheckKeyRef = React.useRef<string | null>(null);
  
  // Fetch topic routing info if we have topicId but not slugs
  const { data: topicData, isLoading: topicDataLoading } = useQuery({
    queryKey: ['topic-for-lesson-link', topicId],
    queryFn: async () => {
      if (!topicId) return null;
      const { data } = await supabase
        .from('topics')
        .select(`
          slug,
          lesson_content,
          category:learning_categories!inner(
            subject:subjects!inner(slug)
          )
        `)
        .eq('id', topicId)
        .single();
      return data;
    },
    enabled: !!topicId && (!subjectSlug || !topicSlug)
  });
  
  // Determine if we can show the lesson link
  const canShowLessonLink = topicId && (
    (subjectSlug && topicSlug) || 
    (topicData?.slug && topicData?.category?.subject?.slug)
  );
  
  const finalSubjectSlug = subjectSlug || topicData?.category?.subject?.slug;
  const finalTopicSlug = topicSlug || topicData?.slug;
  const hasLessonContent = !!(topicData?.lesson_content || subjectSlug);
  
  // Handle view lesson - navigate to topic page (no scroll)
  const handleViewLesson = () => {
    if (!finalSubjectSlug || !finalTopicSlug) return;
    
    // Close modal first
    onClose?.();
    
    // Navigate to topic page (no hash, user lands at top)
    setTimeout(() => {
      window.location.href = `/learning/${finalSubjectSlug}/${finalTopicSlug}`;
    }, 200);
  };
  
  // NEW: Check if user is guardian
  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();
      
      setIsGuardian(data?.user_type === 'parent' || data?.user_type === 'guardian');
    }
    checkUserRole();
  }, []);

  // Check if exercise is pure arithmetic (not a word problem)
  const isPureArithmeticProblem = (text: string): boolean => {
    const lower = text.toLowerCase();
    const conceptualKeywords = [
      'heure', 'minute', 'départ', 'arrivée', 'durée', 'temps',
      'hour', 'time', 'clock', 'am', 'pm',
      'périmètre', 'aire', 'surface', 'triangle', 'rectangle',
      'perimeter', 'area', 'angle', 'circle', 'cercle',
      'km', 'mètre', 'litre', 'gramme', 'meter', 'kilogram',
      '€', '$', 'prix', 'coût', 'monnaie', 'price', 'cost',
    ];
    if (conceptualKeywords.some(kw => lower.includes(kw))) return false;
    if (/\d{1,2}:\d{2}/.test(text)) return false;
    return /\d+\s*[+\-×÷*/]\s*\d+/.test(text);
  };

  // Detect operation type from example or exercise
  const detectOp = (text: string): string => {
    if (text.includes('×') || text.includes('*')) return '×';
    if (text.includes('÷') || text.includes('/')) return '÷';
    if (text.includes('-')) return '-';
    if (text.includes('+')) return '+';
    return '+';
  };
  
  const orderedSteps = Array.isArray(s.steps) && s.steps.length > 0 ? s.steps : null;
  const stepTextForExpression = orderedSteps
    ? orderedSteps.map(step => `${step.title}\n${step.body}`).join('\n\n')
    : s.example;
  const miniPracticeContext = React.useMemo(() => {
    if (!orderedSteps || !s.exercise?.trim()) return undefined;

    const explanationContext = orderedSteps
      .filter(step => step.kind !== "check")
      .map(step => `${step.title}\n${step.body}`)
      .join("\n\n");

    return {
      exercise: s.exercise,
      explanationContext,
      gradeLevel: userContext?.student_level,
      language,
      learningStyle: userContext?.learning_style,
      subject: subjectSlug || "Math",
      country: userContext?.country,
      enabled: true,
    };
  }, [
    orderedSteps,
    s.exercise,
    userContext?.student_level,
    userContext?.learning_style,
    userContext?.country,
    language,
    subjectSlug,
  ]);

  React.useEffect(() => {
    if (!s.exercise?.trim()) return;
    const key = `${s.exercise}:${orderedSteps?.length || 'legacy'}`;
    if (trackedExplanationKeyRef.current === key) return;
    trackedExplanationKeyRef.current = key;

    trackLearningInteraction({
      eventType: 'explanation_opened',
      learningStyleUsed: userContext?.learning_style,
      supportType: userContext?.learning_style,
      subject: subjectSlug || 'Math',
      topicId,
      metadata: {
        hasSteps: Boolean(orderedSteps),
        adaptiveExplanationVersion: (s as any).adaptiveExplanationVersion,
      },
    });
  }, [orderedSteps, s, subjectSlug, topicId, userContext?.learning_style]);

  React.useEffect(() => {
    if (!orderedSteps?.length || !s.exercise?.trim()) return;
    const checkIndex = orderedSteps.findIndex(step => step.kind === 'check');
    const supportStep = orderedSteps.find((step, index) =>
      step.kind === 'strategy' && (checkIndex === -1 || index < checkIndex)
    );
    if (!supportStep) return;

    const key = `${s.exercise}:${supportStep.title}:${supportStep.kind}`;
    if (trackedSupportKeyRef.current === key) return;
    trackedSupportKeyRef.current = key;

    trackLearningInteraction({
      eventType: 'explanation_style_support_viewed',
      learningStyleUsed: userContext?.learning_style,
      supportType: userContext?.learning_style,
      subject: subjectSlug || 'Math',
      topicId,
      concept: orderedSteps.find(step => step.kind === 'concept')?.title,
      metadata: {
        supportTitle: supportStep.title,
      },
    });
  }, [orderedSteps, s.exercise, subjectSlug, topicId, userContext?.learning_style]);

  React.useEffect(() => {
    if (!orderedSteps?.some(step => step.kind === 'check') || !s.exercise?.trim()) return;
    const key = `${s.exercise}:check`;
    if (trackedCheckKeyRef.current === key) return;
    trackedCheckKeyRef.current = key;

    trackLearningInteraction({
      eventType: 'explanation_check_started',
      learningStyleUsed: userContext?.learning_style,
      supportType: userContext?.learning_style,
      practiceStyle: userContext?.learning_style,
      subject: subjectSlug || 'Math',
      topicId,
      metadata: {
        runtimeMiniPracticeEnabled: true,
      },
    });
  }, [orderedSteps, s.exercise, subjectSlug, topicId, userContext?.learning_style]);

  // NEW: Extract math expression from example for InteractiveMathStepper
  let exampleExpression = stepTextForExpression ? extractExpressionFromText(stepTextForExpression) : null;
  
  // Fallback: If no expression extracted, synthesize one matching the operation type
  if (!exampleExpression) {
    const opSymbol = detectOp(s.example || s.exercise || '');
    const fallbacks: Record<string, string> = {
      '×': '4 × 5',
      '÷': '20 ÷ 4',
      '-': '50 - 17',
      '+': '23 + 45'
    };
    exampleExpression = fallbacks[opSymbol] || '23 + 45';
  }
  
  // Show interactive stepper only for pure arithmetic problems for young students
  const shouldShowInteractiveStepper = !isGuardian && userContext?.student_level && 
    isUnder11YearsOld(userContext.student_level) && exampleExpression &&
    isPureArithmeticProblem(s.exercise || '');
  
  // Ensure method text is never empty
  const methodText = s.method?.trim() || t('exercises.explanation.fallback.method');
  const hasCurrentExerciseSolution = Boolean(
    s.currentExercise &&
    s.currentExercise !== 'No solution provided' &&
    s.currentExercise !== t('exercises.explanation.fallback.no_solution')
  );

  return (
    <div className="space-y-3">
      {/* Problem card */}
      <div className="rounded-xl border bg-muted p-4">
        <div className="font-semibold">{t('exercises.explanation.headers.exercise')}</div>
        <div
          className={[
            "explain-text prose prose-neutral max-w-none",
            "mt-1 leading-relaxed break-words",
            "whitespace-pre-wrap",
            "!tracking-normal [letter-spacing:normal] [word-spacing:normal]",
            "text-muted-foreground",
          ].join(" ")}
          style={{
            whiteSpace: "pre-wrap",
            letterSpacing: "normal",
            wordSpacing: "normal",
          }}
        >
          {s.exercise
            ? toChildFriendlyExplanationText(resolveText(s.exercise))
            : t('exercises.explanation.fallback.no_exercise')}
        </div>
      </div>

      {/* Student View - Interactive Math Stepper (above Concept) */}
      {shouldShowInteractiveStepper && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="font-semibold mb-3">{t('exercises.explanation.headers.interactive_practice')}</div>
          <CompactMathStepper 
            expression={exampleExpression}
            className="text-sm"
          />
        </div>
      )}

      {/* Student View - Regular Explanation */}
      {!isGuardian && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          {orderedSteps ? (
            <ExplanationCards steps={orderedSteps} miniPracticeContext={miniPracticeContext} />
          ) : (
            <>
              <Section title={t('exercises.explanation.headers.concept')} text={s.concept} />
              <Section title={t('exercises.explanation.headers.method')} text={methodText} />
              <Section title={t('exercises.explanation.headers.example')} text={s.example} />
              <Section title={t('exercises.explanation.headers.pitfall')} text={s.pitfall} />
              <Section title={t('exercises.explanation.headers.check')} text={s.check} />
            </>
          )}
          
          {/* Watch Video link - only show if we have routing info */}
          {canShowLessonLink && (
            <div className="mt-4 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleViewLesson}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {t('exercises.explanation.watch_video')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guardian View - Concept + Parent Help + Detailed Solution */}
      {isGuardian && (
        <>
          {/* Top Card: Concept & Parent Guidance */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
            <Section title={t('exercises.explanation.headers.concept')} text={s.concept} />
            <Section title={t('exercises.explanation.headers.parent_help_hint')} text={s.parentHelpHint} />
            <Section title={t('exercises.explanation.headers.pitfall')} text={s.pitfall} />
          </div>
          
          {/* Bottom Card: Current Exercise Solution */}
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700 p-5 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📝</span>
              <h3 className="font-bold text-lg text-blue-800 dark:text-blue-200">
                {t('exercises.explanation.headers.current_exercise_solution')}
              </h3>
            </div>
            
            {hasCurrentExerciseSolution ? (
              <div className="prose prose-neutral max-w-none leading-relaxed break-words whitespace-pre-wrap text-base text-blue-900 dark:text-blue-100">
                {toChildFriendlyExplanationText(resolveText(s.currentExercise))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>{t('exercises.explanation.labels.exercise')}:</strong> {toChildFriendlyExplanationText(resolveText(s.exercise || t('exercises.explanation.fallback.no_exercise')))}
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3">
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    ✓ {t('exercises.explanation.headers.correct_answer')}
                  </div>
                  <div className="text-lg font-mono text-green-900 dark:text-green-100 mt-1">
                    {toChildFriendlyExplanationText(resolveText(s.correctAnswer || t('exercises.explanation.fallback.answer_not_available')))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
