import { useState, useEffect } from 'react';
import { Exercise, Message } from '@/types/chat';
import { toast } from 'sonner';
import { useGrades } from './useGrades';
import { processNewExercise, linkMessageToExercise, processMultipleExercises } from '@/utils/exerciseProcessor';
import { hasMultipleExercises } from '@/utils/homework/multiExerciseParser';

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { grade, updateGrades } = useGrades();
  const [processedContent, setProcessedContent] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[useExercises] exercises updated. Current exercises:', exercises);
    updateGrades(exercises);
    console.log('[useExercises] Called updateGrades. Current grade after update:', grade);
  }, [exercises, updateGrades]);

  const toggleExerciseExpansion = (id: string) => {
    console.log(`[useExercises] Toggling expansion for exercise id: ${id}`);
    setExercises(prev =>
      prev.map(exercise =>
        exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
      )
    );
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

  const processHomeworkFromChat = async (message: string) => {
    console.log('[useExercises] Processing homework from chat message:', message);
    
    // Check if the message contains multiple exercises
    if (hasMultipleExercises(message)) {
      console.log('[useExercises] Detected multiple exercises in message');
      const newExercises = await processMultipleExercises(message, exercises, processedContent);
      
      if (newExercises.length > 0) {
        setExercises(prev => {
          const updated = [...prev, ...newExercises];
          console.log(`[useExercises] Added ${newExercises.length} exercises from multi-exercise message:`, updated);
          return updated;
        });
        setProcessedContent(prev => new Set([...prev, message]));
        console.log('[useExercises] Multi-exercise message marked as processed:', message);
        
        // Show feedback to user
        if (newExercises.length > 1) {
          toast.info(`Found ${newExercises.length} exercises in your message`);
        }
      }
    } else {
      // Process single exercise
      const result = await processNewExercise(message, exercises, processedContent);
      if (result) {
        const { exercise, isUpdate } = result;
        setExercises(prev => {
          if (isUpdate) {
            // Update existing exercise
            const updated = prev.map(ex => ex.id === exercise.id ? exercise : ex);
            console.log('[useExercises] Exercise updated:', exercise, 'Updated exercises:', updated);
            return updated;
          } else {
            // Add new exercise
            const updated = [...prev, exercise];
            console.log('[useExercises] New exercise added by chat:', exercise, 'Updated exercises:', updated);
            return updated;
          }
        });
        setProcessedContent(prev => new Set([...prev, message]));
        console.log('[useExercises] Message marked as processed:', message);
      }
    }
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
    addExercises
  };
};
