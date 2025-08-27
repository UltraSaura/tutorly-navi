
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';
import { areMathematicallyEquivalent, getEquivalencyContext, detectFractionOcrMisread } from "@/utils/mathValidation";

export const evaluateHomework = async (
  exercise: Exercise,
  attemptNumber: number = 1,
  language: string = 'en',
  selectedModelId: string
): Promise<Exercise> => {
  console.log('[homeworkGrading] Using model:', selectedModelId);
  try {
    console.log('[homeworkGrading] evaluateHomework called with:', exercise);
    if (!exercise.question) {
      console.error("[homeworkGrading] Missing question for grading:", exercise);
      toast.error('Please provide a question for grading.');
      return {
        ...exercise,
        isCorrect: false,
        explanation: "Unable to grade: Missing question."
      };
    }

    if (!exercise.userAnswer || exercise.userAnswer.trim() === '') {
      console.log("[homeworkGrading] No answer provided, returning unanswered exercise");
      return {
        ...exercise,
        needsRetry: true,
        explanation: undefined
      };
    }

    console.log('[homeworkGrading] Starting homework evaluation for:', { 
      question: exercise.question, 
      answer: exercise.userAnswer 
    });

    // Step 0: Pre-validate mathematically equivalent answers
    const mathematicalEquivalency = areMathematicallyEquivalent(exercise.question, exercise.userAnswer);
    const equivalencyContext = getEquivalencyContext(exercise.question, exercise.userAnswer);
    
    console.log('[homeworkGrading] Mathematical pre-validation:', {
      isEquivalent: mathematicalEquivalency,
      context: equivalencyContext
    });

    // Step 1: Get quick grade (just correct/incorrect)
    const { data: gradeData, error: gradeError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `Grade this answer. Question: "${exercise.question}" Answer: "${exercise.userAnswer}"`,
        modelId: selectedModelId,
        history: [],
        isGradingRequest: true
      },
    });

    console.log('[homeworkGrading] Grade API response:', { gradeData, gradeError });

    if (gradeError) {
      console.error('[homeworkGrading] Grading error:', gradeError);
      toast.error('Failed to grade your answer. Please try again.');
      
      return {
        ...exercise,
        isCorrect: false,
        explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** There was an error grading your answer. The system couldn't determine if your answer is correct. Please try again later or contact support if the issue persists.`
      };
    }

    if (!gradeData?.content) {
      console.error('[homeworkGrading] Invalid grading response:', gradeData);
      toast.error('Received invalid response from grading service.');
      
      return {
        ...exercise,
        isCorrect: false,
        explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** Unable to grade your answer due to a technical issue. Please try again later.`
      };
    }

    console.log('[homeworkGrading] Raw grade response:', gradeData.content);

    // Strict parsing of the CORRECT/INCORRECT response
    const responseContent = gradeData.content.trim().toUpperCase();
    console.log('[homeworkGrading] Parsed grading response as:', responseContent);
    
    // Handle invalid format more gracefully with mathematical fallback
    if (responseContent !== 'CORRECT' && responseContent !== 'INCORRECT') {
      console.error('[homeworkGrading] Invalid grade format received:', responseContent);
      
      // Use mathematical validation as fallback
      if (mathematicalEquivalency === true) {
        console.log('[homeworkGrading] Using mathematical validation fallback - marking as CORRECT');
        const isCorrect = true;
        return {
          ...exercise,
          isCorrect,
          explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** Perfect! Your answer is mathematically correct. ${equivalencyContext || ''}`,
          needsRetry: false,
          attempts: exercise.attempts.map(attempt => 
            attempt.attemptNumber === attemptNumber 
              ? { ...attempt, isCorrect, explanation: `Mathematical validation confirmed this answer is correct. ${equivalencyContext || ''}` }
              : attempt
          )
        };
      }
      
      toast.error('Received invalid grade format. Using mathematical fallback.');
      
      return {
        ...exercise,
        isCorrect: false,
        explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** The system received an unexpected response when grading your answer. It has been marked as incorrect, but you may want to review it with a teacher.`
      };
    }

    let isCorrect = responseContent === 'CORRECT';
    let ocrCorrectionNote = '';
    let correctedQuestion = exercise.question;
    
    // Override AI decision if mathematical validation indicates correctness
    if (!isCorrect && mathematicalEquivalency === true) {
      console.log('[homeworkGrading] AI marked incorrect but mathematical validation says correct - overriding to CORRECT');
      isCorrect = true;
    }
    
    // Check for likely OCR misreads in fraction exercises if still incorrect
    if (!isCorrect) {
      const ocrCheck = detectFractionOcrMisread(exercise.question, exercise.userAnswer);
      if (ocrCheck.isLikely) {
        console.log('[homeworkGrading] OCR misread detected - overriding to CORRECT:', ocrCheck);
        console.log('[homeworkGrading] Original question:', exercise.question);
        
        // Replace the misread fraction in the question with the corrected one
        if (ocrCheck.correctedFraction) {
          const fractionMatch = exercise.question.match(/\d+\/\d+/);
          if (fractionMatch) {
            correctedQuestion = exercise.question.replace(fractionMatch[0], ocrCheck.correctedFraction);
            console.log('[homeworkGrading] Corrected question:', correctedQuestion);
          }
        }
        
        isCorrect = true;
        ocrCorrectionNote = `\n\n**OCR Correction:** Your answer is correct! The system detected a likely OCR misread where "${ocrCheck.correctedFraction}" was read as the original fraction. ${ocrCheck.reason}.`;
      }
    }
    
    console.log(`[homeworkGrading] Exercise graded as: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    // Step 2: Get guidance based on correctness and attempt number
    let explanation = '';
    if (!isCorrect) {
      console.log('[homeworkGrading] Requesting guidance for incorrect answer, attempt:', attemptNumber);
      
      // Progressive feedback based on attempt number
      let guidancePrompt = '';
      const languageInstructions = language === 'fr' 
        ? 'Respond in French.' 
        : 'Respond in English.';
      
      if (attemptNumber === 1) {
        const endPhrase = language === 'fr' ? 'Essayez encore !' : 'Try again!';
        guidancePrompt = `${languageInstructions} The student answered incorrectly on their first attempt. Question: "${correctedQuestion}" Their answer: "${exercise.userAnswer}". Provide helpful guidance to help them understand the correct approach without giving away the answer directly. Focus on the learning process and concepts they should review. End with "${endPhrase}"`;
      } else if (attemptNumber === 2) {
        const endPhrase = language === 'fr' ? 'Vous vous rapprochez ! Essayez encore une fois !' : 'You\'re getting closer! Try once more!';
        guidancePrompt = `${languageInstructions} The student answered incorrectly again (attempt ${attemptNumber}). Question: "${correctedQuestion}" Their answer: "${exercise.userAnswer}". Provide more detailed guidance with hints about the specific approach needed. Be more specific than before but still don't give the direct answer. End with "${endPhrase}"`;
      } else {
        const endPhrase = language === 'fr' ? 'Vous pouvez le faire ! Encore un essai !' : 'You can do this! One more try!';
        guidancePrompt = `${languageInstructions} The student has attempted this ${attemptNumber} times and is still incorrect. Question: "${correctedQuestion}" Their answer: "${exercise.userAnswer}". Provide step-by-step guidance that almost shows how to solve it, but let them do the final calculation. Be very specific about the method. End with "${endPhrase}"`;
      }
      
      const { data: guidanceData, error: guidanceError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: guidancePrompt,
          modelId: selectedModelId,
          history: [],
          isExercise: true
        },
      });

      console.log('[homeworkGrading] Guidance API response:', { guidanceData, guidanceError });

      if (guidanceError || !guidanceData?.content) {
        console.error('[homeworkGrading] Error getting guidance:', guidanceError || 'No content');
        
        // Provide enhanced math guidance as fallback
        const basicGuidance = generateEnhancedMathGuidance(exercise.question, exercise.userAnswer, language);
        const mathContext = equivalencyContext ? `\n\n${equivalencyContext}` : '';
        explanation = `**Problem:** ${correctedQuestion}\n\n**Guidance:** ${basicGuidance}${mathContext}`;
      } else {
        explanation = `**Problem:** ${correctedQuestion}\n\n**Guidance:** ${guidanceData.content}`;
      }
      
      console.log('[homeworkGrading] Guidance explanation:', explanation);
    } else {
      // Progressive success messages with mathematical equivalency context
      const mathContext = equivalencyContext ? `\n\n${equivalencyContext}` : '';
      if (attemptNumber === 1) {
        const successMessage = language === 'fr' 
          ? `Parfait ! Vous avez réussi du premier coup ! Votre compréhension du concept est excellente.${mathContext}${ocrCorrectionNote} Prêt pour le prochain défi ?`
          : `Perfect! You got it right on your first try! Your understanding of the concept is excellent.${mathContext}${ocrCorrectionNote} Ready for the next challenge?`;
        explanation = `**Problem:** ${correctedQuestion}\n\n**Guidance:** ${successMessage}`;
      } else {
        const successMessage = language === 'fr'
          ? `Excellent travail ! Vous avez persévéré et obtenu la bonne réponse après ${attemptNumber} tentatives. C'est l'esprit d'apprentissage - continuez à essayer jusqu'à réussir !${mathContext}${ocrCorrectionNote} Bien joué !`
          : `Excellent work! You persevered and got the correct answer after ${attemptNumber} attempts. That's the spirit of learning - keep trying until you succeed!${mathContext}${ocrCorrectionNote} Well done!`;
        explanation = `**Problem:** ${correctedQuestion}\n\n**Guidance:** ${successMessage}`;
      }
      console.log('[homeworkGrading] Correct answer - positive feedback provided for attempt:', attemptNumber);
    }

    // Update needsRetry flag
    const needsRetry = !isCorrect;

    // Display appropriate notification
    const successMsg = language === 'fr' ? "Correct ! Bon travail !" : "Correct! Great job!";
    const incorrectMsg = language === 'fr' ? "Incorrect. Consultez les conseils ci-dessous pour améliorer votre compréhension." : "Incorrect. Check the guidance below to improve your understanding.";
    toast.success(isCorrect ? successMsg : incorrectMsg);

    // Update the latest attempt with grading results
    const updatedAttempts = exercise.attempts.map(attempt => 
      attempt.attemptNumber === attemptNumber 
        ? { ...attempt, isCorrect, explanation }
        : attempt
    );

    // Return the updated exercise with explicit isCorrect field and corrected question
    const gradedExercise = {
      ...exercise,
      question: correctedQuestion,
      isCorrect,
      explanation,
      needsRetry,
      attempts: updatedAttempts
    };

    console.log('[homeworkGrading] Returning graded exercise:', gradedExercise);
    return gradedExercise;
  } catch (error) {
    console.error('[homeworkGrading] Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    
    return {
      ...exercise,
      isCorrect: false,
      explanation: `**Problem:** ${exercise.question}\n\n**Guidance:** An unexpected error occurred while grading your answer. Please try again later.`
    };
  }
};

