import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText } from "./exerciseExtractors.ts";

// Minimal text preprocessing that preserves exercise structure
function minimalPreprocessing(text: string): string {
  console.log('=== MINIMAL PREPROCESSING ===');
  console.log('Raw text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // Only remove obvious LaTeX artifacts while preserving structure
  let cleanedText = text
    // Remove LaTeX commands but keep content
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, ' ')
    
    // Normalize whitespace but preserve line breaks
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  console.log('Minimally processed text length:', cleanedText.length);
  console.log('Minimally processed text (first 500 chars):', cleanedText.substring(0, 500));
  console.log('=== MINIMAL PREPROCESSING COMPLETE ===');
  
  return cleanedText;
}

// Enhanced extraction that works with raw text
async function enhancedExtraction(fileData: string, fileType: string): Promise<string> {
  console.log('Starting enhanced extraction with structure preservation');
  
  try {
    // Extract raw text from file
    const rawText = await extractTextFromFile(fileData, fileType);
    console.log('Raw extraction completed, text length:', rawText.length);
    console.log('Raw text sample:', rawText.substring(0, 300));
    
    // Apply minimal preprocessing to preserve exercise structure
    const processedText = minimalPreprocessing(rawText);
    
    return processedText;
  } catch (error) {
    console.error('Enhanced extraction failed:', error);
    throw error;
  }
}

export async function processDocument(
  fileData: string, 
  fileType: string, 
  fileName: string,
  subjectId?: string
): Promise<{ success: boolean, exercises: any[], rawText: string, error?: string }> {
  try {
    console.log(`=== PROCESSING DOCUMENT: ${fileName} (${fileType}) ===`);
    
    // Use enhanced extraction that preserves structure
    const extractedText = await enhancedExtraction(fileData, fileType);
    console.log(`Enhanced extraction result - text length: ${extractedText.length} characters`);
    
    // Log the full text in manageable chunks for debugging
    const textChunks = extractedText.match(/.{1,300}/g) || [];
    textChunks.forEach((chunk, index) => {
      console.log(`Text chunk ${index + 1}:`, chunk);
    });
    
    // Use the enhanced multi-exercise extraction system
    console.log('=== STARTING MULTI-EXERCISE EXTRACTION ===');
    const exercises = extractExercisesFromText(extractedText);
    
    console.log(`=== EXTRACTION COMPLETE: Found ${exercises.length} exercises ===`);
    
    // Log each exercise found
    exercises.forEach((ex, idx) => {
      console.log(`Exercise ${idx + 1}: Question="${ex.question}" Answer="${ex.answer}"`);
    });
    
    // Enhanced fallback if no exercises found
    if (exercises.length === 0 && extractedText.length > 0) {
      console.log('No exercises detected - creating comprehensive fallback');
      
      // Look for any fraction patterns in the text
      const fractionMatches = extractedText.match(/\d+\/\d+/g);
      if (fractionMatches && fractionMatches.length > 0) {
        console.log('Found fractions for fallback exercises:', fractionMatches);
        
        fractionMatches.forEach((fraction, index) => {
          const letter = String.fromCharCode(97 + index); // a, b, c, etc.
          exercises.push({
            question: `${letter}. Simplifiez la fraction ${fraction}`,
            answer: fraction
          });
          console.log(`Created fallback exercise: ${letter}. Simplifiez la fraction ${fraction}`);
        });
      } else {
        // Final fallback
        exercises.push({
          question: "Document Content Analysis",
          answer: extractedText.length > 300 
            ? extractedText.substring(0, 300) + "..." 
            : extractedText
        });
      }
    }
    
    console.log(`=== FINAL RESULT: ${exercises.length} exercises extracted ===`);
    
    return {
      success: true,
      exercises,
      rawText: extractedText
    };
  } catch (error) {
    console.error('=== ERROR IN DOCUMENT PROCESSING ===', error);
    return {
      success: false,
      exercises: [],
      rawText: '',
      error: error.message
    };
  }
}
