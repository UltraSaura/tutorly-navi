
import { useState } from 'react';
import { Exercise, Grade } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

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
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `I need you to grade this homework. The question is: "${question}" and the student's answer is: "${answer}". Please evaluate if it's correct or incorrect, and provide a detailed explanation why.`,
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
      
      // Check for positive/negative keywords
      if (correctKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
        isCorrect = true;
      } else if (incorrectKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
        isCorrect = false;
      } else {
        // Default to not correct if no clear indicators
        isCorrect = false;
      }
      
      // Extract an explanation from the AI response
      let explanation = aiResponse;
      if (explanation.length > 500) {
        // Truncate very long explanations but preserve meaning
        explanation = explanation.substring(0, 500) + '...';
      }
      
      // Update the exercise with the evaluated answer
      setExercises(prev => prev.map(ex => 
        ex.id === newEx.id 
          ? { 
              ...ex, 
              isCorrect, 
              explanation
            } 
          : ex
      ));
      
      // Display a toast to notify the user
      toast.success(`Your homework has been graded. ${isCorrect ? 'Great job!' : 'Review the feedback for improvements.'}`);
      
      // Update the overall grade calculation
      updateGrades();
      
    } catch (error) {
      console.error('Error processing homework:', error);
      
      // Fallback if there's an error
      toast.error('There was an issue grading your homework. Please try again.');
    }
  };
  
  // Helper function to extract homework components from a message
  const extractHomeworkFromMessage = (message: string): { question: string, answer: string } => {
    // This is a simplified extraction - could be improved with NLP
    
    // Some common patterns for homework submissions
    const questionPatterns = [
      /problem:(.+?)answer:/i,
      /question:(.+?)answer:/i,
      /homework:(.+?)answer:/i,
      /(.+?)my answer is:/i,
      /(.+?)my solution is:/i
    ];
    
    const answerPatterns = [
      /answer:(.+?)$/i,
      /my answer is:(.+?)$/i,
      /my solution is:(.+?)$/i,
      /solution:(.+?)$/i
    ];
    
    // Try to extract question and answer using patterns
    let question = "";
    let answer = "";
    
    // Try to extract the question
    for (const pattern of questionPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        question = match[1].trim();
        break;
      }
    }
    
    // Try to extract the answer
    for (const pattern of answerPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        answer = match[1].trim();
        break;
      }
    }
    
    // If pattern matching failed, make a best effort split
    if (!question || !answer) {
      // Look for keywords
      const lowerMessage = message.toLowerCase();
      const keywords = ['answer:', 'solution:', 'my answer is:', 'my solution is:'];
      
      for (const keyword of keywords) {
        const index = lowerMessage.indexOf(keyword);
        if (index > 0) {
          question = message.substring(0, index).trim();
          answer = message.substring(index + keyword.length).trim();
          break;
        }
      }
      
      // If still no match, just split the message in half
      if (!question || !answer) {
        const parts = message.split('\n\n');
        if (parts.length >= 2) {
          question = parts[0].trim();
          answer = parts.slice(1).join('\n\n').trim();
        } else {
          // Last resort: split in half
          const midpoint = Math.floor(message.length / 2);
          question = message.substring(0, midpoint).trim();
          answer = message.substring(midpoint).trim();
        }
      }
    }
    
    return { question, answer };
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
    grade,
    toggleExerciseExpansion,
    createExerciseFromAI,
    processHomeworkFromChat
  };
};
