
import { useState } from 'react';
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
  
  const toggleExerciseExpansion = (id: string) => {
    setExercises(exercises.map(exercise => 
      exercise.id === id ? { ...exercise, expanded: !exercise.expanded } : exercise
    ));
  };
  
  // Function to process homework submitted directly via chat
  const processHomeworkFromChat = async (message: string) => {
    try {
      // Extract the exercise question and user's answer
      const { question, answer } = extractHomeworkFromMessage(message);
      
      if (!question || !answer) {
        console.log("Couldn't extract homework components from the message");
        return;
      }
      
      // First, create a new exercise
      const newEx: Exercise = {
        id: Date.now().toString(),
        question,
        userAnswer: answer,
        expanded: false,
      };
      
      // Add it to the list
      setExercises(prev => [...prev, newEx]);
      
      // Now evaluate the answer
      const updatedExercise = await evaluateHomework(newEx);
      
      // Update the exercise with the evaluated answer
      setExercises(prev => prev.map(ex => 
        ex.id === newEx.id ? updatedExercise : ex
      ));
      
      // Update the overall grade calculation
      updateGrades();
      
    } catch (error) {
      console.error('Error processing homework:', error);
      
      // Fallback if there's an error
      toast.error('There was an issue grading your homework. Please try again.');
    }
  };
  
  // Function to create exercises from AI responses
  const createExerciseFromAI = (question: string, explanation: string) => {
    const newEx: Exercise = {
      id: Date.now().toString(),
      question,
      explanation,
      expanded: false,
    };
    
    setExercises(prev => [...prev, newEx]);
    
    toast.info("A new exercise has been added based on our conversation.");
    
    return newEx;
  };
  
  const updateGrades = () => {
    const newGrade = calculateGrade(exercises);
    setGrade(newGrade);
  };
  
  return {
    exercises,
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat
  };
};
