import React from "react";
import { requestTwoCardTeaching } from "./promptClient";
import { parseTwoCardText, TeachingSections } from "./twoCardParser";
import { usePromptManagement } from "@/hooks/usePromptManagement";
import { useAdmin } from "@/context/AdminContext";
import { useLanguage } from "@/context/LanguageContext";
import { ensureLanguage } from "@/lib/ensureLanguage";
import { ExerciseCanonicalizer } from "@/services/exerciseCanonicalizer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// In-memory cache for storing explanations within the session
const sessionCache = new Map<string, TeachingSections>();

// Cache control flag - disable caching for now to avoid issues
const ENABLE_EXPLANATION_CACHE = false;

// Helper function to evaluate arithmetic expressions respecting order of operations
function evaluateArithmetic(expression: string): number {
  // Simple evaluation that handles +, -, *, /
  // First handle multiplication and division (left to right)
  let expr = expression.replace(/\s/g, ''); // Remove spaces
  
  // Handle multiplication and division first
  while (expr.match(/\d+[\*×\/÷]\d+/)) {
    expr = expr.replace(/(\d+)([\*×])(\d+)/, (match, n1, op, n2) => {
      return String(parseInt(n1) * parseInt(n2));
    });
    expr = expr.replace(/(\d+)([\/÷])(\d+)/, (match, n1, op, n2) => {
      return String(parseInt(n1) / parseInt(n2));
    });
  }
  
  // Then handle addition and subtraction (left to right)
  while (expr.match(/\d+[\+\-]\d+/)) {
    expr = expr.replace(/(\d+)([\+])(\d+)/, (match, n1, op, n2) => {
      return String(parseInt(n1) + parseInt(n2));
    });
    expr = expr.replace(/(\d+)([\-])(\d+)/, (match, n1, op, n2) => {
      return String(parseInt(n1) - parseInt(n2));
    });
  }
  
  return parseFloat(expr);
}

// Helper function to generate step-by-step solution
function generateSteps(expression: string, isFrench: boolean): string {
  const steps = [];
  let expr = expression.replace(/\s/g, '');
  
  // Track each step of evaluation
  const originalExpr = expr;
  
  // First, handle multiplication and division
  while (expr.match(/\d+[\*×\/÷]\d+/)) {
    const multMatch = expr.match(/(\d+)([\*×])(\d+)/);
    const divMatch = expr.match(/(\d+)([\/÷])(\d+)/);
    
    if (multMatch) {
      const [match, n1, op, n2] = multMatch;
      const result = parseInt(n1) * parseInt(n2);
      steps.push(isFrench ? 
        `${n1} × ${n2} = ${result}` :
        `${n1} × ${n2} = ${result}`);
      expr = expr.replace(match, String(result));
    }
    
    if (divMatch && (!multMatch || expr.indexOf(divMatch[0]) < expr.indexOf(multMatch[0]))) {
      const [match, n1, op, n2] = divMatch;
      const result = parseInt(n1) / parseInt(n2);
      steps.push(isFrench ? 
        `${n1} ÷ ${n2} = ${result}` :
        `${n1} ÷ ${n2} = ${result}`);
      expr = expr.replace(match, String(result));
    }
  }
  
  // Then handle addition and subtraction
  while (expr.match(/\d+[\+\-]\d+/)) {
    const addMatch = expr.match(/(\d+)([\+])(\d+)/);
    const subMatch = expr.match(/(\d+)([\-])(\d+)/);
    
    if (addMatch && (!subMatch || expr.indexOf(addMatch[0]) < expr.indexOf(subMatch[0]))) {
      const [match, n1, op, n2] = addMatch;
      const result = parseInt(n1) + parseInt(n2);
      steps.push(isFrench ? 
        `${n1} + ${n2} = ${result}` :
        `${n1} + ${n2} = ${result}`);
      expr = expr.replace(match, String(result));
    }
    
    if (subMatch) {
      const [match, n1, op, n2] = subMatch;
      const result = parseInt(n1) - parseInt(n2);
      steps.push(isFrench ? 
        `${n1} - ${n2} = ${result}` :
        `${n1} - ${n2} = ${result}`);
      expr = expr.replace(match, String(result));
    }
  }
  
  return steps.join(isFrench ? ', puis ' : ', then ');
}

