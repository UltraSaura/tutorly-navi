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

// Enhanced math detection patterns based on educational action verbs
const MATH_ACTION_VERBS = {
  en: ['calculate', 'solve', 'simplify', 'evaluate', 'determine', 'prove', 'show that', 'factor', 'expand', 'graph', 'find', 'convert'],
  fr: ['calculer', 'résoudre', 'simplifier', 'évaluer', 'déterminer', 'démontrer', 'prouver', 'montrer que', 'factoriser', 'développer', 'tracer', 'trouver', 'convertir']
};

// French mathematical operation words
const FRENCH_MATH_OPERATIONS = {
  'fois': '×',         // multiplication: "3 fois 2"
  'plus': '+',         // addition: "3 plus 2"
  'moins': '-',        // subtraction: "5 moins 3"
  'divisé par': '÷',   // division: "8 divisé par 2"
  'font': '=',         // equals: "font 6"
  'égal': '=',         // equals: "égal 6"
  'égale': '=',        // equals: "égale 6"
  'est': '=',          // is/equals: "est 6"
};

// Enhanced patterns for obvious math cases (performance optimization)
const OBVIOUS_MATH_PATTERNS = [
  /^\s*\d+\s*[\+\-\*\/•÷×]\s*\d+\s*=?\s*\d*\s*$/,  // Simple arithmetic like "2+3=5"
  /^\s*\d+\s*fois\s*\d+\s*(font|égal|égale|est)?\s*\d*\s*$/i,  // French multiplication like "3 fois 2 font 6"
  /^\s*\d+\s*plus\s*\d+\s*(font|égal|égale|est)?\s*\d*\s*$/i,  // French addition like "3 plus 2 font 5"
  /^\s*\d+\s*moins\s*\d+\s*(font|égal|égale|est)?\s*\d*\s*$/i,  // French subtraction like "5 moins 3 font 2"
  /^\s*\d+\s*divisé\s+par\s*\d+\s*(font|égal|égale|est)?\s*\d*\s*$/i,  // French division like "8 divisé par 2 font 4"
  /^\s*solve\s*:\s*\d+x\s*[\+\-]\s*\d+\s*=\s*\d+/i,  // Basic equations like "solve: 2x+3=7"
  /^\s*x\s*=\s*\d+\s*$/i,  // Simple solutions like "x=4"
  /^\s*\d+\/\d+\s*=?\s*\d*\.?\d*\s*$/,  // Fractions like "3/4=0.75"
];

// Debug function for testing patterns
function testFrenchPattern(message: string) {
  console.log('[Pattern Test] Testing message:', message);
  
  const patterns = OBVIOUS_MATH_PATTERNS;
  patterns.forEach((pattern, index) => {
    const match = pattern.test(message);
    console.log(`[Pattern Test] Pattern ${index}:`, pattern, 'Match:', match);
  });
  
  // Test the specific French math regex
  const frenchRegex = /^\s*\d+\s*fois\s*\d+\s*(font|égal|égale|est)?\s*\d*\s*$/i;
  const frenchMatch = frenchRegex.test(message);
  console.log('[Pattern Test] French regex match:', frenchMatch);
  
  // Test containsMathSymbols
  const hasSymbols = containsMathSymbols(message);
  console.log('[Pattern Test] Has math symbols:', hasSymbols);
}

