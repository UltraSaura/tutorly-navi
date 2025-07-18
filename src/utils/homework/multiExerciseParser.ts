import { extractHomeworkFromMessage } from './index';

export interface ParsedExercise {
  question: string;
  answer: string;
  index: number;
}

/**
 * Detects if a message contains multiple exercises
 */
export const hasMultipleExercises = (message: string): boolean => {
  // Check for numbered patterns (1. 2. 3. or 1) 2) 3))
  const numberedPattern = /(?:^|\n)\s*\d+[\.\)]\s*[^\n]+/gm;
  const numberedMatches = message.match(numberedPattern);
  
  // Check for lettered patterns (a. b. c. or a) b) c))
  const letteredPattern = /(?:^|\n)\s*[a-z][\.\)]\s*[^\n]+/gm;
  const letteredMatches = message.match(letteredPattern);
  
  // Check for bullet points or dashes
  const bulletPattern = /(?:^|\n)\s*[-•*]\s*[^\n]+/gm;
  const bulletMatches = message.match(bulletPattern);
  
  // Check for exercise keywords with numbers
  const exercisePattern = /(?:exercise|problem|question)\s*\d+/gi;
  const exerciseMatches = message.match(exercisePattern);
  
  return (numberedMatches && numberedMatches.length >= 2) ||
         (letteredMatches && letteredMatches.length >= 2) ||
         (bulletMatches && bulletMatches.length >= 2) ||
         (exerciseMatches && exerciseMatches.length >= 2);
};

/**
 * Splits a message containing multiple exercises into individual exercises
 */
export const parseMultipleExercises = (message: string): ParsedExercise[] => {
  const exercises: ParsedExercise[] = [];
  
  // Try numbered format first (1. 2. 3. or 1) 2) 3))
  const numberedPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+(?:\n(?!\s*\d+[\.\)]).*)*)/gm;
  let numberedMatches = [...message.matchAll(numberedPattern)];
  
  if (numberedMatches.length >= 2) {
    numberedMatches.forEach((match, index) => {
      const exerciseText = match[2].trim();
      const parsed = extractHomeworkFromMessage(exerciseText);
      
      if (parsed.question && parsed.answer) {
        exercises.push({
          question: parsed.question,
          answer: parsed.answer,
          index: parseInt(match[1])
        });
      } else {
        // If extraction fails, treat the whole text as question
        exercises.push({
          question: exerciseText,
          answer: "",
          index: parseInt(match[1])
        });
      }
    });
    
    if (exercises.length > 0) return exercises;
  }
  
  // Try lettered format (a. b. c. or a) b) c))
  const letteredPattern = /(?:^|\n)\s*([a-z])[\.\)]\s*([^\n]+(?:\n(?!\s*[a-z][\.\)]).*)*)/gm;
  let letteredMatches = [...message.matchAll(letteredPattern)];
  
  if (letteredMatches.length >= 2) {
    letteredMatches.forEach((match, index) => {
      const exerciseText = match[2].trim();
      const parsed = extractHomeworkFromMessage(exerciseText);
      
      if (parsed.question && parsed.answer) {
        exercises.push({
          question: parsed.question,
          answer: parsed.answer,
          index: index + 1
        });
      } else {
        exercises.push({
          question: exerciseText,
          answer: "",
          index: index + 1
        });
      }
    });
    
    if (exercises.length > 0) return exercises;
  }
  
  // Try bullet points or dashes
  const bulletPattern = /(?:^|\n)\s*[-•*]\s*([^\n]+(?:\n(?!\s*[-•*]).*)*)/gm;
  let bulletMatches = [...message.matchAll(bulletPattern)];
  
  if (bulletMatches.length >= 2) {
    bulletMatches.forEach((match, index) => {
      const exerciseText = match[1].trim();
      const parsed = extractHomeworkFromMessage(exerciseText);
      
      if (parsed.question && parsed.answer) {
        exercises.push({
          question: parsed.question,
          answer: parsed.answer,
          index: index + 1
        });
      } else {
        exercises.push({
          question: exerciseText,
          answer: "",
          index: index + 1
        });
      }
    });
    
    if (exercises.length > 0) return exercises;
  }
  
  // Try exercise/problem/question keywords
  const exercisePattern = /(?:exercise|problem|question)\s*(\d+)[:\.]?\s*([^\n]+(?:\n(?!(?:exercise|problem|question)\s*\d+).*)*)/gi;
  let exerciseMatches = [...message.matchAll(exercisePattern)];
  
  if (exerciseMatches.length >= 2) {
    exerciseMatches.forEach((match) => {
      const exerciseText = match[2].trim();
      const parsed = extractHomeworkFromMessage(exerciseText);
      
      if (parsed.question && parsed.answer) {
        exercises.push({
          question: parsed.question,
          answer: parsed.answer,
          index: parseInt(match[1])
        });
      } else {
        exercises.push({
          question: exerciseText,
          answer: "",
          index: parseInt(match[1])
        });
      }
    });
    
    if (exercises.length > 0) return exercises;
  }
  
  // Fallback: try to split by double newlines
  const sections = message.split(/\n\s*\n/).filter(section => section.trim().length > 0);
  
  if (sections.length >= 2) {
    sections.forEach((section, index) => {
      const parsed = extractHomeworkFromMessage(section.trim());
      
      if (parsed.question && parsed.answer) {
        exercises.push({
          question: parsed.question,
          answer: parsed.answer,
          index: index + 1
        });
      } else if (section.trim().length > 10) { // Only add if meaningful content
        exercises.push({
          question: section.trim(),
          answer: "",
          index: index + 1
        });
      }
    });
  }
  
  return exercises;
};