// Helper function to generate explanations for arithmetic expressions
function generateSimpleArithmeticExplanation(exercise: string, language: string): TeachingSections {
  const isFrench = language === 'French';
  
  // Check if it's a simple single operation first
  const singleOpMatch = exercise.match(/^\s*(\d+)\s*([\+\-\*×\/÷])\s*(\d+)\s*=?\s*\d*\s*$/);
  
  if (singleOpMatch) {
    // Handle single operation as before
    const [, num1, operator, num2] = singleOpMatch;
    const n1 = parseInt(num1);
    const n2 = parseInt(num2);
    
    let operation = '';
    let result = 0;
    let concept = '';
    let example = '';
    let strategy = '';
    
    if (operator === '+') {
      operation = isFrench ? 'addition' : 'addition';
      result = n1 + n2;
      concept = isFrench ? 
        `L'addition consiste à combiner deux nombres pour obtenir leur somme totale.` :
        `Addition means combining two numbers to get their total sum.`;
      example = isFrench ? 
        `Par exemple: ${n1 + 1} + ${n2 + 1} = ${(n1 + 1) + (n2 + 1)}` :
        `For example: ${n1 + 1} + ${n2 + 1} = ${(n1 + 1) + (n2 + 1)}`;
      strategy = isFrench ?
        `Comptez en partant du premier nombre et ajoutez le second nombre.` :
        `Start with the first number and count up by the second number.`;
    } else if (operator === '-') {
      operation = isFrench ? 'soustraction' : 'subtraction';
      result = n1 - n2;
      concept = isFrench ?
        `La soustraction consiste à enlever un nombre d'un autre.` :
        `Subtraction means taking one number away from another.`;
      example = isFrench ?
        `Par exemple: ${n1 + 1} - ${n2} = ${(n1 + 1) - n2}` :
        `For example: ${n1 + 1} - ${n2} = ${(n1 + 1) - n2}`;
      strategy = isFrench ?
        `Commencez par le premier nombre et comptez en arrière.` :
        `Start with the first number and count backwards.`;
    } else if (operator === '*' || operator === '×') {
      operation = isFrench ? 'multiplication' : 'multiplication';
      result = n1 * n2;
      concept = isFrench ?
        `La multiplication consiste à additionner un nombre plusieurs fois.` :
        `Multiplication means adding a number multiple times.`;
      example = isFrench ?
        `Par exemple: ${n1} × ${n2 + 1} = ${n1 * (n2 + 1)}` :
        `For example: ${n1} × ${n2 + 1} = ${n1 * (n2 + 1)}`;
      strategy = isFrench ?
        `Additionnez ${n1} un total de ${n2} fois: ${Array(n2).fill(n1).join(' + ')} = ${result}` :
        `Add ${n1} a total of ${n2} times: ${Array(n2).fill(n1).join(' + ')} = ${result}`;
    } else if (operator === '/' || operator === '÷') {
      operation = isFrench ? 'division' : 'division';
      result = n1 / n2;
      concept = isFrench ?
        `La division consiste à partager un nombre en groupes égaux.` :
        `Division means splitting a number into equal groups.`;
      example = isFrench ?
        `Par exemple: ${n1 * 2} ÷ ${n2} = ${(n1 * 2) / n2}` :
        `For example: ${n1 * 2} ÷ ${n2} = ${(n1 * 2) / n2}`;
      strategy = isFrench ?
        `Combien de fois ${n2} rentre-t-il dans ${n1}?` :
        `How many times does ${n2} go into ${n1}?`;
    }
    
    return {
      exercise: exercise,
      concept,
      example,
      strategy,
      pitfall: isFrench ? 
        `Attention aux erreurs de calcul mental.` :
        `Be careful with mental math mistakes.`,
      check: isFrench ?
        `Vérifiez: ${n1} ${operator} ${n2} = ${result}` :
        `Check: ${n1} ${operator} ${n2} = ${result}`,
      practice: isFrench ?
        `Pratiquez avec d'autres nombres similaires.` :
        `Practice with other similar numbers.`
    };
  }
  
  // Handle multi-operator expressions
  const multiOpPattern = /^\s*\d+\s*[\+\-\*×\/÷]\s*\d+(?:\s*[\+\-\*×\/÷]\s*\d+)*\s*=?\s*\d*\s*$/;
  if (multiOpPattern.test(exercise)) {
    const cleanExpr = exercise.replace(/\s*=.*$/, '').trim(); // Remove any = and answer part
    const result = evaluateArithmetic(cleanExpr);
    const steps = generateSteps(cleanExpr, isFrench);
    
    const hasMultiplication = /[\*×]/.test(cleanExpr);
    const hasDivision = /[\/÷]/.test(cleanExpr);
    const hasAddition = /\+/.test(cleanExpr);
    const hasSubtraction = /\-/.test(cleanExpr);
    
    let concept = '';
    let example = '';
    let strategy = '';
    
    if (isFrench) {
      concept = `Ordre des opérations (PEMDAS): Multiplication et division d'abord, puis addition et soustraction de gauche à droite.`;
      example = `Autre exemple: 3 × 2 + 5 = 6 + 5 = 11`;
      strategy = `1. Identifiez toutes les opérations\n2. Faites d'abord × et ÷ (de gauche à droite)\n3. Puis + et - (de gauche à droite)\n4. Étapes: ${steps}`;
    } else {
      concept = `Order of operations (PEMDAS): Multiply and divide first, then add and subtract from left to right.`;
      example = `Another example: 3 × 2 + 5 = 6 + 5 = 11`;
      strategy = `1. Identify all operations\n2. Do × and ÷ first (left to right)\n3. Then + and - (left to right)\n4. Steps: ${steps}`;
    }
    
    return {
      exercise: exercise,
      concept,
      example,
      strategy,
      pitfall: isFrench ? 
        `Erreur commune: faire les opérations de gauche à droite sans respecter l'ordre des opérations.` :
        `Common mistake: doing operations left to right without following order of operations.`,
      check: isFrench ?
        `Vérifiez: ${cleanExpr} = ${result}` :
        `Check: ${cleanExpr} = ${result}`,
      practice: isFrench ?
        `Pratiquez avec d'autres expressions multi-opérations.` :
        `Practice with other multi-operation expressions.`
    };
  }
  
  return getErrorFallback(exercise, isFrench);
}

