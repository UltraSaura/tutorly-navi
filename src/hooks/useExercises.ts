
import { useState, useEffect } from 'react';
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
  
  const toggleExerciseExpansion = (id: string) => {
    setExercises(exercises.map(exercise => 
      exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
    ));
  };
  
  // Function to process homework submitted directly via chat
  const processHomeworkFromChat = async (message: string) => {
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
      
      // First, create a new exercise and set expanded to true to show explanation by default
      const newExerciseId = Date.now().toString();
      const newEx: Exercise = {
        id: newExerciseId,
        question,
        userAnswer: answer,
        expanded: true, // Default to expanded to show explanation
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
      
      console.log("Exercise evaluated, has explanation:", !!updatedExercise.explanation);
      console.log("Explanation length:", updatedExercise.explanation?.length || 0);
      
      // Update the exercise with the evaluated answer, ensuring expanded is true
      setExercises(prev => prev.map(ex => 
        ex.id === newExerciseId ? { ...updatedExercise, expanded: true } : ex
      ));
      
      // Remove from pending evaluations
      setPendingEvaluations(prev => {
        const newSet = new Set(prev);
        newSet.delete(newExerciseId);
        return newSet;
      });
      
      // Update the overall grade calculation
      updateGrades();
      
    } catch (error) {
      console.error('Error processing homework:', error);
      toast.error('There was an issue grading your homework. Please try again.');
    }
  };
  
  // Function to create exercises from AI responses - used when needed
  const createExerciseFromAI = (question: string, explanation: string) => {
    // Check if we already have this question
    const existingExercise = exercises.find(ex => ex.question === question);
    
    if (existingExercise) {
      console.log("This exercise already exists");
      return existingExercise;
    }
    
    const newEx: Exercise = {
      id: Date.now().toString(),
      question,
      explanation,
      expanded: true, // Default to expanded to show explanation
    };
    
    setExercises(prev => [...prev, newEx]);
    
    toast.info("A new exercise has been added.");
    
    return newEx;
  };
  
  const updateGrades = () => {
    const newGrade = calculateGrade(exercises);
    setGrade(newGrade);
  };
  
  // Log exercises state changes for debugging
  useEffect(() => {
    console.log("Exercises updated:", exercises.length);
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
