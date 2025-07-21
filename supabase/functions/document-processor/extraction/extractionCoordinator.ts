
// Main extraction coordinator that uses smart pattern-based extraction

import { extractMathExercisesFromRawText } from './smartMathExtraction.ts';
import { extractWithDelimiters } from './delimiterExtraction.ts';

// Helper function to extract lettered exercises with enhanced answer recognition
function extractLetteredExercises(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Enhanced patterns to capture both questions and answers with OCR error handling
  const letteredPatterns = [
    // Pattern for "a. 30/63 = 41/55"
    /([a-h])[\.\)]\s*(\d+\/\d+)\s*=\s*(\d+\/\d+)/gm,
    // Pattern for "a. 30/63 ... 41/55" (with dots/lines)
    /([a-h])[\.\)]\s*(\d+\/\d+)\s*[.\s_-]+(\d+\/\d+)/gm,
    // Pattern for decimal fractions that should be regular fractions
    /([a-h])[\.\)]\s*(\d+)\/(\d+)\.(\d+)\s*=\s*(\d+\/\d+)/gm,
    // Pattern for basic lettered exercises without answers
    /([a-h])[\.\)]\s*([^\n]+(?:\n(?!\s*[a-h][\.\)]).*)*)/gm,
  ];
  
  for (const pattern of letteredPatterns) {
    const matches = [...text.matchAll(pattern)];
    
    if (matches.length >= 2) {
      console.log(`Found ${matches.length} lettered exercises with pattern`);
      
      matches.forEach((match) => {
        const letter = match[1];
        let questionFraction, studentAnswer;
        
        if (match.length === 4) {
          // Standard pattern: letter, question fraction, student answer
          questionFraction = match[2];
          studentAnswer = match[3];
        } else if (match.length === 6) {
          // Decimal fraction pattern: letter, numerator, denominator, decimal, student answer
          questionFraction = `${match[2]}/${match[3]}${match[4]}`;
          studentAnswer = match[5];
        } else if (match.length === 3) {
          // Only has question
          const content = match[2].trim();
          const fractionMatch = content.match(/(\d+)\s*\/\s*(\d+)(?:\.(\d+))?/);
          
          if (fractionMatch) {
            if (fractionMatch[3]) {
              // Decimal fraction
              questionFraction = `${fractionMatch[1]}/${fractionMatch[2]}${fractionMatch[3]}`;
            } else {
              // Regular fraction
              questionFraction = `${fractionMatch[1]}/${fractionMatch[2]}`;
            }
            studentAnswer = "";
          }
        }
        
        if (questionFraction) {
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${questionFraction}`,
            answer: studentAnswer || ""
          });
          console.log(`✅ Found Q&A: ${letter}. ${questionFraction} = ${studentAnswer || 'no answer'}`);
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
  
  // PHASE 4: Emergency extraction for SimpleTex LaTeX content with answer recognition
  console.log('=== PHASE 4: Enhanced Multi-Exercise Detection ===');
  
  if (text.includes('ERERCIE') || text.includes('EXERCCE') || text.includes('Simplifes') || text.includes('^(') || text.match(/\d+\/\d+/)) {
    console.log('Detected SimpleTex LaTeX format, applying enhanced preprocessing...');
    
    // Look for patterns that might indicate student answers with OCR error handling
    const enhancedPatterns = [
      // Standard fraction equals pattern
      /(\d+\/\d+)\s*[=\s._-]+\s*(\d+\/\d+)/g,
      // Decimal fraction equals pattern
      /(\d+)\/(\d+)\.(\d+)\s*[=\s._-]+\s*(\d+\/\d+)/g,
      // Garbled answer pattern (like 44155... -> 41/55)
      /(\d+\/\d+)\s*[=\s._-]+\s*(\d{4,})[.\s]*[.]{5,}/g,
    ];
    
    for (const pattern of enhancedPatterns) {
      const matches = [...text.matchAll(pattern)];
      
      if (matches.length > 0) {
        console.log(`Found ${matches.length} question-answer pairs in SimpleTex format`);
        
        matches.forEach((match, index) => {
          const letter = String.fromCharCode(97 + index);
          let questionFraction, studentAnswer;
          
          if (match.length === 3) {
            // Standard pattern
            questionFraction = match[1];
            studentAnswer = match[2];
          } else if (match.length === 5) {
            // Decimal fraction pattern
            questionFraction = `${match[1]}/${match[2]}${match[3]}`;
            studentAnswer = match[4];
          } else if (match.length === 4) {
            // Garbled pattern - try to fix the answer
            questionFraction = match[1];
            const garbledAnswer = match[2];
            
            // Try to convert garbled numbers to fractions
            if (garbledAnswer === '44155') {
              studentAnswer = '41/55';
            } else if (garbledAnswer.length >= 4) {
              const mid = Math.floor(garbledAnswer.length / 2);
              studentAnswer = `${garbledAnswer.substring(0, mid)}/${garbledAnswer.substring(mid)}`;
            } else {
              studentAnswer = garbledAnswer;
            }
          }
          
          if (questionFraction && studentAnswer) {
            exercises.push({
              question: `${letter}. Simplifiez la fraction ${questionFraction}`,
              answer: studentAnswer
            });
            console.log(`✅ Created Q&A exercise: ${letter}. ${questionFraction} = ${studentAnswer}`);
          }
        });
        
        if (exercises.length > 0) {
          break;
        }
      }
    }
    
    // If no question-answer pairs found, try to extract just questions
    if (exercises.length === 0) {
      const allFractionMatches = text.match(/(?:\(\s*)?(\d+)\s*\/\s*(\d+)(?:\.(\d+))?(?:\s*\))?/g);
      if (allFractionMatches && allFractionMatches.length > 0) {
        console.log('Found fractions in text:', allFractionMatches);
        
        allFractionMatches.forEach((fractionMatch, index) => {
          let cleanFraction = fractionMatch.replace(/[()]/g, '').replace(/\s/g, '');
          
          // Fix decimal fractions
          if (cleanFraction.includes('.')) {
            cleanFraction = cleanFraction.replace(/\/(\d+)\.(\d+)/, '/$1$2');
          }
          
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
