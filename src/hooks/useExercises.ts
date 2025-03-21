
import { useState } from 'react';
import { Exercise, Grade } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState('');
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
  
  const submitAsExercise = () => {
    if (newExercise.trim() === '') {
      uiToast({
        description: "Please enter your exercise or homework question.",
        variant: "destructive",
      });
      return;
    }
    
    const newEx: Exercise = {
      id: Date.now().toString(),
      question: newExercise,
      expanded: false,
    };
    
    setExercises([...exercises, newEx]);
    setNewExercise('');
    
    uiToast({
      description: "Your exercise has been submitted. I'll help you work through it!",
    });
    
    // Update grade calculation
    updateGrades();
    
    return newEx; // Return the newly created exercise for potential use
  };
  
  const submitExerciseAnswer = (id: string, answer: string) => {
    // Simulate answer evaluation
    const isCorrect = Math.random() > 0.3; // 70% chance of being correct for demo
    
    setExercises(exercises.map(exercise => 
      exercise.id === id 
        ? { 
            ...exercise, 
            userAnswer: answer, 
            isCorrect, 
            explanation: isCorrect 
              ? "Great job! Your answer is correct." 
              : "Let's review this together. Here's how to approach this problem..."
          } 
        : exercise
    ));
    
    updateGrades();
  };
  
  const updateGrades = () => {
    const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined);
    if (answeredExercises.length === 0) {
      setGrade({ percentage: 0, letter: 'N/A' });
      return;
    }
    
    const correctExercises = answeredExercises.filter(ex => ex.isCorrect).length;
    const percentage = Math.round((correctExercises / answeredExercises.length) * 100);
    
    let letter = 'F';
    if (percentage >= 90) letter = 'A';
    else if (percentage >= 80) letter = 'B';
    else if (percentage >= 70) letter = 'C';
    else if (percentage >= 60) letter = 'D';
    
    setGrade({ percentage, letter });
  };
  
  return {
    exercises,
    newExercise,
    setNewExercise,
    grade,
    toggleExerciseExpansion,
    submitAsExercise,
    submitExerciseAnswer
  };
};
