import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { GroupedRetryPractice, ProblemSubmission } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { useUserContext } from '@/hooks/useUserContext';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { extractExpressionFromText } from '@/utils/mathStepper/parser';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import { GeometryDiagram } from './GeometryDiagram';
import { toChildFriendlyExplanationText } from '@/features/explanations/childFriendlyText';
import { trackLearningInteraction } from '@/services/learningAnalytics';
import { HomeworkSmartLearningResourcesCard } from '@/components/learning/HomeworkSmartLearningResourcesCard';
import type { SafeHomeworkLearningRow } from '@/services/homeworkLearningResources';
import { KidExplanationFlow } from '@/components/kids/KidExplanationFlow';
import type { Step } from '@/features/explanations/types';
import { useHomeworkLearningResources } from '@/hooks/useHomeworkLearningResources';
import { supabase } from '@/integrations/supabase/client';

interface GroupedProblemExplanationModalProps {
  problem: ProblemSubmission | null;
  practice: GroupedRetryPractice | null;
  loading: boolean;
  error: string | null;
  rowId?: string;
  onClose: () => void;
  onRetry?: () => void;
  homeworkLearningRows?: SafeHomeworkLearningRow[];
  onLike?: () => void;
  onDislike?: () => void;
  feedback?: 'like' | 'dislike' | null;
  feedbackLoading?: boolean;
}

const selectedEvaluatedRows = (problem: ProblemSubmission, rowId?: string) =>
  problem.sections.flatMap(section => section.rows.filter(row =>
    row.selected && row.evaluation && (!rowId || row.id === rowId)
  ));

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
  if (conceptualKeywords.some(keyword => lower.includes(keyword))) return false;
  if (/\d{1,2}:\d{2}/.test(text)) return false;
  return /\d+\s*[+\-×÷*/]\s*\d+/.test(text);
};

const normalizeSubjectText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const flattenTextValues = (values: unknown[]): string => {
  const out: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value == null) return;
    out.push(String(value));
  };
  values.forEach(visit);
  return out.join(' ');
};

const hasMathEvidence = (values: unknown[]): boolean => {
  const text = normalizeSubjectText(flattenTextValues(values));
  const hasArithmeticExpression = /\d+(?:[,.]\d+)?\s*(?:[+\-×÷*/=]| x )\s*\d+(?:[,.]\d+)?/.test(text);
  const hasFraction = /\\frac|\b\d+\s*\/\s*\d+\b/.test(text);
  const hasMathKeyword = [
    'mathematiques', 'mathematics', 'maths', 'math', 'calcul', 'nombre',
    'operation', 'addition', 'soustraction', 'multiplication', 'division',
    'fraction', 'decimal', 'decimaux', 'geometrie', 'perimetre', 'aire',
    'proportionnalite', 'probabilite',
  ].some((keyword) => text.includes(keyword));

  return hasArithmeticExpression || hasFraction || hasMathKeyword;
};

const inferBroadSubjectSlug = (values: unknown[]): string => {
  const text = normalizeSubjectText(flattenTextValues(values));

  if (hasMathEvidence(values)) return 'mathematiques';

  const subjectChecks: Array<{ slug: string; keywords: string[] }> = [
    {
      slug: 'francais',
      keywords: [
        'francais', 'french', 'grammaire', 'conjugaison', 'orthographe',
        'lecture', 'vocabulaire', 'poesie', 'poeme', 'phrase', 'verbe',
        'sujet', 'adjectif', 'nom commun', 'dictée', 'dictee',
      ],
    },
    {
      slug: 'histoire',
      keywords: [
        'histoire', 'history', 'chronologie', 'siecle', 'revolution',
        'guerre', 'roi', 'empire', 'moyen age', 'antiquite',
        'prehistoire', 'napoleon', 'republique',
      ],
    },
    {
      slug: 'geographie',
      keywords: [
        'geographie', 'geography', 'carte', 'pays', 'ville', 'continent',
        'relief', 'climat', 'fleuve', 'ocean', 'mer', 'region',
        'capitale', 'territoire',
      ],
    },
    {
      slug: 'anglais',
      keywords: [
        'anglais', 'english', 'translate', 'traduire', 'vocabulary',
        'grammar', 'sentence', 'word', 'verb', 'adjective',
      ],
    },
    {
      slug: 'sciences',
      keywords: [
        'sciences', 'science', 'svt', 'physique', 'chimie', 'biologie',
        'energie', 'matiere', 'vivant', 'animal', 'plante', 'corps humain',
        'electricite', 'experience',
      ],
    },
    {
      slug: 'mathematiques',
      keywords: [
        'mathematiques', 'mathematics', 'maths', 'math', 'calcul',
        'nombre', 'operation', 'addition', 'soustraction', 'multiplication',
        'division', 'fraction', 'decimal', 'geometrie', 'angle', 'perimetre',
        'aire', 'proportionnalite', 'probabilite', '+', '-', '×', '÷', '=',
      ],
    },
  ];

  return subjectChecks.find(({ keywords }) =>
    keywords.some((keyword) => text.includes(keyword))
  )?.slug || 'mathematiques';
};