/**
 * Generate enhanced math guidance when AI service fails
 */
const generateEnhancedMathGuidance = (question: string, userAnswer: string, language: string = 'en'): string => {
  // Check for basic arithmetic problems with decimal support
  const basicMathPattern = /(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/;
  const basicMatch = question.match(basicMathPattern);
  
  if (basicMatch) {
    const [, num1, operator, num2] = basicMatch;
    const a = parseFloat(num1);
    const b = parseFloat(num2);
    
    let correctAnswer: number;
    let operationName: string;
    let stepByStep: string;
    
    switch (operator) {
      case '+':
        correctAnswer = a + b;
        operationName = language === 'fr' ? 'addition' : 'addition';
        stepByStep = language === 'fr' 
          ? `Étape 1 : Additionner ${a} + ${b}\nÉtape 2 : ${a} + ${b} = ${correctAnswer}`
          : `Step 1: Add ${a} + ${b}\nStep 2: ${a} + ${b} = ${correctAnswer}`;
        break;
      case '-':
        correctAnswer = a - b;
        operationName = language === 'fr' ? 'soustraction' : 'subtraction';
        stepByStep = language === 'fr'
          ? `Étape 1 : Soustraire ${b} de ${a}\nÉtape 2 : ${a} - ${b} = ${correctAnswer}`
          : `Step 1: Subtract ${b} from ${a}\nStep 2: ${a} - ${b} = ${correctAnswer}`;
        break;
      case '*':
        correctAnswer = a * b;
        operationName = language === 'fr' ? 'multiplication' : 'multiplication';
        stepByStep = language === 'fr'
          ? `Étape 1 : Multiplier ${a} × ${b}\nÉtape 2 : ${a} × ${b} = ${correctAnswer}`
          : `Step 1: Multiply ${a} × ${b}\nStep 2: ${a} × ${b} = ${correctAnswer}`;
        break;
      case '/':
        correctAnswer = a / b;
        operationName = language === 'fr' ? 'division' : 'division';
        // Handle repeating decimals better
        const isRepeatingDecimal = !Number.isInteger(correctAnswer) && (correctAnswer.toString().length > 6 || correctAnswer % 1 !== 0);
        const roundedAnswer = Math.round(correctAnswer * 10000) / 10000; // Round to 4 decimal places
        stepByStep = language === 'fr'
          ? `Étape 1 : Diviser ${a} par ${b}\nÉtape 2 : ${a} ÷ ${b} = ${correctAnswer}${isRepeatingDecimal ? ` (ou approximativement ${roundedAnswer})` : ''}`
          : `Step 1: Divide ${a} by ${b}\nStep 2: ${a} ÷ ${b} = ${correctAnswer}${isRepeatingDecimal ? ` (or approximately ${roundedAnswer})` : ''}`;
        break;
      default:
        return language === 'fr' 
          ? "Votre réponse était incorrecte. Veuillez vérifier votre calcul et essayer le problème étape par étape."
          : "Your answer was incorrect. Please double-check your calculation and try the problem again step by step.";
    }
    
    const guidanceText = language === 'fr'
      ? `Votre réponse était incorrecte. Ceci est un problème de ${operationName}.

${stepByStep}

Revoyez vos étapes de ${operationName} et assurez-vous de calculer correctement. La bonne réponse est ${correctAnswer}.

Essayez de refaire le problème et n'oubliez pas de vérifier votre arithmétique !`
      : `Your answer was incorrect. This is a ${operationName} problem.

${stepByStep}

Review your ${operationName} steps and make sure you're calculating correctly. The correct answer is ${correctAnswer}.

Try working through it again, and remember to double-check your arithmetic!`;
    
    return guidanceText;
  }
  
  // Check for equation solving
  if (question.includes('=') && question.includes('x')) {
    return language === 'fr'
      ? `Ceci semble être une équation avec une variable. Voici quelques conseils :

1. Identifiez ce que vous résolvez (généralement x)
2. Utilisez des opérations inverses pour isoler la variable
3. Ce que vous faites d'un côté, faites-le de l'autre côté
4. Vérifiez votre réponse en la substituant dans l'équation originale

Essayez de résoudre le problème étape par étape, et rappelez-vous que l'objectif est d'obtenir la variable seule d'un côté.`
      : `This appears to be an equation with a variable. Here are some tips:

1. Identify what you're solving for (usually x)
2. Use inverse operations to isolate the variable
3. Whatever you do to one side, do to the other side
4. Check your answer by substituting it back into the original equation

Try working through the problem step by step, and remember the goal is to get the variable by itself on one side.`;
  }
  
  // Generic helpful guidance
  return language === 'fr'
    ? `Votre réponse était incorrecte, mais cela fait partie de l'apprentissage ! Voici quelques conseils généraux :

1. Lisez attentivement le problème et identifiez ce qui est demandé
2. Divisez les problèmes complexes en étapes plus petites
3. Montrez votre travail pour pouvoir vérifier chaque étape
4. Vérifiez vos calculs
5. Réfléchissez si votre réponse a du sens

Regardez à nouveau le problème et essayez de le résoudre étape par étape. Vous pouvez le faire !`
    : `Your answer was incorrect, but that's part of learning! Here are some general tips:

1. Read the problem carefully and identify what's being asked
2. Break complex problems into smaller steps
3. Show your work so you can check each step
4. Double-check your calculations
5. Think about whether your answer makes sense

Take another look at the problem and try working through it step by step. You've got this!`;
};
