
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
  }, [exercises, updateGrades]);

  const toggleExerciseExpansion = (id: string) => {
    setExercises(prev =>
      prev.map(exercise =>
        exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
      )
    );
  };

  const addExercises = async (newExercises: Exercise[]) => {
    try {
      const uniqueExercises = newExercises.filter(newEx =>
        !exercises.some(
          ex => ex.question === newEx.question && ex.userAnswer === newEx.userAnswer
        )
      );

      if (uniqueExercises.length === 0) {
        console.log("No new unique exercises to add");
        return;
      }
      // Always add exercises, then recalculate grades
      setExercises(prev => {
        const newList = [...prev, ...uniqueExercises];
        uniqueExercises.forEach(ex => {
          const content = `${ex.question}:${ex.userAnswer}`;
          setProcessedContent(old => new Set([...old, content]));
        });
        // grades will be updated by useEffect above
        return newList;
      });

      console.log(`[useExercises] Added ${uniqueExercises.length} new exercises`);
    } catch (error) {
      console.error('Error adding exercises:', error);
      toast.error('Error adding exercises');
    }
  };

  const processHomeworkFromChat = async (message: string) => {
    const newExercise = await processNewExercise(message, exercises, processedContent);
    if (newExercise) {
      setExercises(prev => {
        const updated = [...prev, newExercise];
        console.log('[useExercises] New exercise added by chat:', newExercise);
        return updated;
      });
      setProcessedContent(prev => new Set([...prev, message]));
      // updateGrades will be called in useEffect
    }
  };

  const linkAIResponseToExercise = (userMessage: string, aiMessage: Message) => {
    const updatedExercises = linkMessageToExercise(exercises, userMessage, aiMessage);
    if (updatedExercises !== exercises) {
      setExercises(updatedExercises);
    }
  };

  const createExerciseFromAI = (question: string, explanation: string) => {
    const existingExercise = exercises.find(ex => ex.question === question);
    if (existingExercise) {
      console.log("[useExercises] This exercise already exists");
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
      return newList;
    });
    toast.info("A new exercise has been added.");
    return newEx;
  };

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
