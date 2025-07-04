
import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText, extractExercisesWithAI } from "./exerciseExtractors.ts";

export async function processDocument(
  fileData: string, 
  fileType: string, 
  fileName: string,
  subjectId?: string
): Promise<{ success: boolean, exercises: any[], rawText: string, error?: string }> {
  try {
    // Extract text from the document
    const extractedText = await extractTextFromFile(fileData, fileType);
    console.log(`Extracted text length: ${extractedText.length} characters`);
    
    console.log(`Raw extracted text (first 500 chars): ${extractedText.substring(0, 500)}`);
    
    // Try AI extraction first for better results
    let exercises = [];
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openAIApiKey && extractedText.length > 20) {
      console.log('Attempting AI-first extraction approach');
      const aiExercises = await extractExercisesWithAI(extractedText, subjectId);
      if (aiExercises.length > 0) {
        console.log(`AI extraction found ${aiExercises.length} exercises`);
        exercises = aiExercises;
      }
    }
    
    // Fallback to pattern matching if AI didn't find enough exercises
    if (exercises.length < 2) {
      console.log(`AI found ${exercises.length} exercises, trying pattern matching as backup`);
      const patternExercises = extractExercisesFromText(extractedText);
      
      if (patternExercises.length > exercises.length) {
        console.log(`Pattern matching found ${patternExercises.length} exercises vs ${exercises.length} from AI. Using pattern results.`);
        exercises = patternExercises;
      } else if (exercises.length === 0) {
        exercises = patternExercises;
      }
    }
    
    // If still no exercises but have text, create a generic one
    if (exercises.length === 0 && extractedText.length > 0) {
      exercises.push({
        question: "Document Content Analysis",
        answer: extractedText.length > 300 
          ? extractedText.substring(0, 300) + "..." 
          : extractedText
      });
    }
    
    console.log(`Extracted ${exercises.length} exercises`);
    
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