const subjectSlugToLearningSubject = (slug: string) => {
  switch (slug) {
    case 'francais':
      return 'french';
    case 'histoire':
      return 'history';
    case 'geographie':
      return 'geography';
    case 'anglais':
      return 'english';
    case 'sciences':
      return 'science';
    case 'mathematiques':
    default:
      return 'math';
  }
};

const buildKidSteps = (
  practice: GroupedRetryPractice,
  language: 'fr' | 'en'
): Step[] => {
  const isFr = language === 'fr';
  const steps: Step[] = [
    {
      kind: 'concept',
      icon: 'lightbulb',
      title: isFr ? "L'idée clé" : 'The big idea',
      body: practice.concept,
    },
  ];

  if (practice.learningStyleSupport) {
    steps.push({
      kind: 'strategy',
      icon: 'magnifier',
      title: practice.learningStyleSupport.title || (isFr ? 'Vois-le' : 'See it'),
      body: practice.learningStyleSupport.content,
    });
  } else {
    steps.push({
      kind: 'example',
      icon: 'magnifier',
      title: isFr ? 'Un exemple' : 'An example',
      body: practice.similarProblem,
    });
  }

  steps.push({
    kind: 'method',
    icon: 'divide',
    title: isFr ? 'La méthode' : 'The method',
    body: practice.method,
  });

  if (practice.commonMistake) {
    steps.push({
      kind: 'pitfall',
      icon: 'warning',
      title: isFr ? 'Attention' : 'Watch out',
      body: practice.commonMistake,
    });
  }

  steps.push({
    kind: 'check',
    icon: 'checklist',
    title: isFr ? 'Essaie maintenant' : 'Try now',
    body: practice.retryPrompt,
  });

  return steps;
};

