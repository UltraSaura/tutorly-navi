import { supabase } from "@/integrations/supabase/client";
import { detectLanguage } from "@/lib/langDetect";

export interface MathDetectionResult {
  isMath: boolean;
  confidence: number;
  question: string | null;
  hasAnswer: boolean;
  answer: string | null;
  isMultiple: boolean;
  isQuestion: boolean;
  exercises: Array<{
    question: string;
    answer: string | null;
    index: number;
  }>;
}

// Simple cache to avoid redundant AI calls for similar content
const detectionCache = new Map<string, MathDetectionResult>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Math action verbs - now loaded dynamically from translation files
let MATH_ACTION_VERBS: Record<string, string[]> = {
  en: [],
  fr: []
};

// Initialize math action verbs
const initializeMathVerbs = async () => {
  try {
    const [enMath, frMath] = await Promise.all([
      import('@/locales/en/math.json'),
      import('@/locales/fr/math.json')
    ]);
    
    MATH_ACTION_VERBS = {
      en: enMath.default.actionVerbs,
      fr: frMath.default.actionVerbs
    };
  } catch (error) {
    console.error('Failed to load math action verbs:', error);
    // Fallback to hardcoded values
    MATH_ACTION_VERBS = {
      en: ['calculate', 'solve', 'simplify', 'evaluate', 'determine', 'prove', 'show that', 'factor', 'expand', 'graph', 'find', 'convert', 'decompose', 'how do', 'what is', 'how to calculate', 'how to solve', 'what does', 'explain how', 'show me how'],
      fr: ['calculer', 'résoudre', 'simplifier', 'évaluer', 'déterminer', 'démontrer', 'prouver', 'montrer que', 'factoriser', 'développer', 'tracer', 'trouver', 'convertir', 'décomposer', 'decompose', 'comment', 'qu\'est-ce que', 'comment calculer', 'comment résoudre', 'que fait', 'expliquer comment', 'montrez-moi comment']
    };
  }
};

// Get math action verbs for the current language - refresh verbs when language changes
export const refreshMathActionVerbs = async (language: string = 'en') => {
  try {
    const mathTranslations = await import(`@/locales/${language}/math.json`);
    MATH_ACTION_VERBS[language] = mathTranslations.default.actionVerbs || [];
  } catch (error) {
    console.error(`Failed to refresh math action verbs for ${language}:`, error);
    // Keep existing verbs or set fallback
    if (!MATH_ACTION_VERBS[language]) {
      MATH_ACTION_VERBS[language] = language === 'fr' 
        ? ['calculer', 'résoudre', 'simplifier'] 
        : ['calculate', 'solve', 'simplify'];
    }
  }
};

// English number words (one through twenty, plus common larger numbers)
const ENGLISH_NUMBERS = 'zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred';

// English operation words
const ENGLISH_OPERATIONS = 'times|multiplied\\s+by|plus|added\\s+to|minus|subtract|subtracted\\s+from|divided\\s+by|equals?|is|makes|gives';

