
import { useState } from 'react';
import { Exercise, Message } from '@/types/chat';
import { toast } from 'sonner';
import { useGrades } from './useGrades';
import { processNewExercise, linkMessageToExercise } from '@/utils/exerciseProcessor';

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { grade, updateGrades } = useGrades();
  const [processedContent, setProcessedContent] = useState<Set<string>>(new Set());
  
  // Group exercises by subject
  const exercisesBySubject = exercises.reduce((acc, exercise) => {
    const subjectId = exercise.subjectId || 'unclassified';
    if (!acc[subjectId]) {
      acc[subjectId] = [];
    }
    acc[subjectId].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const toggleExerciseExpansion = (id: string) => {
    setExercises(exercises.map(exercise => 
      exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
    ));
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

      setExercises(prev => [...prev, ...uniqueExercises]);
      uniqueExercises.forEach(ex => {
        const content = `${ex.question}:${ex.userAnswer}`;
        setProcessedContent(prev => new Set([...prev, content]));
      });

      updateGrades([...exercises, ...uniqueExercises]);
      console.log(`Added ${uniqueExercises.length} new exercises`);
    } catch (error) {
      console.error('Error adding exercises:', error);
      toast.error('Error adding exercises');
    }
  };

  const processHomeworkFromChat = async (message: string, subjectId?: string) => {
    const newExercise = await processNewExercise(message, exercises, processedContent, subjectId);
    
    if (newExercise) {
      setExercises(prev => [...prev, newExercise]);
      setProcessedContent(prev => new Set([...prev, message]));
      updateGrades([...exercises, newExercise]);
    }
  };

  const linkAIResponseToExercise = (userMessage: string, aiMessage: Message) => {
    const updatedExercises = linkMessageToExercise(exercises, userMessage, aiMessage);
    if (updatedExercises !== exercises) {
      setExercises(updatedExercises);
    }
  };

  const createExerciseFromAI = (question: string, explanation: string, subjectId?: string) => {
    const existingExercise = exercises.find(ex => ex.question === question);
    
    if (existingExercise) {
      console.log("This exercise already exists");
      return existingExercise;
    }

    const newEx: Exercise = {
      id: Date.now().toString(),
      question,
      userAnswer: "",
      explanation,
      subjectId,
      expanded: false,
      relatedMessages: [],
    };

    setExercises(prev => [...prev, newEx]);
    toast.info("A new exercise has been added.");
    return newEx;
  };

  const getExercisesBySubject = (subjectId?: string | null) => {
    if (!subjectId) {
      return exercises;
    }
    
    return exercisesBySubject[subjectId] || [];
  };

  return {
    exercises,
    exercisesBySubject,
    getExercisesBySubject,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat,
    linkAIResponseToExercise,
    addExercises
  };
};