const GroupedProblemExplanationModal = ({
  problem,
  practice,
  loading,
  error,
  rowId,
  onClose,
  onRetry,
  homeworkLearningRows = [],
  onLike,
  onDislike,
  feedback = null,
  feedbackLoading = false,
}: GroupedProblemExplanationModalProps) => {
  const ui = useInterfaceTranslation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { userContext } = useUserContext();
  const { activeLevel } = useActiveSchoolLevel();
  const [kidView, setKidView] = React.useState<'interactive' | 'lesson'>('interactive');
  const trackedOpenKeyRef = React.useRef<string | null>(null);
  const trackedSupportKeyRef = React.useRef<string | null>(null);

  const fallbackRows = problem ? selectedEvaluatedRows(problem, rowId) : [];
  const practiceExpression = practice?.similarProblem
    ? extractExpressionFromText(practice.similarProblem)
    : null;
  const shouldShowInteractiveStepper = !!(
    practice?.similarProblem &&
    practiceExpression &&
    activeLevel &&
    isUnder11YearsOld(activeLevel) &&
    isPureArithmeticProblem(practice.similarProblem)
  );
  const isKidMode = Boolean(activeLevel && isUnder11YearsOld(activeLevel));
  const kidSteps = React.useMemo(
    () => (practice && isKidMode ? buildKidSteps(practice, language === 'fr' ? 'fr' : 'en') : []),
    [practice, isKidMode, language]
  );
  const resourceRows = React.useMemo<SafeHomeworkLearningRow[]>(() => {
    if (homeworkLearningRows.length > 0) return homeworkLearningRows;
    if (!practice) return [];

    return [{
      prompt: practice.similarProblem,
      detectedConcept: practice.concept,
      gradingExplanation: practice.method,
    }];
  }, [homeworkLearningRows, practice]);
  const directSubjectEvidence = React.useMemo(() => [
    problem?.title,
    problem?.statement,
    problem?.instructions,
    problem?.sharedContext,
    problem?.rawText,
    problem?.extractedText,
    practice?.concept,
    practice?.similarProblem,
    practice?.method,
    practice?.retryPrompt,
    resourceRows.map(row => [
      row.label,
      row.prompt,
      row.rowKind,
      row.detectedConcept,
      row.gradingExplanation,
    ]),
  ], [practice, problem, resourceRows]);
  const detectedSubjectSlug = React.useMemo(
    () => inferBroadSubjectSlug(directSubjectEvidence),
    [directSubjectEvidence]
  );
  const hasDirectMathEvidence = React.useMemo(
    () => hasMathEvidence(directSubjectEvidence),
    [directSubjectEvidence]
  );
  const learningResourcesInput = React.useMemo(() => {
    if (!problem || resourceRows.length === 0) return null;

    return {
      rows: resourceRows,
      sourceId: problem.submissionId || problem.id,
      title: problem.title,
      subject: subjectSlugToLearningSubject(detectedSubjectSlug),
      gradeLevel: activeLevel || userContext?.student_level,
      country: userContext?.country,
      curriculum: userContext?.country ? `${userContext.country} curriculum` : undefined,
      responseLanguage: language,
      limit: 4,
    };
  }, [
    activeLevel,
    detectedSubjectSlug,
    language,
    problem,
    resourceRows,
    userContext?.country,
    userContext?.student_level,
  ]);
  const { data: learningResources } = useHomeworkLearningResources(learningResourcesInput);
  const targetedQuiz = React.useMemo(
    () => learningResources?.recommendations.find((recommendation) => recommendation.type === 'quiz') || null,
    [learningResources?.recommendations]
  );
  const targetedVideo = React.useMemo(
    () => learningResources?.recommendations.find((recommendation) => recommendation.type === 'video') || null,
    [learningResources?.recommendations]
  );
  const primarySkillMatch = learningResources?.skillMatches[0] || null;
  const matchedTopicId = targetedQuiz?.sourceId || targetedVideo?.sourceId || primarySkillMatch?.topicId || null;
  const { data: matchedTopicRoute } = useQuery({
    queryKey: ['homework-explanation-topic-route', matchedTopicId],
    queryFn: async (): Promise<{ subjectSlug: string; topicSlug: string } | null> => {
      if (!matchedTopicId) return null;

      const { data } = await (supabase as any)
        .from('topics')
        .select('slug, category:learning_categories!inner(subject:subjects!inner(slug))')
        .eq('id', matchedTopicId)
        .maybeSingle();

      const category = Array.isArray(data?.category) ? data.category[0] : data?.category;
      const subject = Array.isArray(category?.subject) ? category.subject[0] : category?.subject;

      if (!data?.slug || !subject?.slug) return null;
      return {
        subjectSlug: subject.slug,
        topicSlug: data.slug,
      };
    },
    enabled: Boolean(matchedTopicId),
    staleTime: 10 * 60 * 1000,
  });
  const matchedTopicRouteForDetectedSubject = React.useMemo(() => {
    if (!matchedTopicRoute) return null;
    if (hasDirectMathEvidence && matchedTopicRoute.subjectSlug !== 'mathematiques') return null;
    return matchedTopicRoute;
  }, [hasDirectMathEvidence, matchedTopicRoute]);
  const fallbackSubjectSlug = React.useMemo(() => inferBroadSubjectSlug([
    detectedSubjectSlug,
    directSubjectEvidence,
    primarySkillMatch?.subject,
    primarySkillMatch?.domain,
    primarySkillMatch?.subdomain,
    primarySkillMatch?.topic,
    primarySkillMatch?.studentFriendlyLabel,
    primarySkillMatch?.keywords,
    targetedQuiz?.title,
    targetedQuiz?.description,
    targetedQuiz?.keywords,
    targetedVideo?.title,
    targetedVideo?.description,
    targetedVideo?.keywords,
    problem?.title,
    problem?.statement,
    problem?.instructions,
    problem?.sharedContext,
    problem?.rawText,
    problem?.extractedText,
    practice?.concept,
    practice?.similarProblem,
    practice?.method,
    practice?.retryPrompt,
    resourceRows.map(row => [
      row.label,
      row.prompt,
      row.rowKind,
      row.detectedConcept,
      row.gradingExplanation,
    ]),
  ]), [
    detectedSubjectSlug,
    directSubjectEvidence,
    practice,
    primarySkillMatch,
    problem,
    resourceRows,
    targetedQuiz,
    targetedVideo,
  ]);
  const targetedPracticeRoute = React.useMemo(() => {
    const subjectSlug = matchedTopicRouteForDetectedSubject?.subjectSlug || fallbackSubjectSlug;

    if (targetedQuiz && matchedTopicRouteForDetectedSubject) {
      return `/practice/${encodeURIComponent(subjectSlug)}/topics?quiz=${encodeURIComponent(targetedQuiz.id)}`;
    }

    return matchedTopicRouteForDetectedSubject
      ? `/practice/${encodeURIComponent(subjectSlug)}/topics`
      : `/practice/${encodeURIComponent(subjectSlug)}`;
  }, [fallbackSubjectSlug, matchedTopicRouteForDetectedSubject, targetedQuiz]);

  const targetedLessonRoute = React.useMemo(() => {
    if (targetedVideo && matchedTopicRouteForDetectedSubject) {
      return `/learning/video/${encodeURIComponent(targetedVideo.id)}`;
    }

    if (matchedTopicRouteForDetectedSubject) {
      return `/learning/${encodeURIComponent(matchedTopicRouteForDetectedSubject.subjectSlug)}/${encodeURIComponent(matchedTopicRouteForDetectedSubject.topicSlug)}`;
    }

    return `/learning/${encodeURIComponent(fallbackSubjectSlug)}`;
  }, [fallbackSubjectSlug, matchedTopicRouteForDetectedSubject, targetedVideo]);

  const handleTargetedPractice = React.useCallback(() => {
    onClose();
    navigate(targetedPracticeRoute);
  }, [navigate, onClose, targetedPracticeRoute]);

  const handleTargetedLesson = React.useCallback(() => {
    onClose();
    navigate(targetedLessonRoute);
  }, [navigate, onClose, targetedLessonRoute]);

  React.useEffect(() => {
    setKidView('interactive');
  }, [problem?.id, practice?.similarProblem, rowId]);

  React.useEffect(() => {
    if (!problem || !practice) return;
    const key = `${problem.submissionId || problem.id}:${rowId || 'selected'}`;
    if (trackedOpenKeyRef.current === key) return;
    trackedOpenKeyRef.current = key;

    trackLearningInteraction({
      eventType: 'grouped_retry_opened',
      learningStyleUsed: userContext?.learning_style,
      supportType: practice.learningStyleSupport?.style || userContext?.learning_style,
      subject: 'Math',
      concept: practice.concept,
      metadata: {
        problemType: problem.type,
        hasLearningStyleSupport: Boolean(practice.learningStyleSupport),
      },
    });
  }, [practice, problem, rowId, userContext?.learning_style]);

  React.useEffect(() => {
    if (!problem || !practice?.learningStyleSupport) return;
    const key = `${problem.submissionId || problem.id}:${rowId || 'selected'}:${practice.learningStyleSupport.title}`;
    if (trackedSupportKeyRef.current === key) return;
    trackedSupportKeyRef.current = key;

    trackLearningInteraction({
      eventType: 'grouped_learning_style_support_viewed',
      learningStyleUsed: practice.learningStyleSupport.style,
      supportType: practice.learningStyleSupport.style,
      subject: 'Math',
      concept: practice.concept,
      metadata: {
        supportTitle: practice.learningStyleSupport.title,
        problemType: problem.type,
      },
    });
  }, [practice?.learningStyleSupport, practice?.concept, problem, rowId]);

  if (!problem) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-lg h-[85dvh] max-h-[85dvh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h3 className="font-semibold text-base text-foreground sm:text-lg">
            {language === 'fr' ? 'Explication' : ui("Explanation")}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" aria-label={ui("Close")}>
            <X size={16} />
          </Button>
        </div>

        <div className={`flex-1 min-h-0 p-4 space-y-3 ${isKidMode && kidView === 'lesson' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {loading && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              {language === 'fr'
                ? 'Préparation de l’explication avec un exemple différent...'
                : 'Preparing an explanation with a different example...'}
            </div>
          )}

          {!loading && practice && (
            <>
              {isKidMode ? (
                kidView === 'interactive' ? (
                  <div className="space-y-3">
                    <section className="rounded-lg border bg-muted/40 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        {language === 'fr' ? ui("Exercice") : ui("Exercise")}
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {toChildFriendlyExplanationText(practice.similarProblem)}
                      </p>
                    </section>

                    <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <h4 className="text-sm font-semibold text-blue-950 mb-3">
                        {language === 'fr' ? 'Entraînement interactif' : 'Interactive practice'}
                      </h4>
                      {practice.diagram && (
                        <div className="mb-3">
                          <GeometryDiagram diagram={practice.diagram} />
                        </div>
                      )}
                      {shouldShowInteractiveStepper ? (
                        <CompactMathStepper expression={practiceExpression} className="text-sm" />
                      ) : (
                        <p className="text-sm text-blue-950 whitespace-pre-wrap">
                          {toChildFriendlyExplanationText(practice.retryPrompt)}
                        </p>
                      )}
                    </section>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        className="rounded-xl px-5"
                        onClick={() => setKidView('lesson')}
                      >
                        {language === 'fr' ? 'Voir la leçon →' : 'See the lesson →'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <section className="min-h-0 flex-1 overflow-hidden">
                      <KidExplanationFlow
                        steps={kidSteps}
                        onPracticeMore={handleTargetedPractice}
                        onViewLesson={handleTargetedLesson}
                        practiceHref={targetedPracticeRoute}
                        lessonHref={targetedLessonRoute}
                        canViewLesson={true}
                      />
                    </section>
                  </div>
                )
              ) : (
                <>
                  <section className="rounded-lg border bg-muted/40 p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {language === 'fr' ? 'Idée à travailler' : 'Concept to practice'}
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {practice.concept}
                    </p>
                  </section>

                  {practice.learningStyleSupport && (
                    <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                      <h4 className="text-sm font-semibold text-indigo-950 mb-2">
                        {practice.learningStyleSupport.title}
                      </h4>
                      {practice.diagram && (
                        <div className="mb-3">
                          <GeometryDiagram diagram={practice.diagram} />
                        </div>
                      )}
                      <p className="text-sm text-indigo-950 whitespace-pre-wrap">
                        {practice.learningStyleSupport.content}
                      </p>
                      {shouldShowInteractiveStepper && (
                        <div className="mt-4 rounded-lg border border-indigo-100 bg-white/70 p-3">
                          <h5 className="text-sm font-semibold text-indigo-950 mb-3">
                            {language === 'fr' ? 'Pratique interactive' : 'Interactive practice'}
                          </h5>
                          <CompactMathStepper expression={practiceExpression} className="text-sm" />
                        </div>
                      )}
                    </section>
                  )}

                  {!practice.learningStyleSupport && (
                    <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <h4 className="text-sm font-semibold text-blue-950 mb-2">
                        {language === 'fr' ? 'Exemple similaire' : 'Similar problem'}
                      </h4>
                      {practice.diagram && (
                        <div className="mb-3">
                          <GeometryDiagram diagram={practice.diagram} />
                        </div>
                      )}
                      <p className="text-sm text-blue-950 whitespace-pre-wrap">
                        {practice.similarProblem}
                      </p>
                      {shouldShowInteractiveStepper && (
                        <div className="mt-4 rounded-lg border border-blue-100 bg-white/70 p-3">
                          <h5 className="text-sm font-semibold text-blue-950 mb-3">
                            {language === 'fr' ? 'Pratique interactive' : 'Interactive practice'}
                          </h5>
                          <CompactMathStepper expression={practiceExpression} className="text-sm" />
                        </div>
                      )}
                    </section>
                  )}

                  <section className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <h4 className="text-sm font-semibold text-green-950 mb-2">
                      {language === 'fr' ? ui("Auto-vérification") : 'Self-check'}
                    </h4>
                    <p className="text-sm text-green-950 whitespace-pre-wrap">
                      {practice.retryPrompt}
                    </p>
                  </section>

                  <section className="rounded-lg border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {language === 'fr' ? 'Méthode' : ui("Method")}
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {practice.method}
                    </p>
                  </section>

                  {practice.commonMistake && (
                    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <h4 className="text-sm font-semibold text-amber-950 mb-2">
                        {language === 'fr' ? 'Attention' : 'Watch out'}
                      </h4>
                      <p className="text-sm text-amber-950 whitespace-pre-wrap">
                        {practice.commonMistake}
                      </p>
                    </section>
                  )}

                  {practice.parentHelpHint && (
                    <section className="rounded-lg border bg-muted/40 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        {language === 'fr' ? 'Conseil pour les parents' : 'Parent help hint'}
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {practice.parentHelpHint}
                      </p>
                    </section>
                  )}
                </>
              )}

              {!isKidMode && (onLike || onDislike) && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={feedback === 'like' ? 'default' : 'outline'}
                    size="sm"
                    disabled={feedbackLoading}
                    onClick={onLike}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {language === 'fr' ? 'J’aime' : 'Like'}
                  </Button>
                  <Button
                    type="button"
                    variant={feedback === 'dislike' ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={feedbackLoading}
                    onClick={onDislike}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    {language === 'fr' ? 'Je n’aime pas' : 'Dislike'}
                  </Button>
                </div>
              )}

              {!isKidMode && homeworkLearningRows.length > 0 && (
                <HomeworkSmartLearningResourcesCard
                  rows={homeworkLearningRows}
                  sourceId={problem.submissionId || problem.id}
                  title={problem.title}
                  onPracticeClick={onRetry}
                />
              )}
            </>
          )}

          {!loading && error && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {language === 'fr'
                      ? 'L’explication n’a pas pu être générée.'
                      : 'The explanation could not be generated.'}
                  </p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>

              {onRetry && (
                <Button type="button" onClick={onRetry} className="w-full">
                  {language === 'fr' ? 'Réessayer de générer l’explication' : 'Try generating the explanation again'}
                </Button>
              )}

              {fallbackRows.length > 0 && (
                <section className="rounded-lg border bg-muted/40 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    {language === 'fr' ? 'Correction déjà disponible' : 'Available correction'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr'
                      ? 'La correction exacte reste visible sur la carte. Cet encadré est seulement un secours si l’explication échoue.'
                      : 'The exact correction remains visible on the card. This section is only a fallback if the explanation fails.'}
                  </p>
                  {fallbackRows.map(row => (
                    <div key={row.id} className="rounded-md border bg-card p-3 text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.label}</Badge>
                        <span className="font-medium">
                          {language === 'fr' ? 'Affirmation sélectionnée' : 'Selected assertion'}
                        </span>
                      </div>
                      {row.evaluation?.feedback && (
                        <p className="text-muted-foreground whitespace-pre-wrap">{row.evaluation.feedback}</p>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {homeworkLearningRows.length > 0 && (
                <HomeworkSmartLearningResourcesCard
                  rows={homeworkLearningRows}
                  sourceId={problem.submissionId || problem.id}
                  title={problem.title}
                  onPracticeClick={onRetry}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupedProblemExplanationModal;
