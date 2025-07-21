
// Main extraction coordinator that uses smart pattern-based extraction

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Helper function to extract lettered exercises with enhanced answer recognition
function extractLetteredExercises(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Enhanced pattern to capture both questions and answers
  const letteredPatterns = [
    // Pattern for "a. 30/63 = 41/55"
    /([a-h])[\.\)]\s*(\d+\/\d+)\s*=\s*(\d+\/\d+)/gm,
    // Pattern for "a. 30/63 ... 41/55" (with dots/lines)
    /([a-h])[\.\)]\s*(\d+\/\d+)\s*[.\s_-]+(\d+\/\d+)/gm,
    // Pattern for basic lettered exercises without answers
    /([a-h])[\.\)]\s*([^\n]+(?:\n(?!\s*[a-h][\.\)]).*)*)/gm,
  ];
  
  for (const pattern of letteredPatterns) {
    const matches = [...text.matchAll(pattern)];
    
    if (matches.length >= 2) {
      console.log(`Found ${matches.length} lettered exercises with pattern`);
      
      matches.forEach((match) => {
        const letter = match[1];
        
        if (match.length === 4) {
          // Has both question and answer
          const questionFraction = match[2];
          const studentAnswer = match[3];
          
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${questionFraction}`,
            answer: studentAnswer
          });
          console.log(`✅ Found Q&A: ${letter}. ${questionFraction} = ${studentAnswer}`);
        } else {
          // Only has question
          const content = match[2].trim();
          const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)/);
          
          if (fractionMatch) {
            const fraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
            exercises.push({
              question: `${letter}. Simplifiez la fraction ${fraction}`,
              answer: ""
            });
            console.log(`✅ Found Q only: ${letter}. ${fraction}`);
          }
        }
      });
      
      // If we found exercises with this pattern, return them
      if (exercises.length > 0) {
        break;
      }
    }
    
    pattern.lastIndex = 0;
  }
  
  return exercises;
}

// Enhanced extraction with better SimpleTex LaTeX support and answer recognition
export function extractExercisesFromText(text: string): Array<{ question: string, answer: string }> {
  console.log('=== SMART EXTRACTION START ===');
  console.log('Input text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // PHASE 1: Try smart pattern-based extraction with LaTeX awareness
  console.log('=== PHASE 1: Smart Pattern-Based Extraction ===');
  let exercises = extractMathExercisesFromRawText(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 1 SUCCESS: Found ${exercises.length} exercises using smart extraction`);
    exercises.forEach((ex, idx) => {
      console.log(`Exercise ${idx + 1}: "${ex.question}" → Answer: "${ex.answer}"`);
    });
    return exercises;
  }
  
  // PHASE 2: Enhanced lettered exercise extraction
  console.log('=== PHASE 2: Enhanced Lettered Exercise Extraction ===');
  exercises = extractLetteredExercises(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 2 SUCCESS: Found ${exercises.length} exercises using enhanced lettered extraction`);
    return exercises;
  }
  
  // PHASE 3: Fallback to delimiter-based extraction (legacy)
  console.log('=== PHASE 3: Delimiter-Based Fallback ===');
  exercises = extractWithDelimiters(text);
  
  if (exercises.length > 0) {
    console.log(`PHASE 3 SUCCESS: Found ${exercises.length} exercises using delimiters`);
    return exercises;
  }
  
  // PHASE 4: Enhanced multi-exercise detection for specific patterns
  console.log('=== PHASE 4: Enhanced Multi-Exercise Detection ===');
  
  // Emergency extraction for SimpleTex LaTeX content with answer recognition
  if (text.includes('ERERCIE') || text.includes('Simpliffer') || text.includes('^(') || text.match(/\d+\/\d+/)) {
    console.log('Detected SimpleTex LaTeX format, applying enhanced preprocessing...');
    
    // Look for patterns that might indicate student answers
    const fractionAnswerPattern = /(\d+\/\d+)\s*[=\s._-]+\s*(\d+\/\d+)/g;
    const matches = [...text.matchAll(fractionAnswerPattern)];
    
    if (matches.length > 0) {
      console.log(`Found ${matches.length} question-answer pairs in SimpleTex format`);
      
      matches.forEach((match, index) => {
        const letter = String.fromCharCode(97 + index);
        const questionFraction = match[1];
        const studentAnswer = match[2];
        
        exercises.push({
          question: `${letter}. Simplifiez la fraction ${questionFraction}`,
          answer: studentAnswer
        });
        console.log(`✅ Created Q&A exercise: ${letter}. ${questionFraction} = ${studentAnswer}`);
      });
    } else {
      // Fallback to questions only
      const allFractionMatches = text.match(/(?:\(\s*)?(\d+)\s*\/\s*(\d+)(?:\s*\))?/g);
      if (allFractionMatches && allFractionMatches.length > 0) {
        console.log('Found fractions in text:', allFractionMatches);
        
        allFractionMatches.forEach((fractionMatch, index) => {
          const cleanFraction = fractionMatch.replace(/[()]/g, '').replace(/\s/g, '');
          const letter = String.fromCharCode(97 + index);
          
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${cleanFraction}`,
            answer: ""
          });
          console.log(`✅ Created question-only exercise: ${letter}. ${cleanFraction}`);
        });
      }
    }
    
    if (exercises.length > 0) {
      console.log(`PHASE 4: Created ${exercises.length} exercises from SimpleTex format`);
      return exercises;
    }
  }
  
  // PHASE 5: Final fallback
  console.log('=== PHASE 5: Minimal Content Exercise ===');
  if (text.trim().length > 0) {
    exercises = [{
      question: "Document Content",
      answer: text.trim().substring(0, 300)
    }];
    console.log(`PHASE 5: Created 1 content-based exercise`);
  }
  
  return exercises;
}
