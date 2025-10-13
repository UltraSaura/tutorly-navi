import { Message } from '@/types/chat';
import { supabase } from "@/integrations/supabase/client";

/**
 * Extract answer from user input (e.g., "2+2=4" -> "4")
 */
function extractAnswer(message: string): string | null {
  const answerMatch = message.match(/=\s*([^=]+)$/);
  if (answerMatch) {
    return answerMatch[1].trim();
  }
  return null;
}

/**
 * Remove answer portion from question
 */
function extractQuestion(message: string): string {
  return message.replace(/=\s*[^=]+$/, '').trim();
}

/**
 * Detect subject from question content
 */
function detectSubject(message: string): string | null {
  const msg = message.toLowerCase();
  
  if (msg.includes('integral') || msg.includes('derivative') || msg.includes('calculus')) {
    return 'calculus';
  }
  if (msg.includes('algebra') || msg.includes('equation') || msg.includes('solve for')) {
    return 'algebra';
  }
  if (msg.includes('geometry') || msg.includes('triangle') || msg.includes('circle')) {
    return 'geometry';
  }
  
  return 'mathematics';
}

/**
 * Save exercise to history for guardian tracking
 */
async function saveExerciseToHistory(
  exerciseContent: string,
  userAnswer: string | null,
  isCorrect: boolean | null,
  subjectId: string | null
): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.log('[ExerciseAutoSave] No authenticated user, skipping save');
      return;
    }

    // Check if this exercise already exists
    const { data: existing } = await supabase
      .from('exercise_history')
      .select('id, attempts_count')
      .eq('user_id', user.user.id)
      .eq('exercise_content', exerciseContent)
      .maybeSingle();

    let exerciseHistoryId: string;

    if (existing) {
      // Update existing exercise
      const { data: updated } = await supabase
        .from('exercise_history')
        .update({
          user_answer: userAnswer,
          is_correct: isCorrect,
          attempts_count: existing.attempts_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('id')
        .single();
      
      exerciseHistoryId = updated!.id;
      console.log('[ExerciseAutoSave] Updated existing exercise, attempt:', existing.attempts_count + 1);
    } else {
      // Create new exercise
      const { data: created } = await supabase
        .from('exercise_history')
        .insert({
          user_id: user.user.id,
          exercise_content: exerciseContent,
          user_answer: userAnswer,
          is_correct: isCorrect,
          subject_id: subjectId,
          attempts_count: 1
        })
        .select('id')
        .single();
      
      exerciseHistoryId = created!.id;
      console.log('[ExerciseAutoSave] Created new exercise');
    }

    // Create attempt record if answer was provided
    if (userAnswer) {
      const attemptNumber = existing ? existing.attempts_count + 1 : 1;
      await supabase
        .from('exercise_attempts')
        .insert({
          exercise_history_id: exerciseHistoryId,
          user_answer: userAnswer,
          is_correct: isCorrect,
          attempt_number: attemptNumber
        });
      console.log('[ExerciseAutoSave] ✅ Exercise saved to guardian-visible history');
    } else {
      console.log('[ExerciseAutoSave] ✅ Question saved (no answer yet)');
    }
  } catch (err) {
    console.error('[ExerciseAutoSave] Error auto-saving exercise:', err);
  }
}

export interface UnifiedChatResponse {
  content: string;
  isMath: boolean;
  isCorrect?: boolean;
  needsRetry?: boolean;
  hasAnswer: boolean;
  confidence: number;
}

/**
 * Unified chat service - simplified to just forward to AI
 * AI now handles all math detection, grading, and formatting
 */
export async function sendUnifiedMessage(
  inputMessage: string,
  messages: Message[],
  selectedModelId: string,
  language: string = 'en',
  customPrompt?: string,
  userContext?: any
): Promise<{ data: UnifiedChatResponse | null; error: any }> {
  try {
    console.log('[UnifiedChatService] Sending message to AI:', { inputMessage, selectedModelId });

    // Format message history for AI
    const messageHistory = messages
      .filter(msg => ['user', 'assistant', 'system'].includes(msg.role))
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    console.log('[UnifiedChatService] Calling ai-chat with body:', {
      message: inputMessage,
      modelId: selectedModelId,
      historyLength: messageHistory.length,
      language,
      isUnified: true
    });

    // Just forward to AI - it handles everything
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: inputMessage,
        modelId: selectedModelId,
        history: messageHistory,
        language,
        customPrompt,
        userContext: {
          ...userContext,
          response_language: language === 'fr' ? 'French' : 'English'
        },
        isUnified: true
      },
    });

    console.log('[UnifiedChatService] Raw response from ai-chat:', { data, error, hasData: !!data, hasError: !!error });

    if (error) {
      console.error('[UnifiedChatService] AI service error:', error);
      return { data: null, error };
    }

    if (!data) {
      console.error('[UnifiedChatService] No data in response');
      return { data: null, error: 'No data received from AI service' };
    }

    console.log('[UnifiedChatService] Data structure:', {
      hasContent: !!data?.content,
      contentType: typeof data?.content,
      contentLength: data?.content?.length,
      dataKeys: Object.keys(data)
    });

    if (!data?.content) {
      console.error('[UnifiedChatService] No content in response:', data);
      return { data: null, error: 'No content received from AI service' };
    }

    // Simple parsing - AI is smart enough to structure its own response
    const response: UnifiedChatResponse = {
      content: data.content,
      isMath: !data.content.includes('NOT_MATH'),
      isCorrect: /\bCORRECT\b/i.test(data.content) ? true : (/\bINCORRECT\b/i.test(data.content) ? false : undefined),
      needsRetry: /\bINCORRECT\b/i.test(data.content),
      hasAnswer: /=\s*[^=]*$/.test(inputMessage),
      confidence: data.content.includes('NOT_MATH') ? 95 : 85
    };
    
    console.log('[UnifiedChatService] Response parsed successfully:', {
      isMath: response.isMath,
      isCorrect: response.isCorrect,
      hasAnswer: response.hasAnswer,
      contentPreview: response.content.substring(0, 200)
    });

    // Auto-save math exercises to history for guardian tracking
    if (response.isMath) {
      const question = extractQuestion(inputMessage);
      const answer = extractAnswer(inputMessage);
      const subject = detectSubject(question);
      
      // Save asynchronously without blocking response
      saveExerciseToHistory(
        question,
        answer,
        response.isCorrect ?? null,
        subject
      ).catch(err => console.error('[UnifiedChatService] Failed to auto-save exercise:', err));
    }
    
    return { data: response, error: null };

  } catch (error) {
    console.error('[UnifiedChatService] Caught error:', error);
    return { data: null, error };
  }
}

/**
 * Generate fallback response when service fails
 */
export function generateUnifiedFallback(message: string, language: string = 'en'): UnifiedChatResponse {
  const fallbackContent = language === 'fr'
    ? "Je ne peux pas traiter votre demande en ce moment. Veuillez réessayer plus tard."
    : "I'm unable to process your request at the moment. Please try again later.";

  return {
    content: fallbackContent,
    isMath: false,
    confidence: 0,
    hasAnswer: false
  };
}