// French number words
const FRENCH_NUMBERS = 'zéro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante|soixante|soixante-dix|quatre-vingts|quatre-vingt-dix|cent';

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
  
  // English written-out math patterns
  new RegExp(`^\\s*(${ENGLISH_NUMBERS})\\s+(${ENGLISH_OPERATIONS})\\s+(${ENGLISH_NUMBERS})\\s*(${ENGLISH_OPERATIONS})?\\s*(${ENGLISH_NUMBERS})?\\s*$`, 'i'), // "two times five equals ten"
  new RegExp(`^\\s*(what\\s+is\\s+)?(${ENGLISH_NUMBERS})\\s+(${ENGLISH_OPERATIONS})\\s+(${ENGLISH_NUMBERS})\\s*\\??\\s*$`, 'i'), // "what is two times five?"
  
  // French written-out math patterns
  new RegExp(`^\\s*(${FRENCH_NUMBERS})\\s+(fois|plus|moins|divisé\\s+par)\\s+(${FRENCH_NUMBERS})\\s*(font|égal|égale|est)?\\s*(${FRENCH_NUMBERS})?\\s*$`, 'i'), // "deux fois cinq font dix"
  new RegExp(`^\\s*(combien\\s+font\\s+)?(${FRENCH_NUMBERS})\\s+(fois|plus|moins|divisé\\s+par)\\s+(${FRENCH_NUMBERS})\\s*\\??\\s*$`, 'i'), // "combien font deux fois cinq?"
  
  // Mixed format patterns (numbers + written operations)
  /^\s*\d+\s+(times|plus|minus|divided\s+by)\s+\d+\s*(equals?|is|=)?\s*\d*\s*$/i,  // "2 times 5 equals 10"
  /^\s*\d+\s+(fois|plus|moins|divisé\s+par)\s+\d+\s*(font|égal|égale|est|=)?\s*\d*\s*$/i,  // "2 fois 5 font 10"
  
  // Natural language questions
  /^\s*(what\s+is|how\s+much\s+is)\s+\d+\s*[\+\-\*\/•÷×]\s*\d+\s*\??/i,  // "what is 2+3?"
  /^\s*(combien\s+font)\s+\d+\s*[\+\-\*\/•÷×]\s*\d+\s*\??/i,  // "combien font 2+3?"
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
  /^(calculate|solve|simplify|evaluate|determine|prove|show that|factor|expand|graph|find|convert|decompose)\s+/i,
  /^(calculer|calculez|résoudre|résolvez|simplifier|simplifiez|évaluer|évaluez|déterminer|déterminez|démontrer|démontrez|prouver|prouvez|montrer que|factoriser|factorisez|développer|développez|tracer|tracez|trouver|trouvez|convertir|convertissez|décomposer|décomposez|decompose)\s+/i,
  /(what is|qu'est-ce que|combien|how much)/i,
  /(equation|équation|expression|fonction|function|facteur|facteurs|premiers|prime)/i,
  /(\d+[x-z]|\d+\^|\d+\/\d+|√|∫|∑|∆)/i,  // Mathematical symbols and variables
  /\d+\s*(fois|plus|moins|divisé\s+par)\s*\d+/i,  // French mathematical operations
  /(font|égal|égale|est)\s*\d+/i,  // French equals expressions
  
  // English written-out math patterns
  new RegExp(`(${ENGLISH_NUMBERS})\\s+(${ENGLISH_OPERATIONS})\\s+(${ENGLISH_NUMBERS})`, 'i'),  // "two times five"
  /(times|multiplied\s+by|plus|added\s+to|minus|subtract|subtracted\s+from|divided\s+by|equals?|is|makes|gives)/i,  // English operation words
  
  // French written-out math patterns  
  new RegExp(`(${FRENCH_NUMBERS})\\s+(fois|plus|moins|divisé\\s+par)\\s+(${FRENCH_NUMBERS})`, 'i'),  // "deux fois cinq"
  
  // Mixed patterns (numbers with written operations)
  /\d+\s+(times|plus|minus|divided\s+by)\s+\d+/i,  // "2 times 5"
  /(equals?|is|makes|gives)\s*\d+/i,  // "equals 10"
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

  // Smart pre-filtering: Check for obvious math patterns (keep this optimization)
  const hasObviousPattern = OBVIOUS_MATH_PATTERNS.some(pattern => pattern.test(message.trim()));
  
  if (hasObviousPattern) {
    console.log('[MathDetection] Using regex fallback for obvious math pattern');
    const result = createSimpleMathResult(message.trim());
    detectionCache.set(cacheKey, { ...result, timestamp: Date.now() } as any);
    return result;
  }

  // NEW APPROACH: Only skip AI call for obviously non-math content like greetings
  // This makes the system much more permissive and comprehensive
  const isObviouslyNonMath = (
    // Very short greetings
    (/^(hi|hello|hey|bonjour|salut|thanks|thank you|merci|bye|goodbye|à bientôt)$/i.test(message.trim()) && message.length < 20) ||
    // Very short responses
    (message.trim().length < 5 && !containsAnyMathContent(message)) ||
    // Pure emoji or punctuation
    (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`\s]*$/i.test(message.trim()))
  );

  if (isObviouslyNonMath) {
    console.log('[MathDetection] Skipping AI call - obviously non-math content:', message);
    const result = createFallbackResult(message);
    detectionCache.set(cacheKey, { ...result, timestamp: Date.now() } as any);
    return result;
  }

  // For everything else, let the AI decide!
  console.log('[MathDetection] Sending to AI for analysis - comprehensive math detection');
  
  try {
    // Detect language if not provided
    const detectedLang = language || detectLanguage(message);
    const languageInstructions = detectedLang === 'fr' 
      ? 'Respond in French.' 
      : 'Respond in English.';

    const prompt = `${languageInstructions}

You are an expert math education assistant. Analyze this message and determine if it contains mathematical content AND classify its intent.

CONTEXT: Common math action verbs include: Calculate, Solve, Simplify, Evaluate, Determine, Prove, Show that, Factor, Expand, Graph, Find, Convert (and their French equivalents: Calculer, Résoudre, Simplifier, Évaluer, Déterminer, Prouver, Montrer que, Factoriser, Développer, Tracer, Trouver, Convertir).

Message: "${message}"

INSTRUCTIONS:
1. First, determine if this is math-related content
2. Then, classify the INTENT:
   - QUESTION: General math questions, explanations, "how to" requests, conceptual questions
   - EXERCISE: Specific problems to solve, equations with numbers, answer submissions

Look for:
- Math problems, equations, calculations, or requests to solve something  
- Educational phrases like "Calculate the area", "Solve for x", "Find the value", "Simplify the expression"
- Mathematical symbols, variables, numbers with operations
- Word problems involving quantities, measurements, or mathematical relationships

INTENT CLASSIFICATION:
- isQuestion=true for: "how do I calculate quadratic?", "what is calculus?", "explain derivatives", "how to solve equations"
- isQuestion=false for: "solve: 2x+3=7", "calculate: 5*3", "find x: x²-4=0", "my answer is x=2"

Respond with ONLY a valid JSON object with this exact structure:
{
  "isMath": boolean,
  "confidence": number (0-100),
  "question": "extracted question or null",
  "hasAnswer": boolean,
  "answer": "extracted answer or null", 
  "isMultiple": boolean,
  "isQuestion": boolean,
  "exercises": [{"question": "Q1", "answer": "A1 or null", "index": 0}]
}

EXAMPLES:
✅ Math Questions (isQuestion=true):
- "how do i calculate quadratic?" → {"isMath": true, "confidence": 95, "question": "how do i calculate quadratic?", "hasAnswer": false, "answer": null, "isMultiple": false, "isQuestion": true, "exercises": []}
- "what is calculus?" → {"isMath": true, "confidence": 90, "question": "what is calculus?", "hasAnswer": false, "answer": null, "isMultiple": false, "isQuestion": true, "exercises": []}
- "explain derivatives" → {"isMath": true, "confidence": 95, "question": "explain derivatives", "hasAnswer": false, "answer": null, "isMultiple": false, "isQuestion": true, "exercises": []}

✅ Math Exercises (isQuestion=false):
- "Calculate the area of a rectangle with width 5 and height 3" → {"isMath": true, "confidence": 100, "question": "Calculate the area of a rectangle with width 5 and height 3", "hasAnswer": false, "answer": null, "isMultiple": false, "isQuestion": false, "exercises": []}
- "Solve for x: 2x+3=7. My answer is x=2" → {"isMath": true, "confidence": 100, "question": "2x+3=7", "hasAnswer": true, "answer": "x=2", "isMultiple": false, "isQuestion": false, "exercises": []}
- "What is 15% of 80?" → {"isMath": true, "confidence": 95, "question": "What is 15% of 80?", "hasAnswer": false, "answer": null, "isMultiple": false, "isQuestion": false, "exercises": []}

❌ Non-math content:
- "Hello, how are you?" → {"isMath": false, "confidence": 100, "question": null, "hasAnswer": false, "answer": null, "isMultiple": false, "isQuestion": false, "exercises": []}
- "I need help with my homework" → {"isMath": false, "confidence": 90, "question": null, "hasAnswer": false, "answer": null, "isMultiple": false, "isQuestion": false, "exercises": []}`;

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
      isQuestion: Boolean(parsed.isQuestion),
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
  
  // Detect if this is a question vs exercise
  const questionIndicators = /^(how do|what is|how to|explain|tell me|help me understand|comment|qu'est-ce que|expliquer)/i;
  const isQuestion = questionIndicators.test(message.trim());
  
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
      isQuestion: false, // Math expressions are exercises, not questions
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
      isQuestion: false, // Math expressions are exercises, not questions
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
    isQuestion,
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
    /(font|égal|égale|est)\s*\d+/i,  // French equals expressions
    
    // English written-out math patterns
    new RegExp(`(${ENGLISH_NUMBERS})\\s+(${ENGLISH_OPERATIONS})\\s+(${ENGLISH_NUMBERS})`, 'i'),  // "two times five"
    /(times|multiplied\s+by|plus|added\s+to|minus|subtract|subtracted\s+from|divided\s+by|equals?|is|makes|gives)\s+\d+/i,  // English operations with numbers
    /\d+\s+(times|plus|minus|divided\s+by)/i,  // Numbers with English operations
    
    // French written-out math patterns
    new RegExp(`(${FRENCH_NUMBERS})\\s+(fois|plus|moins|divisé\\s+par)\\s+(${FRENCH_NUMBERS})`, 'i'),  // "deux fois cinq"
    new RegExp(`(${FRENCH_NUMBERS})\\s+(font|égal|égale|est)`, 'i'),  // "cinq font"
    
    // Natural language math questions
    /(what\s+is|how\s+much\s+is)\s+\d+/i,  // "what is 5"
    /(combien\s+font)\s+\d+/i,  // "combien font"
  ];
  
  const result = mathSymbols.some(pattern => pattern.test(message));
  console.log('[MathDetection] Math symbols check result:', { message, result });
  return result;
}

/**
 * Enhanced comprehensive math vocabulary - ALL possible math terms
 */
const COMPREHENSIVE_MATH_TERMS = {
  // Basic operations
  en: [
    'calculate', 'solve', 'simplify', 'evaluate', 'determine', 'prove', 'show that', 
    'factor', 'expand', 'graph', 'find', 'convert', 'decompose', 'compute', 'derive',
    'integrate', 'differentiate', 'approximate', 'estimate', 'measure', 'compare',
    'analyze', 'transform', 'reduce', 'optimize', 'maximize', 'minimize',
    
    // Advanced math concepts
    'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics', 'probability',
    'linear algebra', 'differential equations', 'complex numbers', 'matrices',
    'vectors', 'functions', 'polynomials', 'quadratic', 'logarithmic', 'exponential',
    'derivative', 'integral', 'limit', 'series', 'sequence', 'convergence',
    'divergence', 'asymptote', 'inflection', 'critical point', 'extrema',
    
    // Mathematical objects and concepts
    'equation', 'inequality', 'expression', 'formula', 'theorem', 'lemma',
    'corollary', 'proof', 'axiom', 'postulate', 'hypothesis', 'conclusion',
    'variable', 'constant', 'coefficient', 'parameter', 'domain', 'range',
    'function', 'relation', 'mapping', 'transformation', 'operation',
    
    // Number theory and advanced concepts
    'prime', 'composite', 'factor', 'multiple', 'divisor', 'gcd', 'lcm',
    'greatest common divisor', 'least common multiple', 'hcf', 'highest common factor',
    'rational', 'irrational', 'integer', 'natural number', 'whole number',
    'real number', 'imaginary number', 'complex number', 'transcendental',
    
    // Geometry terms
    'triangle', 'circle', 'square', 'rectangle', 'polygon', 'angle', 'degree',
    'radian', 'perimeter', 'area', 'volume', 'surface area', 'diameter', 'radius',
    'circumference', 'parallel', 'perpendicular', 'congruent', 'similar',
    'proportion', 'ratio', 'scale', 'coordinate', 'axis', 'origin',
    
    // Statistics and probability
    'mean', 'median', 'mode', 'standard deviation', 'variance', 'correlation',
    'regression', 'distribution', 'normal distribution', 'binomial', 'probability',
    'sample', 'population', 'hypothesis testing', 'confidence interval',
    
    // Question words and phrases
    'what is', 'how much', 'how many', 'how to', 'what does', 'explain',
    'show me', 'help me', 'can you', 'would you', 'please', 'i need',
    
    // Mathematical symbols and notation
    'plus', 'minus', 'times', 'divided by', 'equals', 'greater than', 'less than',
    'square root', 'cube root', 'power', 'exponent', 'base', 'logarithm',
    'sine', 'cosine', 'tangent', 'cotangent', 'secant', 'cosecant'
  ],
  
  fr: [
    // Basic operations
    'calculer', 'calculez', 'résoudre', 'résolvez', 'simplifier', 'simplifiez',
    'évaluer', 'évaluez', 'déterminer', 'déterminez', 'démontrer', 'démontrez',
    'prouver', 'prouvez', 'montrer', 'montrez', 'factoriser', 'factorisez',
    'développer', 'développez', 'tracer', 'tracez', 'trouver', 'trouvez',
    'convertir', 'convertissez', 'décomposer', 'décomposez', 'calculer',
    'intégrer', 'intégrez', 'dériver', 'dérivez', 'approcher', 'approchez',
    'estimer', 'estimez', 'mesurer', 'mesurez', 'comparer', 'comparez',
    'analyser', 'analysez', 'transformer', 'transformez', 'réduire', 'réduisez',
    
    // Advanced math concepts
    'algèbre', 'géométrie', 'calcul', 'trigonométrie', 'statistiques', 'probabilité',
    'algèbre linéaire', 'équations différentielles', 'nombres complexes', 'matrices',
    'vecteurs', 'fonctions', 'polynômes', 'quadratique', 'logarithmique', 'exponentiel',
    'dérivée', 'intégrale', 'limite', 'série', 'suite', 'convergence',
    'divergence', 'asymptote', 'inflexion', 'point critique', 'extrema',
    
    // Mathematical objects
    'équation', 'inégalité', 'expression', 'formule', 'théorème', 'lemme',
    'corollaire', 'preuve', 'axiome', 'postulat', 'hypothèse', 'conclusion',
    'variable', 'constante', 'coefficient', 'paramètre', 'domaine', 'image',
    'fonction', 'relation', 'application', 'transformation', 'opération',
    
    // Number theory
    'premier', 'première', 'composé', 'composée', 'facteur', 'facteurs',
    'multiple', 'diviseur', 'pgcd', 'ppcm', 'plus grand commun diviseur',
    'plus petit commun multiple', 'rationnel', 'irrationnel', 'entier',
    'nombre naturel', 'nombre entier', 'nombre réel', 'nombre imaginaire',
    'nombre complexe', 'transcendant',
    
    // Geometry
    'triangle', 'cercle', 'carré', 'rectangle', 'polygone', 'angle', 'degré',
    'radian', 'périmètre', 'aire', 'volume', 'surface', 'diamètre', 'rayon',
    'circonférence', 'parallèle', 'perpendiculaire', 'congruent', 'semblable',
    'proportion', 'rapport', 'échelle', 'coordonnée', 'axe', 'origine',
    
    // Statistics
    'moyenne', 'médiane', 'mode', 'écart-type', 'variance', 'corrélation',
    'régression', 'distribution', 'distribution normale', 'binomial', 'probabilité',
    'échantillon', 'population', 'test d\'hypothèse', 'intervalle de confiance',
    
    // Question words
    'qu\'est-ce que', 'combien', 'comment', 'pourquoi', 'où', 'quand',
    'montrez-moi', 'aidez-moi', 'pouvez-vous', 'auriez-vous', 's\'il vous plaît',
    'j\'ai besoin', 'trouve', 'trouver', 'calcule', 'calculer',
    
    // Operations
    'fois', 'plus', 'moins', 'divisé par', 'égal', 'égale', 'est', 'font',
    'plus grand que', 'plus petit que', 'racine carrée', 'racine cubique',
    'puissance', 'exposant', 'base', 'logarithme', 'sinus', 'cosinus',
    'tangente', 'cotangente', 'sécante', 'cosécante'
  ]
};

// Enhanced function to check for any math-related content
function containsAnyMathContent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Check for numbers (strong math indicator)
  if (/\d/.test(message)) {
    return true;
  }
  
  // Check for mathematical symbols
  if (/[+\-*/=<>()^√∫∑∆π∞]/.test(message)) {
    return true;
  }
  
  // Check for comprehensive math terms in all languages
  const allMathTerms = [
    ...COMPREHENSIVE_MATH_TERMS.en,
    ...COMPREHENSIVE_MATH_TERMS.fr
  ];
  
  return allMathTerms.some(term => lowerMessage.includes(term));
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
    // English mathematical operations
    'times', 'multiplied by', 'plus', 'added to', 'minus', 'subtract', 'subtracted from', 'divided by', 'equals', 'is', 'makes', 'gives',
    // Symbols
    '+', '-', '*', '/', '=', '%', '°',
    // Number words (common ones for keyword matching)
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'un', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    // Question words
    'what is', 'how much', 'combien'
  ];
  
  const lowerMessage = message.toLowerCase();
  const hasMathKeywords = allMathKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  );

  const hasMathSymbols = containsMathSymbols(message);

  const isMath = hasMathKeywords || hasMathSymbols;
  const confidence = hasMathSymbols ? 75 : (hasMathKeywords ? 60 : 10);

  // Detect if this is a question vs exercise
  const questionIndicators = /^(how do|what is|how to|explain|tell me|help me understand|comment|qu'est-ce que|expliquer)/i;
  const isQuestion = questionIndicators.test(message.trim());

  return {
    isMath,
    confidence,
    question: isMath ? message : null,
    hasAnswer: false,
    answer: null,
    isMultiple: false,
    isQuestion: isMath ? isQuestion : false,
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