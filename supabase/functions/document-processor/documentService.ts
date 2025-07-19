

import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText } from "./exerciseExtractors.ts";

// Enhanced preprocessing with comprehensive logging
function preserveFractionsPreprocessing(text: string): string {
  console.log('--- PREPROCESSING START ---');
  console.log('Input text length:', text.length);
  console.log('Input text preview (first 300 chars):', text.substring(0, 300));
  
  // STEP 1: Extract and preserve all fractions BEFORE any cleaning
  console.log('STEP 1: Extracting fractions from raw text...');
  const fractionPatterns = [
    { name: 'Parenthesized', pattern: /\(\s*(\d+)\s*\)\s*\/\s*\(\s*(\d+)\s*\)/g },
    { name: 'Simple', pattern: /(\d+)\s*\/\s*(\d+)/g },
    { name: 'LaTeX \\frac', pattern: /\\frac\{(\d+)\}\{(\d+)\}/g },
    { name: 'Mathrm LaTeX', pattern: /\\mathrm\{[^}]*\}\\frac\{(\d+)\}\{(\d+)\}/g }
  ];
  
  const preservedFractions = [];
  
  for (const { name, pattern } of fractionPatterns) {
    console.log(`Testing preprocessing pattern: ${name}`);
    
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    
    console.log(`Preprocessing pattern "${name}" found ${matches.length} matches`);
    
    for (const match of matches) {
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
          console.log(`✅ Preprocessing preserved fraction: ${fraction}`);
        }
      }
    }
  }
  
  console.log(`STEP 1 COMPLETE: Preserved ${preservedFractions.length} fractions:`, preservedFractions);
  
  // STEP 2: Create clean representation preserving all fractions
  if (preservedFractions.length > 0) {
    console.log('STEP 2: Creating clean text with preserved fractions...');
    let cleanedText = '';
    preservedFractions.forEach((fraction, index) => {
      const letter = String.fromCharCode(97 + index); // a, b, c, d, e
      cleanedText += `${letter}. ${fraction} `;
      console.log(`Added to clean text: ${letter}. ${fraction}`);
    });
    
    // Also include some original content for context
    const originalCleaned = text
      .replace(/\\[a-zA-Z]+(?:\{[^}]*\})?/g, '') // Remove LaTeX commands
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const finalText = cleanedText + ' ' + originalCleaned.substring(0, 200);
    console.log('STEP 2 COMPLETE: Final preprocessed text:', finalText);
    console.log('--- PREPROCESSING END ---');
    return finalText;
  }
  
  // STEP 3: If no fractions found, do minimal cleaning
  console.log('STEP 3: No fractions found, applying minimal cleaning...');
  const minimalCleaned = text
    .replace(/\\begin\{[^}]*\}|\\end\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('STEP 3 COMPLETE: Minimal cleaned text:', minimalCleaned.substring(0, 300));
  console.log('--- PREPROCESSING END ---');
  return minimalCleaned;
}

// Enhanced extraction with comprehensive logging
async function optimizedFractionExtraction(fileData: string, fileType: string): Promise<string> {
  console.log('=== OPTIMIZED FRACTION EXTRACTION START ===');
  console.log('File type:', fileType);
  
  try {
    // Use Vision API to get raw text
    console.log('Calling Vision API for text extraction...');
    const extractedText = await extractTextFromFile(fileData, fileType);
    console.log('Vision API extraction completed successfully');
    console.log('Extracted text length:', extractedText.length);
    console.log('Raw extracted text preview (first 500 chars):', extractedText.substring(0, 500));
    
    // Apply fraction-preserving preprocessing
    console.log('Applying fraction-preserving preprocessing...');
    const processedText = preserveFractionsPreprocessing(extractedText);
    console.log('Preprocessing completed');
    console.log('Final processed text length:', processedText.length);
    console.log('Final processed text:', processedText);
    
    console.log('=== OPTIMIZED FRACTION EXTRACTION END ===');
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
    console.log(`=== DOCUMENT PROCESSING START ===`);
    console.log(`Processing document: ${fileName} (${fileType})`);
    
    // Use optimized fraction extraction
    const extractedText = await optimizedFractionExtraction(fileData, fileType);
    console.log(`Text extraction completed. Length: ${extractedText.length} characters`);
    
    // Use the enhanced extraction system that works directly with raw text
    console.log('Starting enhanced exercise extraction...');
    const exercises = extractExercisesFromText(extractedText);
    
    console.log(`=== EXTRACTION RESULTS ===`);
    console.log(`Enhanced extraction found ${exercises.length} exercises`);
    
    // Log each exercise found with detailed info
    exercises.forEach((ex, idx) => {
      console.log(`Exercise ${idx + 1}:`);
      console.log(`  Question: "${ex.question}"`);
      console.log(`  Answer: "${ex.answer}"`);
    });
    
    // Validation: Ensure we have exercises
    if (exercises.length === 0) {
      console.log('⚠️ WARNING: No exercises found - creating fallback exercise');
      if (extractedText.length > 0) {
        exercises.push({
          question: "Document Content Analysis",
          answer: extractedText.length > 300 
            ? extractedText.substring(0, 300) + "..." 
            : extractedText
        });
        console.log('Fallback exercise created');
      }
    }
    
    console.log(`=== DOCUMENT PROCESSING END ===`);
    console.log(`Final result: ${exercises.length} exercises will be returned to frontend`);
    
    return {
      success: true,
      exercises,
      rawText: extractedText
    };
  } catch (error) {
    console.error('=== DOCUMENT PROCESSING ERROR ===');
    console.error('Error in document processing:', error);
    return {
      success: false,
      exercises: [],
      rawText: '',
      error: error.message
    };
  }
}

