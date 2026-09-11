import { useRef, useState } from 'react';
import type { Exercise } from '@/types/chat';
import type { ConceptMasteryState } from '@/types/mastery-v2';
import type { PrerequisiteRelationship } from '@/types/prerequisite';
import type { TutorProblemContext } from '@/types/tutor-learning';
import {
  createTutorProblemContext, processTutorAttempt, resumeTutorAfterRemediation,
  type ProcessTutorAttemptResult,
} from '@/services/tutorAdaptiveService';
import { PrerequisiteGraph } from '@/services/prerequisiteService';
import { trackLearningInteraction, type LearningInteractionEventType } from '@/services/learningAnalytics';
import { getAgeLearningConfig } from '@/config/ageConfig';

/** Optional trusted data boundary. No remote graph lookup or fabricated curriculum mapping. */
export interface TutorAdaptiveData {
  resolveProblemMetadata?: (exercise: Exercise) => {
    subjectId: string;
    conceptId?: string;
    conceptName?: string;
    objectiveId?: string;
  } | undefined;
  prerequisiteRelationships?: readonly PrerequisiteRelationship[];
  previousMastery?: readonly ConceptMasteryState[];
  prerequisiteExplanations?: Readonly<Record<string, { name: string; fr?: string; en?: string }>>;
}

interface Session {
  studentId?: string;
  contexts: Map<string, TutorProblemContext>;
  mastery: Map<string, ConceptMasteryState>;
  cooldown: Set<string>;
}
export interface TutorAdaptiveView {
  context: TutorProblemContext;
  result: ProcessTutorAttemptResult;
  phase: 'offered' | 'active' | 'resumed';
}

export function useTutorAdaptiveProblem(studentId?: string, gradeLevel?: string, data?: TutorAdaptiveData) {
  const session = useRef<Session>({ studentId, contexts: new Map(), mastery: new Map(), cooldown: new Set() });
  const [view, setView] = useState<TutorAdaptiveView | null>(null);
  // Account changes cannot inherit another student's evidence or unfinished detour.
  if (session.current.studentId !== studentId) {
    session.current = { studentId, contexts: new Map(), mastery: new Map(), cooldown: new Set() };
    setView(null);
  }
  const key = (subject: string, concept: string) => JSON.stringify([subject, concept]);
  const log = (eventType: LearningInteractionEventType, context: TutorProblemContext, completed?: boolean) => {
    trackLearningInteraction({
      eventType, studentId: context.studentId, subject: context.subjectId,
      concept: context.conceptId, questionId: context.problemId,
      attemptNumber: context.attemptCount, hintUsed: context.hintsUsedCount > 0,
      metadata: { source: 'tutor', status: context.status, completed },
    });
  };

  const recordEvaluated = (exercise: Exercise) => {
    // Only the chosen, confidently locally evaluated single-problem path supplies evidence.
    if (!studentId || exercise.gradingMethod !== 'local' || typeof exercise.isCorrect !== 'boolean') return;
    try {
      const state = session.current;
      const metadata = data?.resolveProblemMetadata?.(exercise);
      const subjectId = metadata?.subjectId || exercise.subjectId || '';
      const conceptId = (metadata?.conceptId || exercise.conceptId)?.trim();
      let context = state.contexts.get(exercise.id);
      if (context && exercise.attemptCount <= context.attemptCount) return;
      if (!context) {
        context = createTutorProblemContext({
          problemId: exercise.id, studentId, subjectId,
          // No concept/subject means ordinary Tutor only. A topic ID is not a concept ID.
          conceptId: subjectId ? conceptId : undefined,
          conceptName: metadata?.conceptName || exercise.conceptName,
          objectiveId: metadata?.objectiveId || exercise.objectiveId,
          originalPrompt: exercise.question, ageBand: getAgeLearningConfig(gradeLevel).band,
        });
      }
      const masteryMap = new Map<string, ConceptMasteryState>();
      for (const previous of data?.previousMastery || []) {
        if (previous.studentId === studentId && previous.subjectId === context.subjectId) {
          masteryMap.set(previous.conceptId, previous);
        }
      }
      for (const previous of state.mastery.values()) {
        if (previous.subjectId === context.subjectId) masteryMap.set(previous.conceptId, previous);
      }
      const relationships = data?.prerequisiteRelationships?.filter(r => r.subjectId === context.subjectId);
      const result = processTutorAttempt({
        input: {
          problemContext: { ...context, attemptCount: exercise.attemptCount - 1 },
          isCorrect: exercise.isCorrect, studentAnswer: exercise.userAnswer,
          // This path has no explicit instructional hint action; the canonical counter stays zero.
          hintsUsed: context.hintsUsedCount,
          stepId: exercise.attempts[exercise.attempts.length - 1]?.id,
        },
        graph: relationships?.length ? new PrerequisiteGraph(relationships) : undefined,
        masteryStateMap: masteryMap,
        remediationContext: {
          depth: 0, visitedConceptIds: [],
          cooldownConceptIds: relationships?.map(r => r.prerequisiteConceptId)
            .filter(id => state.cooldown.has(key(context.subjectId, id))),
        },
      });
      if (result.masteryUpdate) {
        const updated = result.masteryUpdate.state;
        state.mastery.set(key(updated.subjectId, updated.conceptId), updated);
      }
      const updatedContext = result.remediationUnit
        ? { ...result.updatedContext, status: 'in_progress' as const }
        : result.updatedContext;
      state.contexts.set(exercise.id, updatedContext);
      log('tutor_adaptive_attempt_processed', updatedContext);
      if (result.remediationUnit && result.returnContext) {
        setView({ context: updatedContext, result, phase: 'offered' });
        log('tutor_remediation_offered', updatedContext);
      } else {
        setView(null);
      }
    } catch (error) {
      // Grading/history must succeed independently of metadata, analytics or adaptation.
      console.warn('[TutorAdaptive] Continuing ordinary Tutor after adaptive failure', error);
    }
  };

  const start = () => {
    if (!view || view.context.studentId !== studentId) return;
    const context = { ...view.context, status: 'remediating' as const };
    session.current.contexts.set(context.problemId, context);
    setView({ ...view, context, phase: 'active' });
    log('tutor_remediation_started', context);
  };
  const resume = (completed: boolean): TutorProblemContext | undefined => {
    if (!view?.result.returnContext || view.context.studentId !== studentId) return;
    const context = resumeTutorAfterRemediation(view.result.returnContext, view.context);
    session.current.contexts.set(context.problemId, context);
    const prerequisite = view.result.remediationDecision?.targetConceptId;
    if (prerequisite) session.current.cooldown.add(key(context.subjectId, prerequisite));
    // Reading/exiting a descriptor is NOT a graded prerequisite attempt or mastery evidence.
    if (completed) log('tutor_remediation_completed', context, true);
    log('tutor_problem_resumed', context, completed);
    setView({ ...view, context, phase: 'resumed' });
    return context;
  };
  const reset = () => {
    session.current = { studentId, contexts: new Map(), mastery: new Map(), cooldown: new Set() };
    setView(null);
  };
  return {
    view: view?.context.studentId === studentId ? view : null,
    recordEvaluated, start, resume, reset,
    getSessionToken: () => session.current,
    isCurrentSession: (token: object) => token === session.current,
  };
}
