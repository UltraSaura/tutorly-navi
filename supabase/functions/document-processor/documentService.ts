
import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText } from "./exerciseExtractors.ts";

// Simplified preprocessing that preserves ALL fraction content
function preserveFractionsPreprocessing(text: string): string {
  console.log('Starting fraction-preserving preprocessing');
  console.log('Raw text length:', text.length);
  console.log('Raw text preview:', text.substring(0, 300));
  
  // STEP 1: Extract and preserve all fractions BEFORE any cleaning
  const fractionPatterns = [
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // (30)/(63)
    /(\d+)\s*\/\s*(\d+)/g, // 30/63
    /\\frac\{(\d+)\}\{(\d+)\}/g, // \frac{30}{63}
    /\\mathrm\{[^}]*\}\\frac\{(\d+)\}\{(\d+)\}/g, // \mathrm{a~}\frac{30}{63}
  ];
  
  const preservedFractions = [];
  for (const pattern of fractionPatterns) {
    let match;
    const tempPattern = new RegExp(pattern.source, pattern.flags);
    while ((match = tempPattern.exec(text)) !== null) {
      let numerator, denominator;
      
      // Handle different capture group positions
      if (match[1] && match[2]) {
        numerator = match[1];
        denominator = match[2];
      } else if (match[3] && match[4]) {
        numerator = match[3];
        denominator = match[4];
      }
      
      if (numerator && denominator) {
        const fraction = `${numerator}/${denominator}`;
        if (!preservedFractions.includes(fraction)) {
          preservedFractions.push(fraction);
          console.log(`✅ Preserved fraction: ${fraction}`);
        }
      }
    }
  }
  
  console.log(`Total fractions preserved: ${preservedFractions.length}`, preservedFractions);
  
  // STEP 2: If we have fractions, create a clean representation
  if (preservedFractions.length > 0) {
    let cleanedText = '';
    preservedFractions.forEach((fraction, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c, d, e
      cleanedText += `${letter}. ${fraction} `;
    });
    
    // Also include some original content for context
    const originalCleaned = text
      .replace(/\\[a-zA-Z]+(?:\{[^}]*\})?/g, '') // Remove LaTeX commands
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const finalText = cleanedText + ' ' + originalCleaned;
    console.log('Final text with preserved fractions:', finalText.substring(0, 300));
    return finalText;
  }
  
  // STEP 3: If no fractions found, do minimal cleaning
  const minimalCleaned = text
    .replace(/\\begin\{[^}]*\}|\\end\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('Minimal cleaned text:', minimalCleaned.substring(0, 300));
  return minimalCleaned;
}

// Optimized extraction that preserves fractions
async function optimizedFractionExtraction(fileData: string, fileType: string): Promise<string> {
  console.log('Starting optimized fraction extraction');
  
  try {
    // Use Vision API to get raw text
    const extractedText = await extractTextFromFile(fileData, fileType);
    console.log('Vision API extraction completed, text length:', extractedText.length);
    console.log('Raw extracted text preview:', extractedText.substring(0, 500));
    
    // Apply fraction-preserving preprocessing
    const processedText = preserveFractionsPreprocessing(extractedText);
    
    return processedText;
  } catch (error) {
    console.error('Optimized fraction extraction failed:', error);
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
    
    // Use optimized fraction extraction
    const extractedText = await optimizedFractionExtraction(fileData, fileType);
    console.log(`Final extracted text length: ${extractedText.length} characters`);
    console.log(`Final extracted text preview: ${extractedText.substring(0, 500)}`);
    
    // Use the enhanced extraction system that works directly with raw text
    console.log('Using enhanced extraction system for multi-exercise detection');
    const exercises = extractExercisesFromText(extractedText);
    
    console.log(`Enhanced extraction found ${exercises.length} exercises`);
    
    // Log each exercise found
    exercises.forEach((ex, idx) => {
      console.log(`Exercise ${idx + 1}: "${ex.question}"`);
    });
    
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
