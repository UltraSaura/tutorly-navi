
import { useState, useEffect, useCallback } from 'react';
import { Exercise, Grade } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { extractHomeworkFromMessage } from '@/utils/homeworkExtraction';
import { evaluateHomework } from '@/services/homeworkGrading';
import { calculateGrade } from '@/utils/gradeCalculation';

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { toast: uiToast } = useToast();
  
  const [grade, setGrade] = useState<Grade>({
    percentage: 0,
    letter: 'N/A',
  });
  
  // Track processed content to avoid duplicates
  const [processedContent, setProcessedContent] = useState<Set<string>>(new Set());
  
  // Track exercises being evaluated
  const [pendingEvaluations, setPendingEvaluations] = useState<Set<string>>(new Set());
  
  const toggleExerciseExpansion = useCallback((id: string) => {
    console.log("toggleExerciseExpansion called for:", id);
    
    setExercises(prevExercises => {
      // Create a new array to ensure state update
      const updatedExercises = prevExercises.map(exercise => {
        if (exercise.id === id) {
          console.log(`Toggling exercise ${id} from`, exercise.expanded, "to", !exercise.expanded);
          return { ...exercise, expanded: !exercise.expanded };
        }
        return exercise;
      });
      
      return updatedExercises;
    });
  }, []);
  
  // Update grades when exercises change
  useEffect(() => {
    updateGrades();
  }, [exercises]);
  
  // Function to process homework submitted directly via chat
  const processHomeworkFromChat = useCallback(async (message: string) => {
    try {
      // Check if we've processed this exact content before
      if (processedContent.has(message)) {
        console.log("Skipping duplicate homework submission");
        return;
      }
      
      // Extract the exercise question and user's answer
      const { question, answer } = extractHomeworkFromMessage(message);
      
      if (!question || !answer) {
        console.log("Couldn't extract homework components from the message");
        return;
      }
      
      // Check if we already have this question-answer pair
      const existingExercise = exercises.find(
        ex => ex.question === question && ex.userAnswer === answer
      );
      
      if (existingExercise) {
        console.log("This question-answer pair already exists");
        return;
      }
      
      // Create a new exercise ID
      const newExerciseId = Date.now().toString();
      
      // First, create a new exercise with initial expanded state
      // We'll set expanded to true initially so users can see the explanation right away
      const newEx: Exercise = {
        id: newExerciseId,
        question,
        userAnswer: answer,
        expanded: true, // Default to expanded when first created
      };
      
      // Add it to the list
      setExercises(prev => [...prev, newEx]);
      
      // Mark this content as processed
      setProcessedContent(prev => new Set([...prev, message]));
      
      // Mark this exercise as pending evaluation
      setPendingEvaluations(prev => new Set([...prev, newExerciseId]));
      
      console.log("Created new exercise, ID:", newExerciseId);
      
      // Now evaluate the answer
      const updatedExercise = await evaluateHomework(newEx);
      
      console.log("Exercise evaluated:");
      console.log("- Has explanation:", !!updatedExercise.explanation);
      console.log("- Explanation length:", updatedExercise.explanation?.length || 0);
      console.log("- Is correct:", updatedExercise.isCorrect);
      
      // Update the exercise with the evaluated answer, but keep the existing expanded state
      // This is the key fix - we don't force expanded: true when updating after evaluation
      setExercises(prev => prev.map(ex => 
        ex.id === newExerciseId ? { 
          ...updatedExercise,
          // Keep expanded state as is, don't force it to be true
          expanded: ex.expanded 
        } : ex
      ));
      
      // Remove from pending evaluations
      setPendingEvaluations(prev => {
        const newSet = new Set(prev);
        newSet.delete(newExerciseId);
        return newSet;
      });
      
    } catch (error) {
      console.error('Error processing homework:', error);
      toast.error('There was an issue grading your homework. Please try again.');
    }
  }, [exercises, processedContent]);
  
  // Function to create exercises from AI responses - used when needed
  const createExerciseFromAI = useCallback((question: string, explanation: string) => {
    // Check if we already have this question
    const existingExercise = exercises.find(ex => ex.question === question);
    
    if (existingExercise) {
      console.log("This exercise already exists");
      return existingExercise;
    }
    
    // Create a new exercise with default expanded state
    const newEx: Exercise = {
      id: Date.now().toString(),
      question,
      explanation,
      expanded: true, // Default to expanded to show explanation initially
    };
    
    // Add to the exercises list
    setExercises(prev => [...prev, newEx]);
    
    toast.info("A new exercise has been added.");
    
    return newEx;
  }, [exercises]);
  
  const updateGrades = useCallback(() => {
    const newGrade = calculateGrade(exercises);
    setGrade(newGrade);
  }, [exercises]);
  
  // Log exercises state changes for debugging
  useEffect(() => {
    console.log("Exercises updated, count:", exercises.length);
    console.log("Exercises with explanations:", exercises.filter(ex => !!ex.explanation).length);
    console.log("Exercises expanded count:", exercises.filter(ex => ex.expanded).length);
    
    // Log each exercise's expanded state for debugging
    exercises.forEach(ex => {
      console.log(`Exercise ${ex.id}: expanded=${ex.expanded}, has explanation=${!!ex.explanation}`);
    });
  }, [exercises]);
  
  return {
    exercises,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat,
    pendingEvaluations
  };
};
