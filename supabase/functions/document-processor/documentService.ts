
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
    
    // If pattern matching found fewer than 2 exercises and the text is substantial,
    // try using AI to extract exercises
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (exercises.length < 2 && extractedText.length > 50 && openAIApiKey) {
      console.log("Using AI to extract exercises from unstructured text");
      const aiExercises = await extractExercisesWithAI(extractedText, subjectId);
      
      if (aiExercises.length > 0) {
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
