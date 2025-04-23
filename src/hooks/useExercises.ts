
import { useState, useEffect } from 'react';
import { Exercise, Message } from '@/types/chat';
import { toast } from 'sonner';
import { useGrades } from './useGrades';
import { processNewExercise, linkMessageToExercise } from '@/utils/exerciseProcessor';

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { grade, updateGrades } = useGrades();
  const [processedContent, setProcessedContent] = useState<Set<string>>(new Set());

  // Always re-calculate grades when exercises change
  useEffect(() => {
    console.log('[useExercises] exercises updated:', exercises);
    updateGrades(exercises);
    console.log('[useExercises] grade after updateGrades:', grade);
  }, [exercises, updateGrades]);

  const toggleExerciseExpansion = (id: string) => {
    setExercises(prev =>
      prev.map(exercise =>
        exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
      )
    );
    console.log('[useExercises] toggled expansion for:', id);
  };

  const addExercises = async (newExercises: Exercise[]) => {
    try {
      const uniqueExercises = newExercises.filter(newEx =>
        !exercises.some(
          ex => ex.question === newEx.question && ex.userAnswer === newEx.userAnswer
        )
      );

      if (uniqueExercises.length === 0) {
        console.log("[useExercises] No new unique exercises to add");
        return;
      }
      // Always add exercises, then recalculate grades
      setExercises(prev => {
        const newList = [...prev, ...uniqueExercises];
        uniqueExercises.forEach(ex => {
          const content = `${ex.question}:${ex.userAnswer}`;
          setProcessedContent(old => new Set([...old, content]));
        });
        console.log(`[useExercises] Added ${uniqueExercises.length} new exercises`, newList);
        return newList;
      });
    } catch (error) {
      console.error('[useExercises] Error adding exercises:', error);
      toast.error('Error adding exercises');
    }
  };

  const processHomeworkFromChat = async (message: string) => {
    console.log('[useExercises] Processing homework from chat message:', message);
    const newExercise = await processNewExercise(message, exercises, processedContent);
    if (newExercise) {
      setExercises(prev => {
        const updated = [...prev, newExercise];
        console.log('[useExercises] New exercise added by chat:', newExercise, updated);
        return updated;
      });
      setProcessedContent(prev => new Set([...prev, message]));
    }
  };

  const linkAIResponseToExercise = (userMessage: string, aiMessage: Message) => {
    console.log('[useExercises] Linking AI response to exercise for user message:', userMessage, aiMessage);
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
    };

    setExercises(prev => {
      const newList = [...prev, newEx];
      console.log('[useExercises] Exercise created from AI:', newEx, newList);
      return newList;
    });
    toast.info("A new exercise has been added.");
    return newEx;
  };

  useEffect(() => {
    // Debug log for grade on every grade update (from useGrades)
    console.log('[useExercises] Current overall grade state:', grade);
  }, [grade]);

  return {
    exercises,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat,
    linkAIResponseToExercise,
    addExercises
  };
};