function getErrorFallback(exercise: string, isFrench: boolean): TeachingSections {
  return {
    exercise,
    concept: isFrench ? 
      'Concept mathématique de base' :
      'Basic mathematical concept',
    example: isFrench ?
      'Exemple avec des nombres différents' :
      'Example with different numbers',
    strategy: isFrench ?
      'Approche étape par étape' :
      'Step-by-step approach',
    pitfall: isFrench ?
      'Erreurs courantes à éviter' :
      'Common mistakes to avoid',
    check: isFrench ?
      'Comment vérifier la réponse' :
      'How to verify the answer',
    practice: isFrench ?
      'Suggestion d\'amélioration' :
      'Suggestion for improvement'
  };
}

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const { getActiveTemplate } = usePromptManagement();
  const { selectedModelId } = useAdmin();
  const { t } = useLanguage();

  async function openFor(row: any, profile: { response_language?: string; grade_level?: string }) {
    console.log('[TwoCardTeaching] Opening explanation for:', { row, profile });
    setOpen(true);
    setError(null);
    
    try {
      // Accept both Exercise shape and the normalized shape
      const exercise_content =
        row?.prompt || row?.question || row?.exercise_content || "";
      const student_answer = row?.userAnswer || row?.student_answer || "";
      const subject =
        row?.subject || row?.subjectId || "math";
      const response_language = profile?.response_language ?? "English";
      const grade_level = profile?.grade_level ?? "High School";

      // Create canonicalized version and cache key
      const canonical = ExerciseCanonicalizer.canonicalize(exercise_content, subject);
      const cacheKey = ExerciseCanonicalizer.createCacheKey(
        exercise_content,
        typeof subject === "string" ? subject : String(subject),
        response_language,
        grade_level
      );
      
      // Check session cache first (if caching enabled)
      if (ENABLE_EXPLANATION_CACHE) {
        const sessionCachedExplanation = sessionCache.get(cacheKey);
        if (sessionCachedExplanation) {
          console.log('[TwoCardTeaching] Using session cached explanation');
          setSections(sessionCachedExplanation);
          return;
        }

        // Check database cache
        const { data: cachedExplanation, error: cacheError } = await supabase
          .from('exercise_explanations_cache')
          .select('explanation_data, usage_count')
          .eq('exercise_hash', canonical.hash)
          .maybeSingle();

        if (!cacheError && cachedExplanation) {
          console.log('[TwoCardTeaching] Using database cached explanation');
          
          // Update usage count
          await supabase
            .from('exercise_explanations_cache')
            .update({ 
              usage_count: cachedExplanation.usage_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('exercise_hash', canonical.hash);

          const explanation = cachedExplanation.explanation_data as TeachingSections;
          sessionCache.set(cacheKey, explanation);
          setSections(explanation);
          return;
        }
      }
      
      // Not in cache, start loading and make AI request
      setLoading(true);
      
      // Check if this is an arithmetic problem that we can handle directly
      const arithmeticPattern = /^\s*\d+\s*[\+\-\*×\/÷]\s*\d+(?:\s*[\+\-\*×\/÷]\s*\d+)*\s*=?\s*\d*\s*$/;
      if (arithmeticPattern.test(exercise_content)) {
        console.log('[TwoCardTeaching] Detected arithmetic expression, using direct explanation');
        const directExplanation = generateSimpleArithmeticExplanation(exercise_content, response_language);
        setSections(directExplanation);
        setLoading(false);
        return;
      }
      
      let explanationTemplate = getActiveTemplate('explanation');
      
      console.log("[Explain] template →", { name: explanationTemplate?.name, usage: explanationTemplate?.usage_type, id: explanationTemplate?.id });
      
      // Built-in fallback template if no active template is found
      if (!explanationTemplate) {
        console.log('[TwoCardTeaching] No active template found, using built-in fallback');
        explanationTemplate = {
          id: 'fallback',
          name: 'Built-in Fallback',
          subject: 'math',
          description: 'Built-in fallback explanation template',
          usage_type: 'explanation',
          prompt_content: `You are an expert tutor. The student answered "{{student_answer}}" to the question "{{exercise_content}}" in {{subject}}.

Please provide a clear educational explanation with these EXACT sections and emojis:

📘 Exercise
{{exercise_content}}

💡 Concept
Explain the key concept needed to solve this problem.

🔍 Example
Show a similar example with different numbers.

☑️ Strategy
Explain the step-by-step approach to solve this type of problem.

⚠️ Pitfall
Common mistakes students make with this type of problem.

🎯 Check yourself
How to verify the answer is correct.

📈 Practice Tip
Suggestion for improving at this type of problem.

Write all content in {{response_language}}. Keep the section headers in English with emojis exactly as shown above. Return plain text only.`,
          tags: ['fallback', 'explanation'],
          is_active: true,
          priority: 0,
          auto_activate: false,
          created_at: new Date(),
          updated_at: new Date()
        };
      }
      
      let raw: string;
      try {
        raw = await requestTwoCardTeaching({
          exercise_content,
          student_answer,
          subject: typeof subject === "string" ? subject : String(subject),
          response_language,
          grade_level,
        }, selectedModelId, explanationTemplate);
        
        console.log('[TwoCardTeaching] Raw AI Response:', raw);
        
        // Check if the response is "NOT_MATH" or similar failure
        if (raw.includes('NOT_MATH') || raw.includes('non-mathematical')) {
          throw new Error('AI classified this as non-mathematical content');
        }
        
      } catch (error) {
        console.warn('[TwoCardTeaching] Primary AI call failed:', error);
        
        // Check if this is arithmetic and provide direct explanation
        const arithmeticPattern = /^\s*\d+\s*[\+\-\*×\/÷]\s*\d+(?:\s*[\+\-\*×\/÷]\s*\d+)*\s*=?\s*\d*\s*$/;
        if (arithmeticPattern.test(exercise_content)) {
          console.log('[TwoCardTeaching] AI failed but detected arithmetic expression, using direct explanation');
          const directExplanation = generateSimpleArithmeticExplanation(exercise_content, response_language);
          setSections(directExplanation);
          setLoading(false);
          return;
        }
        
        // For non-simple problems, try with a different model (gpt-4o-mini as backup)
        try {
          const fallbackPrompt = `Explain this math problem step by step in ${response_language}:

Exercise: ${exercise_content}
Student Answer: ${student_answer}

Format:
📘 Exercise
${exercise_content}

💡 Concept
[Key concept]

🔍 Example  
[Different example]

☑️ Strategy
[Step by step]

⚠️ Pitfall
[Common mistake]

🎯 Check yourself
[Verification]

📈 Practice Tip
[Improvement tip]`;

          const { data: fallbackData, error: fallbackError } = await import('@/services/chatService').then(module => 
            module.sendMessageToAI(fallbackPrompt, [], 'gpt-4o-mini', response_language === 'French' ? 'fr' : 'en')
          );
          
          if (fallbackError || !fallbackData?.content) {
            throw new Error('Both primary and fallback AI calls failed');
          }
          
          raw = fallbackData.content;
        } catch (fallbackError) {
          console.error('[TwoCardTeaching] All AI calls failed:', fallbackError);
          throw new Error('All AI explanation attempts failed');
        }
      }
      
      // Ensure the response is in the correct language
      const rawInCorrectLanguage = await ensureLanguage(
        raw, 
        response_language,
        selectedModelId
      );
      
      console.log('[TwoCardTeaching] Language-corrected Response:', rawInCorrectLanguage);
      
      const parsed = parseTwoCardText(rawInCorrectLanguage);
      console.log("[Explain] parsed →", parsed);
      
      // Always fill missing sections with safe defaults
      const finalSections: TeachingSections = {
        exercise: parsed.exercise || exercise_content || 'No exercise provided',
        concept: parsed.concept || (response_language === 'French' 
          ? 'Concept clé nécessaire pour résoudre ce problème'
          : 'Key concept needed to solve this problem'),
        example: parsed.example || (response_language === 'French'
          ? 'Exemple similaire avec des nombres différents'
          : 'Similar example with different numbers'),
        strategy: parsed.strategy || (response_language === 'French'
          ? 'Approche étape par étape pour résoudre ce type de problème'
          : 'Step-by-step approach to solve this type of problem'),
        pitfall: parsed.pitfall || (response_language === 'French'
          ? 'Erreurs courantes que font les étudiants avec ce type de problème'
          : 'Common mistakes students make with this type of problem'),
        check: parsed.check || (response_language === 'French'
          ? 'Comment vérifier que la réponse est correcte'
          : 'How to verify the answer is correct'),
        practice: parsed.practice || (response_language === 'French'
          ? 'Suggestion pour améliorer ce type de problème'
          : 'Suggestion for improving at this type of problem')
      };
      
      console.log('[TwoCardTeaching] Final sections with defaults applied:', finalSections);
      
      // Cache the successful result (if caching enabled)
      if (ENABLE_EXPLANATION_CACHE) {
        sessionCache.set(cacheKey, finalSections);
        
        // Save to database cache
        try {
          await supabase.from('exercise_explanations_cache').insert({
            exercise_hash: canonical.hash,
            exercise_content: canonical.normalizedContent,
            subject_id: typeof subject === "string" ? subject : String(subject),
            explanation_data: finalSections,
            quality_score: 0,
            usage_count: 1
          });
          console.log('[TwoCardTeaching] Saved explanation to database cache');
        } catch (dbError) {
          console.warn('[TwoCardTeaching] Failed to save to database cache:', dbError);
          // Don't fail the whole operation if caching fails
        }
      }
      
      setSections(finalSections);
    } catch (e:any) {
      console.error('[TwoCardTeaching] Error:', e);
      setError('Failed to generate explanation');
      
      // Show toast in development for debugging
      if (import.meta.env.DEV) {
        toast({
          title: "Debug: Explanation Error", 
          description: `Error generating explanation: ${e.message}`,
          variant: "destructive"
        });
      }
      
      const fallbackSections = {
        exercise: row?.prompt || row?.question || row?.exercise_content || 'No exercise provided',
        concept: (profile?.response_language === 'French') 
          ? 'Une erreur s\'est produite lors de la génération de l\'explication'
          : 'An error occurred generating the explanation',
        example: (profile?.response_language === 'French')
          ? 'Veuillez réessayer plus tard'
          : 'Please try again later',
        strategy: (profile?.response_language === 'French')
          ? 'Contactez le support si le problème persiste'
          : 'Contact support if the issue persists',
        pitfall: (profile?.response_language === 'French')
          ? 'Vérifiez votre connexion internet'
          : 'Check your internet connection',
        check: (profile?.response_language === 'French')
          ? 'Essayez de reformuler la question'
          : 'Try rephrasing the question',
        practice: (profile?.response_language === 'French')
          ? 'Essayez avec une question plus simple'
          : 'Try with a simpler question'
      };
      setSections(fallbackSections);
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, loading, sections, error, openFor };
}