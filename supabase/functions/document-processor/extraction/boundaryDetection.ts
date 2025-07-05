// PHASE 2: Boundary detection with exercise marker scanning

import { preprocessFrenchMathText } from './textPreprocessing.ts';
import { isEducationalContent } from './validationUtils.ts';

// Boundary detection with aggressive preprocessing
export function extractWithBoundaryDetection(text: string): Array<{ question: string, answer: string }> {
  console.log('Starting boundary detection...');
  
  // Apply aggressive preprocessing for French math worksheets
  const processedText = preprocessFrenchMathText(text);
  
  // Use the smart scanning approach
  return scanForExerciseMarkers(processedText);
}

// Character-by-character scanning for exercise markers
export function scanForExerciseMarkers(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  const exerciseMarkers = [
    /^([a-h])\s*[\.\)]/, // a. or a)
    /^(\d+)\s*[\.\)]/, // 1. or 1)
    /^([IVX]+)\s*\./, // I. II. III.
    /^(exercice|ex|problème|question)\s*\d*/i // Exercise keywords
  ];
  
  // Split text into lines and scan each line
  const lines = text.split(/\n+/);
  let currentExercise = '';
  let currentMarker = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if this line starts with an exercise marker
    let isNewExercise = false;
    let marker = '';
    
    for (const pattern of exerciseMarkers) {
      const match = line.match(pattern);
      if (match) {
        marker = match[1];
        isNewExercise = true;
        break;
      }
    }
    
    if (isNewExercise) {
      // Save previous exercise if it exists
      if (currentExercise && currentMarker) {
        const cleanContent = currentExercise.replace(/^[a-zA-Z0-9IVX]+[\.\)]\s*/, '').trim();
        if (isEducationalContent(cleanContent)) {
          exercises.push({
            question: `${currentMarker}. ${cleanContent}`,
            answer: ""
          });
          console.log(`Scanned exercise: ${currentMarker}. ${cleanContent.substring(0, 50)}...`);
        }
      }
      
      // Start new exercise
      currentExercise = line;
      currentMarker = marker;
    } else if (currentExercise) {
      // Continue building current exercise
      currentExercise += ' ' + line;
    }
  }
  
  // Don't forget the last exercise
  if (currentExercise && currentMarker) {
    const cleanContent = currentExercise.replace(/^[a-zA-Z0-9IVX]+[\.\)]\s*/, '').trim();
    if (isEducationalContent(cleanContent)) {
      exercises.push({
        question: `${currentMarker}. ${cleanContent}`,
        answer: ""
      });
      console.log(`Final scanned exercise: ${currentMarker}. ${cleanContent.substring(0, 50)}...`);
    }
  }
  
  return exercises;
}

// Improved pattern-based extraction with better content limits
export function extractWithImprovedPatterns(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  console.log('Using improved pattern extraction...');
  
  // More precise patterns with content length limits
  const patterns = [
    // Letters with dots - limit content to reasonable length
    /([a-h])\s*\.\s*([^a-h\n]{3,150})(?=\s*[a-h]\s*\.|$)/gi,
    // Numbers with dots
    /(\d+)\s*\.\s*([^\d\n]{3,150})(?=\s*\d+\s*\.|$)/gi,
    // Letters with parentheses  
    /([a-h])\s*\)\s*([^a-h\n]{3,150})(?=\s*[a-h]\s*\)|$)/gi,
    // Numbers with parentheses
    /(\d+)\s*\)\s*([^\d\n]{3,150})(?=\s*\d+\s*\)|$)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      const identifier = match[1];
      const content = match[2].trim();
      
      if (isEducationalContent(content) && content.length < 200) {
        exercises.push({
          question: `${identifier}. ${content}`,
          answer: ""
        });
        console.log(`Pattern found: ${identifier}. ${content.substring(0, 50)}...`);
      }
    }
    
    if (exercises.length > 0) {
      console.log(`Pattern ${pattern.source} found ${exercises.length} exercises`);
      break; // Use first successful pattern
    }
  }
  
  return exercises;
}