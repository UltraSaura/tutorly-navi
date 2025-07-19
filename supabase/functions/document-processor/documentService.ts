import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText } from "./exerciseExtractors.ts";

// Enhanced text preprocessing function that preserves multiple fractions
function preprocessExtractedText(text: string): string {
  console.log('Starting enhanced text preprocessing');
  console.log('Raw text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // STEP 1: Extract and preserve all fractions BEFORE cleaning
  const fractionPatterns = [
    /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g, // (30)/(63)
    /(\d+)\s*\/\s*(\d+)/g, // 30/63
    /\\frac\{(\d+)\}\{(\d+)\}/g, // \frac{30}{63}
    /(\d+)\s*÷\s*(\d+)/g, // 30÷63
  ];
  
  const preservedFractions = [];
  for (const pattern of fractionPatterns) {
    let match;
    const tempPattern = new RegExp(pattern.source, pattern.flags);
    while ((match = tempPattern.exec(text)) !== null) {
      if (match[1] && match[2]) {
        const fraction = `${match[1]}/${match[2]}`;
        if (!preservedFractions.includes(fraction)) {
          preservedFractions.push(fraction);
          console.log(`✅ Preserved fraction: ${fraction}`);
        }
      }
    }
  }
  
  console.log(`Total fractions preserved: ${preservedFractions.length}`, preservedFractions);
  
  // STEP 2: Clean the text but keep fraction structure
  let cleanedText = text
    // Remove LaTeX artifacts but preserve fraction content
    .replace(/\\\([^)]*\\\)/g, '')
    .replace(/\$\$[^$]*\$\$/g, '')
    .replace(/\\[a-zA-Z]+(?:\{[^}]*\})?/g, '') // Remove LaTeX commands but keep content
    .replace(/[{}]/g, '')
    
    // Fix common OCR mistakes in French
    .replace(/([a-zA-Z])\s*,\s*/g, '$1. ')  // Fix a, -> a.
    .replace(/([a-zA-Z])\s*\.\s*/g, '$1. ') // Normalize spacing around periods
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2') // Normalize fractions
    
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  // STEP 3: If preprocessing removed fractions, reconstruct them
  if (preservedFractions.length > 0) {
    // Check if fractions are still in cleaned text
    const remainingFractions = [];
    for (const fraction of preservedFractions) {
      if (cleanedText.includes(fraction)) {
        remainingFractions.push(fraction);
      }
    }
    
    console.log(`Fractions remaining after cleaning: ${remainingFractions.length}`, remainingFractions);
    
    // If we lost fractions during cleaning, reconstruct the content
    if (remainingFractions.length < preservedFractions.length) {
      console.log('⚠️ Fractions were lost during preprocessing, reconstructing...');
      
      // Create a structured representation with all fractions
      let reconstructedText = '';
      preservedFractions.forEach((fraction, index) => {
        const letter = String.fromCharCode(97 + index); // a, b, c, d, e
        reconstructedText += `${letter}. ${fraction} `;
      });
      
      // Combine original cleaned text with reconstructed fractions
      cleanedText = reconstructedText + ' ' + cleanedText;
      console.log('✅ Reconstructed text with all fractions:', reconstructedText);
    }
  }
  
  console.log('Final cleaned text length:', cleanedText.length);
  console.log('Final cleaned text (first 300 chars):', cleanedText.substring(0, 300));
  
  return cleanedText;
}

// Optimized single-pass extraction with enhanced multi-fraction support
async function optimizedExtraction(fileData: string, fileType: string): Promise<string> {
  console.log('Starting optimized extraction with multi-fraction support');
  
  try {
    // Use Vision API with improved prompt
    const extractedText = await extractTextFromFile(fileData, fileType);
    console.log('Vision API extraction completed, text length:', extractedText.length);
    
    // Apply enhanced preprocessing that preserves multiple fractions
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
    
    // Use optimized single-pass extraction with multi-fraction support
    const extractedText = await optimizedExtraction(fileData, fileType);
    console.log(`Final extracted text length: ${extractedText.length} characters`);
    console.log(`Final extracted text (first 500 chars): ${extractedText.substring(0, 500)}`);
    
    // Log the full text for debugging (in chunks)
    const textChunks = extractedText.match(/.{1,200}/g) || [];
    textChunks.forEach((chunk, index) => {
      console.log(`Text chunk ${index + 1}:`, chunk);
    });
    
    // Use the enhanced tiered extraction system
    console.log('Using enhanced tiered extraction system for multi-exercise detection');
    const exercises = extractExercisesFromText(extractedText);
    
    console.log(`Enhanced tiered extraction found ${exercises.length} exercises`);
    
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
