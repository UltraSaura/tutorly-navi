import { extractTextFromFile } from "./extractors.ts";
import { extractExercisesFromText } from "./exerciseExtractors.ts";
import {
  extractJustificationWithMistralVision,
  extractWithMistralVision,
  type JustificationVisionResult,
} from "./extractors/mistral.ts";

// Minimal text preprocessing that preserves exercise structure
function minimalPreprocessing(text: string): string {
  console.log('=== MINIMAL PREPROCESSING ===');
  console.log('Raw text length:', text.length);
  console.log('Raw text (first 500 chars):', text.substring(0, 500));
  
  // Only remove non-essential LaTeX commands while preserving important math structure
  let cleanedText = text
    // Preserve key LaTeX commands like \frac and \sqrt; remove others
    .replace(/\\(?!frac|sqrt)[a-zA-Z]+/g, ' ')
    // Normalize multiple spaces on a single line but PRESERVE line breaks
    .replace(/[^\S\n]+/g, ' ')
    // Collapse 3+ consecutive newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  console.log('Minimally processed text length:', cleanedText.length);
  console.log('Minimally processed text (first 500 chars):', cleanedText.substring(0, 500));
  console.log('=== MINIMAL PREPROCESSING COMPLETE ===');
  
  return cleanedText;
}

// Enhanced extraction with better structure preservation and fallback
async function enhancedExtraction(fileData: string, fileType: string): Promise<string> {
  console.log('Starting enhanced extraction with robust multi-exercise support');
  
  try {
    // Extract raw text from file
    const rawText = await extractTextFromFile(fileData, fileType);
    console.log('Raw extraction completed, text length:', rawText.length);
    console.log('Raw text sample:', rawText.substring(0, 500));
    
    // Apply minimal preprocessing to preserve exercise structure
    const processedText = minimalPreprocessing(rawText);
    
    return processedText;
  } catch (error) {
    console.error('Enhanced extraction failed:', error);
    throw error;
  }
}

function parseLocaleNumber(value: string): number {
  return Number(value.replace(/\s/g, '').replace(',', '.'));
}

function extractNumbers(text: string): number[] {
  return Array.from(text.matchAll(/-?\d+(?:[,.]\d+)?/g))
    .map(match => parseLocaleNumber(match[0]))
    .filter(Number.isFinite);
}

function nearlyEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

function addArithmeticWarnings(result: JustificationVisionResult): JustificationVisionResult {
  const warnings = new Set(result.warnings || []);
  const text = result.normalizedText || result.rawText || '';

  for (const match of text.matchAll(/((?:-?\d+(?:[,.]\d+)?\s*\+\s*)+-?\d+(?:[,.]\d+)?)\s*(?:=|:)\s*(-?\d+(?:[,.]\d+)?)/g)) {
    const addends = extractNumbers(match[1]);
    const expected = parseLocaleNumber(match[2]);
    const actual = addends.reduce((sum, value) => sum + value, 0);
    if (addends.length >= 2 && Number.isFinite(expected) && !nearlyEqual(actual, expected)) {
      warnings.add(`Arithmetic appears inconsistent: ${match[1].trim()} equals ${actual}, not ${match[2]}.`);
    }
  }

  if (/\?/.test(text)) {
    warnings.add('Some digits are uncertain and need review.');
  }

  return {
    ...result,
    warnings: Array.from(warnings),
  };
}

