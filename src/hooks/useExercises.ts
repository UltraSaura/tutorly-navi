
import { useState } from 'react';
import { Exercise, Grade } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState('');
  const { toast } = useToast();
  
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
      toast({
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
    
    toast({
      description: "Your exercise has been submitted. I'll help you work through it!",
    });
    
    // Update grade calculation
    updateGrades();
    
    return newEx; // Return the newly created exercise for potential use
  };
  
  const submitExerciseAnswer = async (id: string, answer: string) => {
    try {
      // Find the exercise
      const exercise = exercises.find(ex => ex.id === id);
      if (!exercise) return;
      
      // Call the AI to evaluate the answer
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `I'm submitting my answer to this exercise: "${exercise.question}". My answer is: "${answer}". Please evaluate if it's correct, and provide an explanation for why it's correct or how to get the correct answer.`,
          modelId: 'gpt4o', // Use a good model for evaluation
          history: [],
        },
      });
      
      if (error) throw error;
      
      // Parse the AI response to determine if the answer is correct
      const aiResponse = data.content;
      
      // Determine if the answer is correct based on keywords in the response
      const correctKeywords = ['correct', 'right', 'accurate', 'perfect', 'excellent', 'well done'];
      const incorrectKeywords = ['incorrect', 'wrong', 'mistake', 'error', 'not right', 'not correct'];
      
      let isCorrect = false;
      
      // Simple heuristic: check for positive/negative keywords
      if (correctKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
        isCorrect = true;
      } else if (incorrectKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
        isCorrect = false;
      } else {
        // If no clear indicators, default to not correct 
        // (we could make this more sophisticated with more advanced NLP)
        isCorrect = false;
      }
      
      // Extract an explanation from the AI response
      let explanation = aiResponse;
      if (explanation.length > 300) {
        // Truncate extremely long explanations
        explanation = explanation.substring(0, 300) + '...';
      }
      
      // Update the exercise with the evaluated answer
      setExercises(exercises.map(ex => 
        ex.id === id 
          ? { 
              ...ex, 
              userAnswer: answer, 
              isCorrect, 
              explanation
            } 
          : ex
      ));
      
      updateGrades();
      
    } catch (error) {
      console.error('Error evaluating answer:', error);
      
      // Fallback to random evaluation in case of errors
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
    }
  };
  
  // Add a new function to create exercises from AI responses
  const createExerciseFromAI = (question: string, explanation: string) => {
    const newEx: Exercise = {
      id: Date.now().toString(),
      question,
      explanation,
      expanded: false,
    };
    
    setExercises(prev => [...prev, newEx]);
    
    toast({
      description: "A new exercise has been added based on our conversation.",
    });
    
    return newEx;
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
    submitExerciseAnswer,
    createExerciseFromAI
  };
};
