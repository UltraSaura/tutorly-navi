
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
    
    // Extract exercises from the text using pattern matching
    let exercises = extractExercisesFromText(extractedText);
    
    // If pattern matching found fewer than 5 exercises and the text is substantial,
    // try using AI to extract exercises (or supplement existing ones)
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (exercises.length < 5 && extractedText.length > 50 && openAIApiKey) {
      console.log(`Pattern matching found ${exercises.length} exercises. Using AI to extract all exercises from text`);
      const aiExercises = await extractExercisesWithAI(extractedText, subjectId);
      
      // Use AI extraction if it found more exercises than pattern matching
      if (aiExercises.length > exercises.length) {
        console.log(`AI extraction found ${aiExercises.length} exercises vs ${exercises.length} from patterns. Using AI results.`);
        exercises = aiExercises;
      } else if (aiExercises.length > 0 && exercises.length === 0) {
        exercises = aiExercises;
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