async function processJustificationDocument(
  fileData: string,
  fileType: string,
  context: { rowPrompt?: string; problemContext?: string } = {}
): Promise<{ success: boolean; exercises: any[]; rawText: string; normalizedText?: string; confidence?: number; warnings?: string[]; error?: string }> {
  try {
    console.log('=== PROCESSING JUSTIFICATION IMAGE ===');
    const visionResult = fileType.startsWith('image/')
      ? await extractJustificationWithMistralVision(fileData, fileType, context)
      : null;

    if (visionResult?.rawText?.trim()) {
      const checked = addArithmeticWarnings(visionResult);
      return {
        success: true,
        exercises: [],
        rawText: checked.normalizedText || checked.rawText,
        normalizedText: checked.normalizedText,
        confidence: checked.confidence,
        warnings: checked.warnings,
      };
    }

    const rawText = await enhancedExtraction(fileData, fileType);
    const checked = addArithmeticWarnings({
      rawText,
      normalizedText: rawText,
      confidence: 0.5,
      warnings: ['Generic OCR fallback was used for this handwritten justification.'],
    });

    return {
      success: true,
      exercises: [],
      rawText: checked.normalizedText || checked.rawText,
      normalizedText: checked.normalizedText,
      confidence: checked.confidence,
      warnings: checked.warnings,
    };
  } catch (error) {
    return {
      success: false,
      exercises: [],
      rawText: '',
      error: (error as Error).message || 'Justification OCR failed',
    };
  }
}

export async function processDocument(
  fileData: string, 
  fileType: string, 
  fileName: string,
  subjectId?: string,
  options: { mode?: string; rowPrompt?: string; problemContext?: string } = {}
): Promise<{ success: boolean, exercises: any[], rawText: string, error?: string }> {
  try {
    console.log(`=== PROCESSING DOCUMENT: ${fileName} (${fileType}) ===`);

    if (options.mode === 'justification') {
      return await processJustificationDocument(fileData, fileType, {
        rowPrompt: options.rowPrompt,
        problemContext: options.problemContext,
      });
    }
    
    // PHASE 0: Try Mistral Vision (LLM-based) for images — much better for handwriting
    const isImage = fileType.startsWith('image/');
    let exercises: any[] = [];
    let extractedText = '';
    
    if (isImage) {
      console.log('📸 Image detected — trying Mistral Vision first');
      const visionExercises = await extractWithMistralVision(fileData, fileType);
      if (visionExercises && visionExercises.length > 0) {
        console.log(`✅ Mistral Vision extracted ${visionExercises.length} exercises directly`);
        exercises = visionExercises;
        extractedText = visionExercises
          .map((ex, index) => `${index + 1}) ${ex.question}${ex.answer ? ` = ${ex.answer}` : ''}`)
          .join('\n');
      } else {
        console.log('⚠️ Mistral Vision returned no exercises, falling back to OCR pipeline');
      }
    }
    
    // PHASE 1: Fall back to OCR + regex pipeline if vision didn't produce results
    if (exercises.length === 0) {
      extractedText = await enhancedExtraction(fileData, fileType);
      console.log(`Enhanced extraction result - text length: ${extractedText.length} characters`);
      
      const textChunks = extractedText.match(/.{1,300}/g) || [];
      textChunks.forEach((chunk, index) => {
        console.log(`Text chunk ${index + 1}:`, chunk);
      });
      
      console.log('=== STARTING ENHANCED MULTI-EXERCISE EXTRACTION ===');
      exercises = extractExercisesFromText(extractedText);
    }
    
    console.log(`=== ENHANCED EXTRACTION COMPLETE: Found ${exercises.length} exercises ===`);
    
    // Log each exercise found
    exercises.forEach((ex, idx) => {
      console.log(`Exercise ${idx + 1}: Question="${ex.question}" Answer="${ex.answer}"`);
    });
    
    // Fallback only if truly nothing was found
    if (exercises.length === 0 && extractedText.length > 0) {
      console.log('No exercises detected - creating fallback');
      exercises.push({
        question: "Document Analysis",
        answer: extractedText.length > 300 
          ? extractedText.substring(0, 300) + "..." 
          : extractedText
      });
    }
    
    console.log(`=== FINAL ENHANCED RESULT: ${exercises.length} exercises extracted ===`);
    
    return {
      success: true,
      exercises,
      rawText: extractedText
    };
  } catch (error) {
    console.error('=== ERROR IN ENHANCED DOCUMENT PROCESSING ===', error);
    return {
      success: false,
      exercises: [],
      rawText: '',
      error: (error as Error).message || 'Processing failed'
    };
  }
}
