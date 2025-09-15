import { supabase } from "@/integrations/supabase/client";
import { detectLanguage } from "@/lib/langDetect";

export interface MathDetectionResult {
  isMath: boolean;
  confidence: number;
  question: string | null;
  hasAnswer: boolean;
  answer: string | null;
  isMultiple: boolean;
  exercises: Array<{
    question: string;
    answer: string | null;
    index: number;
  }>;
}

// Simple cache to avoid redundant AI calls for similar content
const detectionCache = new Map<string, MathDetectionResult>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Fallback regex patterns for obvious math cases (performance optimization)
const OBVIOUS_MATH_PATTERNS = [
  /^\s*\d+\s*[\+\-\*\/•÷×]\s*\d+\s*=?\s*\d*\s*$/,  // Simple arithmetic like "2+3=5"
  /^\s*solve\s*:\s*\d+x\s*[\+\-]\s*\d+\s*=\s*\d+/i,  // Basic equations like "solve: 2x+3=7"
  /^\s*x\s*=\s*\d+\s*$/i,  // Simple solutions like "x=4"
  /^\s*\d+\/\d+\s*=?\s*\d*\.?\d*\s*$/,  // Fractions like "3/4=0.75"
];

/**
 * AI-powered math detection with caching and fallback
 */
export async function detectMathWithAI(
  message: string, 
  selectedModelId: string,
  language: string = 'en'
): Promise<MathDetectionResult> {
  console.log('[aiMathDetection] Processing message:', message.substring(0, 100));
  
  // Check cache first
  const cacheKey = `${message}_${language}`;
  const cached = detectionCache.get(cacheKey);
  if (cached && Date.now() - (cached as any).timestamp < CACHE_EXPIRY) {
    console.log('[aiMathDetection] Cache hit');
    return cached;
  }

  // Quick fallback for obvious math patterns (optimization)
  if (OBVIOUS_MATH_PATTERNS.some(pattern => pattern.test(message.trim()))) {
    console.log('[aiMathDetection] Using regex fallback for obvious math');
    const result = createSimpleMathResult(message.trim());
    detectionCache.set(cacheKey, { ...result, timestamp: Date.now() } as any);
    return result;
  }

  try {
    // Detect language if not provided
    const detectedLang = language || detectLanguage(message);
    const languageInstructions = detectedLang === 'fr' 
      ? 'Respond in French.' 
      : 'Respond in English.';

    const prompt = `${languageInstructions}

Analyze this message and determine if it contains mathematical content (problems, exercises, questions, or equations).

Message: "${message}"

Respond with ONLY a valid JSON object with this exact structure:
{
  "isMath": boolean,
  "confidence": number (0-100),
  "question": "extracted question or null",
  "hasAnswer": boolean,
  "answer": "extracted answer or null", 
  "isMultiple": boolean,
  "exercises": [{"question": "Q1", "answer": "A1 or null", "index": 0}]
}

Guidelines:
- isMath: true if message contains math problems, equations, calculations, or requests to solve something
- confidence: 0-100 confidence level
- question: extract the main math question/problem (clean it up, remove extra text)
- hasAnswer: true if user provided their answer/solution
- answer: extract the user's answer if provided
- isMultiple: true if multiple math problems are present
- exercises: array of individual problems if multiple detected

Examples:
"What is 2+3?" → {"isMath": true, "confidence": 95, "question": "2+3", "hasAnswer": false, "answer": null, "isMultiple": false, "exercises": []}
"Solve 2x+3=7. My answer is x=2" → {"isMath": true, "confidence": 100, "question": "2x+3=7", "hasAnswer": true, "answer": "x=2", "isMultiple": false, "exercises": []}
"Hello how are you?" → {"isMath": false, "confidence": 100, "question": null, "hasAnswer": false, "answer": null, "isMultiple": false, "exercises": []}`;

    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: prompt,
        modelId: selectedModelId,
        history: [],
        isExercise: false
      },
    });

    if (error || !data?.content) {
      console.error('[aiMathDetection] AI detection failed:', error);
      return createFallbackResult(message);
    }

    // Parse AI response
    const result = parseAIResponse(data.content, message);
    
    // Cache the result
    detectionCache.set(cacheKey, { ...result, timestamp: Date.now() } as any);
    
    console.log('[aiMathDetection] AI detection result:', result);
    return result;

  } catch (error) {
    console.error('[aiMathDetection] Error in AI detection:', error);
    return createFallbackResult(message);
  }
}

/**
 * Parse AI response and validate the JSON structure
 */
function parseAIResponse(content: string, originalMessage: string): MathDetectionResult {
  try {
    // Extract JSON from the response (handle cases where AI adds extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (typeof parsed.isMath !== 'boolean') {
      throw new Error('Invalid isMath field');
    }

    return {
      isMath: parsed.isMath,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      question: parsed.question || null,
      hasAnswer: Boolean(parsed.hasAnswer),
      answer: parsed.answer || null,
      isMultiple: Boolean(parsed.isMultiple),
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : []
    };

  } catch (error) {
    console.error('[aiMathDetection] Failed to parse AI response:', error);
    return createFallbackResult(originalMessage);
  }
}

/**
 * Create result for obvious math patterns using regex
 */
function createSimpleMathResult(message: string): MathDetectionResult {
  const equationMatch = message.match(/^(.+?)(=\s*(.+))?$/);
  const hasEquals = message.includes('=');
  
  if (hasEquals && equationMatch) {
    const [, question, , answer] = equationMatch;
    return {
      isMath: true,
      confidence: 95,
      question: question?.trim() || message,
      hasAnswer: Boolean(answer?.trim()),
      answer: answer?.trim() || null,
      isMultiple: false,
      exercises: []
    };
  }

  return {
    isMath: true,
    confidence: 85,
    question: message,
    hasAnswer: false,
    answer: null,
    isMultiple: false,
    exercises: []
  };
}

/**
 * Fallback result when AI detection fails
 */
function createFallbackResult(message: string): MathDetectionResult {
  // Use basic patterns as fallback
  const hasObviousMath = OBVIOUS_MATH_PATTERNS.some(pattern => pattern.test(message));
  
  if (hasObviousMath) {
    return createSimpleMathResult(message);
  }

  // Check for math keywords as last resort
  const mathKeywords = ['solve', 'calculate', 'equation', 'math', 'algebra', '+', '-', '*', '/', '='];
  const hasMathKeywords = mathKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );

  return {
    isMath: hasMathKeywords,
    confidence: hasMathKeywords ? 60 : 10,
    question: hasMathKeywords ? message : null,
    hasAnswer: false,
    answer: null,
    isMultiple: false,
    exercises: []
  };
}

/**
 * Backward compatibility function to replace detectHomeworkInMessage
 */
export async function detectHomeworkWithAI(
  message: string,
  selectedModelId: string,
  language: string = 'en'
): Promise<boolean> {
  const result = await detectMathWithAI(message, selectedModelId, language);
  return result.isMath && result.confidence > 50;
}