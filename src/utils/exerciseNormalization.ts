/**
 * Utility functions for normalizing exercises for prompt variables
 */

import { latexToPlainText, normalizeLatexForDisplay, isLatex, plainTextToLatex } from './latexUtils';

/**
 * Normalize exercise content for use in prompt variables
 * Provides a clean LaTeX representation suitable for AI processing
 */
export function normalizeExerciseForPrompt(exerciseContent: string): string {
  if (!exerciseContent?.trim()) {
    return '';
  }

  // If already LaTeX, normalize it
  if (isLatex(exerciseContent)) {
    return normalizeLatexForDisplay(exerciseContent);
  }

  // Convert plain text math to LaTeX
  const latexVersion = plainTextToLatex(exerciseContent);
  
  // Normalize the result
  return normalizeLatexForDisplay(latexVersion);
}

/**
 * Create dual payload with both original and normalized exercise content
 */
export function createExerciseDualPayload(exerciseContent: string): {
  original: string;
  normalized: string;
} {
  return {
    original: exerciseContent,
    normalized: normalizeExerciseForPrompt(exerciseContent)
  };
}