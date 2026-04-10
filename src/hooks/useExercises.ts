
import { useState, useEffect } from 'react';
import { Exercise, Message } from '@/types/chat';
import { toast } from 'sonner';
import { useGrades } from './useGrades';
import { useExerciseHistory } from './useExerciseHistory';
import { useLanguage } from '@/context/LanguageContext';
import { processNewExercise, linkMessageToExercise, processMultipleExercises } from '@/utils/exerciseProcessor';
import { hasMultipleExercises } from '@/utils/homework/multiExerciseParser';
import { evaluateHomework } from '@/services/homeworkGrading';
import { fetchExplanation as fetchExplanationFromAI } from '@/services/explanationService';
import { useAdmin } from '@/context/AdminContext';

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { grade, updateGrades } = useGrades();
  const { saveExerciseToHistory } = useExerciseHistory();
  const { language } = useLanguage();
  const { selectedModelId } = useAdmin();
  const [processedContent, setProcessedContent] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[useExercises] exercises updated. Current exercises:', exercises);
    updateGrades(exercises);
    // Note: grade state will be updated asynchronously, so the log below shows stale state
  }, [exercises, updateGrades]);

  // Separate useEffect to track grade changes (shows current state)
  useEffect(() => {
    console.log('[useExercises] Grade state updated:', grade);
  }, [grade]);

  const toggleExerciseExpansion = (id: string) => {
    console.log(`[useExercises] Toggling expansion for exercise id: ${id}`);
    setExercises(prev =>
      prev.map(exercise =>
        exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
      )
    );
  };

  const submitAnswer = async (exerciseId: string, answer: string) => {
    console.log(`[useExercises] Submitting answer for exercise ${exerciseId}:`, answer);
    
    try {
      const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseId);
      if (exerciseIndex === -1) {
        throw new Error('Exercise not found');
      }

      const exercise = exercises[exerciseIndex];
      
      // Create new attempt
      const attemptNumber = exercise.attemptCount + 1;
      const newAttempt = {
        id: `${exerciseId}-attempt-${attemptNumber}`,
        answer,
        timestamp: new Date(),
        attemptNumber,
      };

      // Update exercise with new answer
      const updatedExercise: Exercise = {
        ...exercise,
        userAnswer: answer,
        attemptCount: attemptNumber,
        attempts: [...exercise.attempts, newAttempt],
        lastAttemptDate: new Date(),
        needsRetry: false,
      };

      console.log('[useExercises] About to call evaluateHomework with:', {
        exerciseId,
        question: updatedExercise.question,
        userAnswer: updatedExercise.userAnswer,
        attemptNumber,
        language,
        selectedModelId
      });
      
      // Grade the exercise
      const gradedExercise = await evaluateHomework(updatedExercise, attemptNumber, language, selectedModelId);
      
      console.log('[useExercises] evaluateHomework returned:', {
        exerciseId: gradedExercise.id,
        isCorrect: gradedExercise.isCorrect,
        explanation: gradedExercise.explanation?.substring(0, 100)
      });
      
      // Save to exercise history
      await saveExerciseToHistory(
        gradedExercise.question,
        answer,
        gradedExercise.isCorrect,
        gradedExercise.subjectId
      );
      
      // Update exercises state
      setExercises(prev => 
        prev.map(ex => ex.id === exerciseId ? gradedExercise : ex)
      );

      console.log('[useExercises] Answer submitted and graded successfully:', {
        exerciseId: gradedExercise.id,
        isCorrect: gradedExercise.isCorrect
      });
    } catch (error) {
      console.error('[useExercises] Error submitting answer:', error);
      console.error('[useExercises] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        exerciseId
      });
      throw error;
    }
  };

  const addExercises = async (newExercises: Exercise[]) => {
    try {
      console.log('[useExercises] addExercises called with:', newExercises);
      const uniqueExercises = newExercises.filter(newEx =>
        !exercises.some(
          ex => ex.question === newEx.question && ex.userAnswer === newEx.userAnswer
        )
      );

      if (uniqueExercises.length === 0) {
        console.log("[useExercises] No new unique exercises to add");
        return;
      }
      setExercises(prev => {
        const newList = [...prev, ...uniqueExercises];
        uniqueExercises.forEach(ex => {
          const content = `${ex.question}:${ex.userAnswer}`;
          setProcessedContent(old => new Set([...old, content]));
          console.log(`[useExercises] Marked as processed content: ${content}`);
        });
        console.log(`[useExercises] Added ${uniqueExercises.length} new exercises. Updated list:`, newList);
        return newList;
      });
    } catch (error) {
      console.error('[useExercises] Error adding exercises:', error);
      toast.error('Error adding exercises');
    }
  };

  const processHomeworkFromChat = async (message: string): Promise<{ localGraded: boolean; isCorrect: boolean }> => {
    console.log('[useExercises] Processing homework from chat message:', message);
    
    let localGraded = false;
    let isCorrect = false;
    
    // Check if the message contains multiple exercises
    if (hasMultipleExercises(message)) {
      console.log('[useExercises] Detected multiple exercises in message');
      const newExercises = await processMultipleExercises(message, exercises, processedContent, language, selectedModelId);
      
      if (newExercises.length > 0) {
        setExercises(prev => {
          const updated = [...prev, ...newExercises];
          console.log(`[useExercises] Added ${newExercises.length} exercises from multi-exercise message:`, updated);
          return updated;
        });
        setProcessedContent(prev => new Set([...prev, message]));
        
        localGraded = newExercises.some(ex => ex.gradingMethod === 'local');
        isCorrect = newExercises.every(ex => ex.isCorrect === true);
        
        if (newExercises.length > 1) {
          toast.info(`Found ${newExercises.length} exercises in your message`);
        }
      }
    } else {
      const result = await processNewExercise(message, exercises, processedContent, language, selectedModelId);
      if (result) {
        const { exercise, isUpdate } = result;
        
        localGraded = exercise.gradingMethod === 'local';
        isCorrect = exercise.isCorrect === true;
        
        setExercises(prev => {
          if (isUpdate) {
            const updated = prev.map(ex => ex.id === exercise.id ? exercise : ex);
            console.log('[useExercises] Exercise updated:', exercise);
            return updated;
          } else {
            const updated = [...prev, exercise];
            console.log('[useExercises] New exercise added by chat:', exercise);
            return updated;
          }
        });
        setProcessedContent(prev => new Set([...prev, message]));
      }
    }
    
    return { localGraded, isCorrect };
  };

  const linkAIResponseToExercise = (userMessage: string, aiMessage: Message) => {
    console.log('[useExercises] Linking AI response to exercise. User message:', userMessage, 'AI message:', aiMessage);
    const updatedExercises = linkMessageToExercise(exercises, userMessage, aiMessage);
    if (updatedExercises !== exercises) {
      setExercises(updatedExercises);
      console.log('[useExercises] Linked response, updated exercises:', updatedExercises);
    }
  };

  const createExerciseFromAI = (question: string, explanation: string) => {
    const existingExercise = exercises.find(ex => ex.question === question);
    if (existingExercise) {
      console.log("[useExercises] This exercise already exists", existingExercise);
      return existingExercise;
    }
    const newEx: Exercise = {
      id: Date.now().toString(),
      question,
      userAnswer: "",
      explanation,
      expanded: false,
      relatedMessages: [],
      attemptCount: 0,
      attempts: [],
      lastAttemptDate: new Date(),
      needsRetry: false,
    };

    setExercises(prev => {
      const newList = [...prev, newEx];
      console.log('[useExercises] Exercise created from AI:', newEx, newList);
      return newList;
    });
    toast.info("A new exercise has been added.");
    return newEx;
  };

  const clearExercises = () => {
    setExercises([]);
    setProcessedContent(new Set());
    toast.success("All exercises have been cleared.");
  };

  const fetchExplanation = async (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise || exercise.explanation) return; // Already loaded

    // Set loading state
    setExercises(prev =>
      prev.map(ex => ex.id === exerciseId ? { ...ex, explanationLoading: true } : ex)
    );

    try {
      const explanation = await fetchExplanationFromAI(
        exerciseId,
        exercise.question,
        exercise.userAnswer,
        !!exercise.isCorrect,
        exercise.correctAnswer,
        language,
        selectedModelId,
        exercise.attemptCount
      );

      setExercises(prev =>
        prev.map(ex =>
          ex.id === exerciseId
            ? { ...ex, explanation, explanationLoading: false, explanationRequested: true }
            : ex
        )
      );
    } catch (error) {
      console.error('[useExercises] Error fetching explanation:', error);
      setExercises(prev =>
        prev.map(ex => ex.id === exerciseId ? { ...ex, explanationLoading: false } : ex)
      );
      toast.error('Failed to load explanation');
    }
  };

  useEffect(() => {
    console.log('[useExercises] Current overall grade state after grade update:', grade);
  }, [grade]);

  return {
    exercises,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat,
    linkAIResponseToExercise,
    addExercises,
    submitAnswer,
    clearExercises,
    fetchExplanation
  };
};
