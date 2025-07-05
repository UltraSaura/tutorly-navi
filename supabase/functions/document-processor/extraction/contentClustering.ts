// PHASE 3: Content clustering approach

import { isEducationalContent } from './validationUtils.ts';

// Content clustering approach
export function extractWithContentClustering(text: string): Array<{ question: string, answer: string }> {
  console.log('Starting content clustering...');
  
  // Look for mathematical content clusters
  const mathClusters = findMathematicalClusters(text);
  
  if (mathClusters.length > 1) {
    console.log(`Found ${mathClusters.length} mathematical content clusters`);
    return mathClusters.map((cluster, index) => ({
      question: `Exercise ${index + 1}: ${cluster}`,
      answer: ""
    }));
  }
  
  // Try splitting on strong separators
  return splitOnSeparators(text);
}

// Find clusters of mathematical content
function findMathematicalClusters(text: string): string[] {
  const clusters = [];
  const mathPattern = /([^.!?]*(?:\d+\/\d+|\d+\s*[+\-×÷]\s*\d+|=)[^.!?]*[.!?]?)/g;
  let match;
  
  while ((match = mathPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.length > 10 && isEducationalContent(content)) {
      clusters.push(content);
    }
  }
  
  return clusters;
}

// Split text on strong separators
function splitOnSeparators(text: string): Array<{ question: string, answer: string }> {
  const separators = ['\n\n', '. ', '? ', '! '];
  
  for (const separator of separators) {
    const parts = text.split(separator).filter(part => part.trim().length > 10);
    
    if (parts.length > 1) {
      console.log(`Split on '${separator}' found ${parts.length} parts`);
      return parts.map((part, index) => ({
        question: `${index + 1}. ${part.trim()}`,
        answer: ""
      }));
    }
  }
  
  return [];
}

// Extract any mathematical content as exercises
export function extractMathematicalContent(text: string): Array<{ question: string, answer: string }> {
  const exercises = [];
  
  // Find fraction patterns with context
  const fractionPattern = /([a-z]\s*\.\s*.*?\d+\/\d+.*?)(?=[a-z]\s*\.|$)/gi;
  let match;
  
  while ((match = fractionPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.length > 3) {
      exercises.push({
        question: content,
        answer: ""
      });
      console.log(`Math content found: ${content}`);
    }
  }
  
  // If still no matches, try simpler fraction detection
  if (exercises.length === 0) {
    const simpleFractions = text.match(/\d+\/\d+/g);
    if (simpleFractions) {
      simpleFractions.forEach((fraction, index) => {
        const context = extractContextAroundFraction(text, fraction);
        exercises.push({
          question: `Exercise ${index + 1}: ${context}`,
          answer: ""
        });
      });
    }
  }
  
  return exercises;
}

// Extract context around a fraction
function extractContextAroundFraction(text: string, fraction: string): string {
  const index = text.indexOf(fraction);
  if (index === -1) return fraction;
  
  const start = Math.max(0, index - 15);
  const end = Math.min(text.length, index + fraction.length + 15);
  return text.substring(start, end).trim();
}