
import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText } from "./exerciseExtractors.ts";

// Text preprocessing function to clean OCR output
function preprocessExtractedText(text: string): string {
  console.log('Starting text preprocessing');
  console.log('Raw text length:', text.length);
  console.log('Raw text (first 300 chars):', text.substring(0, 300));
  
  let cleanedText = text
    // Remove LaTeX artifacts
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    
    // Fix common OCR mistakes in French
    .replace(/([a-zA-Z])\s*,\s*/g, '$1. ')  // Fix a, -> a.
    .replace(/([a-zA-Z])\s*\.\s*/g, '$1. ') // Normalize spacing around periods
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fractions
    
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  console.log('Cleaned text length:', cleanedText.length);
  console.log('Cleaned text (first 300 chars):', cleanedText.substring(0, 300));
  
  return cleanedText;
}

// Optimized single-pass extraction with robust preprocessing
async function optimizedExtraction(fileData: string, fileType: string): Promise<string> {
  console.log('Starting optimized extraction');
  
  try {
    // Use Vision API with improved prompt
    const extractedText = await extractTextFromFile(fileData, fileType);
    console.log('Vision API extraction completed, text length:', extractedText.length);
    
    // Apply targeted preprocessing for French math worksheets
    const cleanedText = preprocessExtractedText(extractedText);
    
    return cleanedText;
  } catch (error) {
    console.error('Optimized extraction failed:', error);
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
    console.log(`Processing document: ${fileName} (${fileType})`);
    
    // Use optimized single-pass extraction
    const extractedText = await optimizedExtraction(fileData, fileType);
    console.log(`Final extracted text length: ${extractedText.length} characters`);
    console.log(`Final extracted text (first 500 chars): ${extractedText.substring(0, 500)}`);
    
    // Log the full text for debugging (in chunks)
    const textChunks = extractedText.match(/.{1,200}/g) || [];
    textChunks.forEach((chunk, index) => {
      console.log(`Text chunk ${index + 1}:`, chunk);
    });
    
    // Use the tiered extraction system
    console.log('Using tiered extraction system for robust exercise detection');
    const exercises = extractExercisesFromText(extractedText);
    
    console.log(`Tiered extraction found ${exercises.length} exercises`);
    
    // If no exercises found, create a fallback exercise from the content
    if (exercises.length === 0 && extractedText.length > 0) {
      console.log('No exercises detected - creating fallback exercise');
      exercises.push({
        question: "Document Content Analysis",
        answer: extractedText.length > 300 
          ? extractedText.substring(0, 300) + "..." 
          : extractedText
      });
    }
    
    console.log(`Final result: ${exercises.length} exercises extracted`);
    exercises.forEach((ex, idx) => {
      console.log(`Final Exercise ${idx + 1}: "${ex.question.substring(0, 100)}..."`);
    });
    
    return {
      success: true,
      exercises,
      rawText: extractedText
    };
  } catch (error) {
    console.error('Error in document processing:', error);
    return {
      success: false,
      exercises: [],
      rawText: '',
      error: error.message
    };
  }
}
