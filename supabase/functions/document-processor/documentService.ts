
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

// Multi-pass text extraction for better accuracy
async function multiPassExtraction(fileData: string, fileType: string): Promise<string> {
  console.log('Starting multi-pass extraction');
  
  try {
    // First pass: Standard extraction
    const firstPass = await extractTextFromFile(fileData, fileType);
    console.log('First pass completed, text length:', firstPass.length);
    
    // Preprocess the text
    const cleanedText = preprocessExtractedText(firstPass);
    
    // For now, return the cleaned first pass
    // TODO: Implement additional passes if needed
    return cleanedText;
  } catch (error) {
    console.error('Multi-pass extraction failed:', error);
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
    
    // Use multi-pass extraction with enhanced preprocessing
    const extractedText = await multiPassExtraction(fileData, fileType);
    console.log(`Final extracted text length: ${extractedText.length} characters`);
    console.log(`Final extracted text (first 500 chars): ${extractedText.substring(0, 500)}`);
    
    // Log the full text for debugging (in chunks)
    const textChunks = extractedText.match(/.{1,200}/g) || [];
    textChunks.forEach((chunk, index) => {
      console.log(`Text chunk ${index + 1}:`, chunk);
    });
    
    // Use enhanced pattern matching for exercise extraction
    console.log('Using enhanced pattern-based extraction for French math worksheets');
    const exercises = extractExercisesFromText(extractedText);
    
    console.log(`Enhanced extraction found ${exercises.length} exercises`);
    
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
