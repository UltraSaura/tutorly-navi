
import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText } from "./exerciseExtractors.ts";

export async function processDocument(
  fileData: string, 
  fileType: string, 
  fileName: string,
  subjectId?: string
): Promise<{ success: boolean, exercises: any[], rawText: string, error?: string }> {
  try {
    console.log(`Processing document: ${fileName} (${fileType})`);
    
    // Extract text from the document using Vision API
    const extractedText = await extractTextFromFile(fileData, fileType);
    console.log(`Extracted text length: ${extractedText.length} characters`);
    console.log(`Raw extracted text (first 300 chars): ${extractedText.substring(0, 300)}`);
    
    // Use simple, reliable pattern matching for exercise extraction
    console.log('Using definitive pattern-based extraction');
    const exercises = extractExercisesFromText(extractedText);
    
    console.log(`Definitive extraction found ${exercises.length} exercises`);
    
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
      console.log(`Final Exercise ${idx + 1}: "${ex.question.substring(0, 50)}..."`);
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
