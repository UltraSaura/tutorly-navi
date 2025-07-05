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
    /^([a-h])\s*[\.\)]\s*(.*)/, // a. or a) with content
    /^(\d+)\s*[\.\)]\s*(.*)/, // 1. or 1) with content
    /^([IVX]+)\s*\.\s*(.*)/, // I. II. III. with content
    /^(exercice|ex|problème|question)\s*\d*[:\.]?\s*(.*)/i // Exercise keywords with content
  ];
  
  console.log('=== SCANNING FOR EXERCISE MARKERS ===');
  console.log('Input text length:', text.length);
  console.log('Input text preview:', text.substring(0, 200));
  
  // Split text into lines and scan each line
  const lines = text.split(/\n+/);
  console.log('Total lines to process:', lines.length);
  
  let currentExercise = '';
  let currentMarker = '';
  let exerciseContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    console.log(`Processing line ${i + 1}: "${line}"`);
    
    // Check if this line starts with an exercise marker
    let isNewExercise = false;
    let marker = '';
    let content = '';
    
    for (const pattern of exerciseMarkers) {
      const match = line.match(pattern);
      if (match) {
        marker = match[1];
        content = match[2] ? match[2].trim() : '';
        isNewExercise = true;
        console.log(`Found exercise marker: "${marker}" with initial content: "${content}"`);
        break;
      }
    }
    
    if (isNewExercise) {
      // Save previous exercise if it exists
      if (currentMarker && exerciseContent) {
        console.log(`Saving previous exercise: ${currentMarker} -> "${exerciseContent}"`);
        if (isEducationalContent(exerciseContent) || exerciseContent.length > 2) {
          exercises.push({
            question: `${currentMarker}. ${exerciseContent}`,
            answer: ""
          });
          console.log(`✅ Exercise saved: ${currentMarker}. ${exerciseContent.substring(0, 100)}...`);
        } else {
          console.log(`❌ Exercise rejected by validation: "${exerciseContent}"`);
        }
      }
      
      // Start new exercise
      currentMarker = marker;
      exerciseContent = content; // Start with the content found on the same line
      console.log(`Starting new exercise: ${currentMarker} with content: "${exerciseContent}"`);
    } else if (currentMarker) {
      // Continue building current exercise content
      exerciseContent += (exerciseContent ? ' ' : '') + line;
      console.log(`Adding to current exercise: "${line}" -> full content now: "${exerciseContent}"`);
    }
  }
  
  // Don't forget the last exercise
  if (currentMarker && exerciseContent) {
    console.log(`Saving final exercise: ${currentMarker} -> "${exerciseContent}"`);
    if (isEducationalContent(exerciseContent) || exerciseContent.length > 2) {
      exercises.push({
        question: `${currentMarker}. ${exerciseContent}`,
        answer: ""
      });
      console.log(`✅ Final exercise saved: ${currentMarker}. ${exerciseContent.substring(0, 100)}...`);
    } else {
      console.log(`❌ Final exercise rejected by validation: "${exerciseContent}"`);
    }
  }
  
  console.log(`=== SCAN COMPLETE: Found ${exercises.length} exercises ===`);
  exercises.forEach((ex, idx) => {
    console.log(`Exercise ${idx + 1}: "${ex.question}"`);
  });
  
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