// Patterns for math action phrases
const MATH_ACTION_PATTERNS = [
  /^(calculate|solve|simplify|evaluate|determine|prove|show that|factor|expand|graph|find|convert)\s+/i,
  /^(calculer|calculez|résoudre|résolvez|simplifier|simplifiez|évaluer|évaluez|déterminer|déterminez|démontrer|démontrez|prouver|prouvez|montrer que|factoriser|factorisez|développer|développez|tracer|tracez|trouver|trouvez|convertir|convertissez)\s+/i,
  /(what is|qu'est-ce que|combien|how much)/i,
  /(equation|équation|expression|fonction|function)/i,
  /(\d+[x-z]|\d+\^|\d+\/\d+|√|∫|∑|∆)/i,  // Mathematical symbols and variables
  /\d+\s*(fois|plus|moins|divisé\s+par)\s*\d+/i,  // French mathematical operations
  /(font|égal|égale|est)\s*\d+/i  // French equals expressions
];

/**
 * AI-powered math detection with caching and fallback
 */
export async function detectMathWithAI(
  message: string, 
  selectedModelId: string,
  language: string = 'en'
): Promise<MathDetectionResult> {
  console.log('[MathDetection] Starting detection for:', { message, language });
  
  // Add debug test for French patterns
  if (message.includes('fois') || message.includes('font')) {
    testFrenchPattern(message);
  }
  
  // Check cache first
  const cacheKey = `${message}_${language}`;
  const cached = detectionCache.get(cacheKey);
  if (cached && Date.now() - (cached as any).timestamp < CACHE_EXPIRY) {
    console.log('[MathDetection] Cache hit');
    return cached;
  }

  // Smart pre-filtering: Check for obvious math patterns or action verbs
  const hasObviousPattern = OBVIOUS_MATH_PATTERNS.some(pattern => pattern.test(message.trim()));
  const hasActionPattern = MATH_ACTION_PATTERNS.some(pattern => pattern.test(message.trim()));
  const hasActionVerb = MATH_ACTION_VERBS.en.some(verb => 
    message.toLowerCase().includes(verb)) || MATH_ACTION_VERBS.fr.some(verb => 
    message.toLowerCase().includes(verb));

  console.log('[MathDetection] Pattern checks:', { 
    hasObviousPattern, 
    hasActionPattern, 
    hasActionVerb,
    message 
  });

  // Quick fallback for obvious math patterns (optimization)
  if (hasObviousPattern) {
    console.log('[MathDetection] Using regex fallback for obvious math pattern');
    const result = createSimpleMathResult(message.trim());
    console.log('[MathDetection] Simple math result:', result);
    detectionCache.set(cacheKey, { ...result, timestamp: Date.now() } as any);
    return result;
  }

  // Skip AI call for obviously non-math content (performance optimization)
  if (!hasActionPattern && !hasActionVerb && !containsMathSymbols(message)) {
    console.log('[aiMathDetection] Skipping AI call - no math indicators found');
    const result = createFallbackResult(message);
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

You are an expert math education assistant. Analyze this message and determine if it contains mathematical content.

CONTEXT: Common math action verbs include: Calculate, Solve, Simplify, Evaluate, Determine, Prove, Show that, Factor, Expand, Graph, Find, Convert (and their French equivalents: Calculer, Résoudre, Simplifier, Évaluer, Déterminer, Prouver, Montrer que, Factoriser, Développer, Tracer, Trouver, Convertir).

Message: "${message}"

INSTRUCTIONS:
Look for:
- Math problems, equations, calculations, or requests to solve something
- Educational phrases like "Calculate the area", "Solve for x", "Find the value", "Simplify the expression"
- Mathematical symbols, variables, numbers with operations
- Word problems involving quantities, measurements, or mathematical relationships

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

EXAMPLES:
✅ Math content:
- "Calculate the area of a rectangle with width 5 and height 3" → {"isMath": true, "confidence": 100, "question": "Calculate the area of a rectangle with width 5 and height 3", "hasAnswer": false, "answer": null, "isMultiple": false, "exercises": []}
- "Solve for x: 2x+3=7. My answer is x=2" → {"isMath": true, "confidence": 100, "question": "2x+3=7", "hasAnswer": true, "answer": "x=2", "isMultiple": false, "exercises": []}
- "What is 15% of 80?" → {"isMath": true, "confidence": 95, "question": "What is 15% of 80?", "hasAnswer": false, "answer": null, "isMultiple": false, "exercises": []}
- "Find the slope of the line passing through (2,3) and (4,7)" → {"isMath": true, "confidence": 100, "question": "Find the slope of the line passing through (2,3) and (4,7)", "hasAnswer": false, "answer": null, "isMultiple": false, "exercises": []}

❌ Non-math content:
- "Hello, how are you?" → {"isMath": false, "confidence": 100, "question": null, "hasAnswer": false, "answer": null, "isMultiple": false, "exercises": []}
- "I need help with my homework" → {"isMath": false, "confidence": 90, "question": null, "hasAnswer": false, "answer": null, "isMultiple": false, "exercises": []}`;

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
  console.log('[MathDetection] Creating simple math result for:', message);
  
  // Handle French mathematical expressions first
  const frenchMathMatch = message.match(/^(.+?)(font|égal|égale|est)\s*(.+)?$/i);
  if (frenchMathMatch) {
    console.log('[MathDetection] French math match found:', frenchMathMatch);
    const [, question, , answer] = frenchMathMatch;
    const result = {
      isMath: true,
      confidence: 95,
      question: question?.trim() || message,
      hasAnswer: Boolean(answer?.trim()),
      answer: answer?.trim() || null,
      isMultiple: false,
      exercises: []
    };
    console.log('[MathDetection] French result:', result);
    return result;
  }

  // Handle English mathematical expressions with equals
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
 * Check if message contains mathematical symbols or patterns
 */
function containsMathSymbols(message: string): boolean {
  console.log('[MathDetection] Checking math symbols for:', message);
  
  const mathSymbols = [
    /\d+\s*[\+\-\*\/•÷×=]\s*\d+/,  // Mathematical operations
    /[xyz]\s*=\s*\d+/i,             // Variable assignments
    /\d+x\s*[\+\-]/i,               // Linear equations
    /√|\^|\(\s*\d+\s*,\s*\d+\s*\)/, // Square roots, powers, coordinates
    /\d+\/\d+/,                     // Fractions
    /\d+%/,                         // Percentages
    /\d+°/,                         // Degrees
    /sin|cos|tan|log/i,             // Trigonometric/logarithmic functions
    /\d+\s*(fois|plus|moins|divisé\s+par)\s*\d+/i,  // French mathematical operations
    /(font|égal|égale|est)\s*\d+/i  // French equals expressions
  ];
  
  const result = mathSymbols.some(pattern => pattern.test(message));
  console.log('[MathDetection] Math symbols check result:', { message, result });
  return result;
}

/**
 * Enhanced fallback result using comprehensive patterns
 */
function createFallbackResult(message: string): MathDetectionResult {
  // Use basic patterns as fallback
  const hasObviousMath = OBVIOUS_MATH_PATTERNS.some(pattern => pattern.test(message));
  
  if (hasObviousMath) {
    return createSimpleMathResult(message);
  }

  // Enhanced keyword detection using action verbs from Excel data
  const allMathKeywords = [
    ...MATH_ACTION_VERBS.en,
    ...MATH_ACTION_VERBS.fr,
    'equation', 'expression', 'function', 'formula', 'theorem',
    'algebra', 'geometry', 'calculus', 'trigonometry',
    'équation', 'expression', 'fonction', 'formule', 'théorème',
    'algèbre', 'géométrie', 'calcul', 'trigonométrie',
    // French mathematical operations
    'fois', 'plus', 'moins', 'divisé par', 'font', 'égal', 'égale', 'est',
    '+', '-', '*', '/', '=', '%', '°'
  ];
  
  const lowerMessage = message.toLowerCase();
  const hasMathKeywords = allMathKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  );

  const hasMathSymbols = containsMathSymbols(message);

  const isMath = hasMathKeywords || hasMathSymbols;
  const confidence = hasMathSymbols ? 75 : (hasMathKeywords ? 60 : 10);

  return {
    isMath,
    confidence,
    question: isMath ? message : null,
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