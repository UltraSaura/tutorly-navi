import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import provider-specific implementations
import { callOpenAI } from './providers/openai.ts';
import { callAnthropic } from './providers/anthropic.ts';
import { callMistral } from './providers/mistral.ts';
import { callGoogle } from './providers/google.ts';
import { callDeepSeek } from './providers/deepseek.ts';
import { callXAI } from './providers/xai.ts';

// Import utility functions
import { 
  detectExercise, 
  getModelConfig, 
  getApiKeyForProvider,
  formatHistoryForProvider,
  formatSystemMessageForProvider
} from './utils.ts';

// Import system prompt utilities
import {
  generateSystemMessage,
  enhanceSystemMessageForMath
} from './utils/systemPrompts.ts';
import {
  authenticateRequest,
  consumeRateLimit,
  handleCors,
  jsonResponse,
  parseJsonBody,
  recordSecurityAuditEvent,
  withTimeout,
} from "../_shared/security.ts";

const MAX_BODY_BYTES = Number(Deno.env.get("AI_CHAT_MAX_BODY_BYTES") ?? 150_000);
const MAX_HISTORY_ITEMS = Number(Deno.env.get("AI_CHAT_MAX_HISTORY_ITEMS") ?? 20);
const MAX_MESSAGE_LENGTH = Number(Deno.env.get("AI_CHAT_MAX_MESSAGE_LENGTH") ?? 12_000);
const MAX_MAX_TOKENS = Number(Deno.env.get("AI_CHAT_MAX_TOKENS") ?? 2_000);
const REQUEST_LIMIT = Number(Deno.env.get("AI_CHAT_RATE_LIMIT") ?? 30);
const REQUEST_WINDOW_SECONDS = Number(Deno.env.get("AI_CHAT_RATE_WINDOW_SECONDS") ?? 60);
const PROVIDER_TIMEOUT_MS = Number(Deno.env.get("AI_CHAT_PROVIDER_TIMEOUT_MS") ?? 25_000);

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth.response || !auth.context) {
      return auth.response!;
    }

    const { adminClient, user, requestId } = auth.context;

    const bodyResult = await parseJsonBody<Record<string, unknown>>(req, MAX_BODY_BYTES);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const rateLimit = await consumeRateLimit(adminClient, {
      scope: "ai-chat",
      actorKey: user.id,
      limit: REQUEST_LIMIT,
      windowSeconds: REQUEST_WINDOW_SECONDS,
    });

    if (!rateLimit.allowed) {
      await recordSecurityAuditEvent(adminClient, {
        requestId,
        scope: "ai-chat",
        eventType: "rate_limit",
        outcome: "blocked",
        actorUserId: user.id,
        metadata: {
          currentCount: rateLimit.current_count,
          resetAt: rateLimit.reset_at,
        },
      });

      return jsonResponse(
        req,
        {
          error: "Usage limit reached. Please try again later.",
          requestId,
        },
        429,
      );
    }

    const parsedBody = bodyResult.data;

    const { 
      message, 
      modelId, 
      history = [], 
      isGradingRequest = false, 
      isUnified = false,
      requestExplanation = false,
      language: rawLanguage = 'en',
      customPrompt,
      usageType: rawUsageType,
      userContext,
      requestMode,
      problemContext,
      maxTokens = 800
    } = parsedBody;

    const language = /^fr/i.test(rawLanguage) ? 'fr' : 'en';

    if (typeof modelId !== "string" || modelId.trim().length === 0) {
      return jsonResponse(req, { error: "Invalid request body", requestId }, 400);
    }

    if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
      return jsonResponse(req, { error: "Invalid request body", requestId }, 400);
    }

    if (!isGradingRequest && (typeof message !== "string" || message.trim().length === 0)) {
      return jsonResponse(req, { error: "Invalid request body", requestId }, 400);
    }

    if (typeof message === "string" && message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse(req, { error: "Message too long", requestId }, 413);
    }

    const normalizedHistory = history.filter((entry: unknown) => {
      if (!entry || typeof entry !== "object") return false;
      const role = (entry as { role?: unknown }).role;
      const content = (entry as { content?: unknown }).content;
      return (
        (role === "user" || role === "assistant" || role === "system") &&
        typeof content === "string" &&
        content.length <= MAX_MESSAGE_LENGTH
      );
    });

    if (normalizedHistory.length !== history.length) {
      return jsonResponse(req, { error: "Invalid request body", requestId }, 400);
    }

    let isExercise = false;
    if (!isUnified) {
      isExercise = !isGradingRequest && detectExercise(message);
    }

    // Get model configuration
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      return jsonResponse(req, { error: "Unsupported model", requestId }, 400);
    }

    const apiKey = getApiKeyForProvider(modelConfig.provider);
    if (!apiKey) {
      await recordSecurityAuditEvent(adminClient, {
        requestId,
        scope: "ai-chat",
        eventType: "missing_secret",
        outcome: "error",
        actorUserId: user.id,
        metadata: { provider: modelConfig.provider },
      });
      return jsonResponse(req, { error: "AI service is unavailable", requestId }, 503);
    }
    
    // Generate system message - use unified template if requested
    let usageType = 'chat';
    if (isUnified) {
      // For unified approach, we look for templates tagged with 'unified'
      usageType = 'chat';
    } else if (isGradingRequest) {
      usageType = 'grading';
    } else if (isExercise) {
      usageType = 'chat';
    }

    if (typeof rawUsageType === 'string' && rawUsageType.trim().length > 0) {
      usageType = rawUsageType.trim();
    }

    // Create variables object with language information
    const variables = {
      ...userContext,
      response_language: language === 'fr' ? 'French' : 'English'
    };

    const boundedMaxTokens = Math.min(
      Math.max(Number(maxTokens) || 800, 64),
      MAX_MAX_TOKENS,
      modelConfig.maxTokens ?? MAX_MAX_TOKENS,
    );

    let systemMessage;
    let effectiveMessage = message;

    if (requestMode === 'problemExtraction') {
      systemMessage = {
        role: 'system',
        content: `You are extracting a complete homework problem for a tutoring app.
Return ONLY valid JSON. Preserve the original grouped structure. Do not split assertions into separate exercises.
Detect grouped answer choices like Vrai/Faux, QCM, yes/no, and repeated row choices. Preserve labels A, B, C, D and shared contexts.
For true/false assertions, keep the student-facing prompts as assertions; do not rewrite them as tasks like "calculate the average".
JSON shape:
{
  "responseType": "grouped_choice_problem",
  "problemId": "string",
  "title": "string",
  "problemStatement": "string",
  "instructions": "string",
  "answerType": "true_false|multiple_choice|yes_no",
  "requiresJustification": true,
  "options": ["Vrai","Faux"],
  "keepGrouped": true,
  "sections": [{"id":"section-1","title":"string","context":"string","rows":[{"id":"row-A","label":"A","prompt":"original assertion text","answerType":"true_false","options":["Vrai","Faux"],"requiresJustification":true}]}]
}`
      };
      effectiveMessage = `Extract this complete homework problem as structured JSON. Preserve the original format and grouping.\n\n${message}`;
    } else if (requestMode === 'groupedProblemGrading') {
      systemMessage = {
        role: 'system',
        content: `You are grading a grouped homework problem.
Return ONLY valid JSON. Use the original problem context and evaluate each row/assertion inside the same parent problem.
Check both the selected answer and the justification when justification is required.
Do not treat rows as unrelated exercises.
For true/false with required justification:
- correct selection plus sufficient justification => status "correct"
- correct selection but missing or weak justification => status "partial"
- wrong selection => status "incorrect"
- missing selection => status "incomplete"
JSON shape:
{
  "status": "evaluated",
  "overallFeedback": "string",
  "missingAnswers": ["A"],
  "recommendedNextAction": "string",
  "sections": [{"id":"section-1","rows":[{"id":"row-A","label":"A","evaluation":{"selectedAnswer":"Vrai","correctAnswer":"Faux","isCorrect":false,"justificationProvided":true,"justificationSufficient":false,"status":"incorrect","feedback":"string","explanation":"string","score":0}}]}]
}`
      };
      effectiveMessage = `Grade this grouped problem using the original context and student answers:\n\n${JSON.stringify(problemContext || message)}`;
    } else {
      systemMessage = await generateSystemMessage(
        isExercise, 
        isGradingRequest, 
        language, 
        customPrompt,
        variables,  // Pass the variables object instead of userContext
        usageType,
        isUnified
      );
    }
    
    // Enhance system message for math problems if needed
    if (!requestMode && !isGradingRequest && modelConfig.provider === 'OpenAI') {
      systemMessage = enhanceSystemMessageForMath(systemMessage, message);
    }
    
    // Format history messages based on provider
    const formattedHistory = formatHistoryForProvider(normalizedHistory, modelConfig.provider);
    const formattedSystemMessage = formatSystemMessageForProvider(systemMessage, modelConfig.provider);
    let responseContent;
    
    try {
      const providerCall = async () => {
        switch (modelConfig.provider) {
          case 'OpenAI':
            return await callOpenAI(
              formattedSystemMessage,
              formattedHistory,
              effectiveMessage,
              modelConfig.model,
              isExercise,
              requestExplanation,
              boundedMaxTokens
            );
          case 'Anthropic':
            return await callAnthropic(
              formattedSystemMessage,
              formattedHistory,
              effectiveMessage,
              modelConfig.model,
              isExercise,
              boundedMaxTokens
            );
          case 'Mistral AI':
            return await callMistral(
              formattedSystemMessage,
              formattedHistory,
              effectiveMessage,
              modelConfig.model,
              isExercise,
              boundedMaxTokens
            );
          case 'Google':
            return await callGoogle(
              formattedSystemMessage,
              formattedHistory,
              effectiveMessage,
              modelConfig.model,
              isExercise,
              boundedMaxTokens
            );
          case 'DeepSeek':
            return await callDeepSeek(
              formattedSystemMessage,
              formattedHistory,
              effectiveMessage,
              modelConfig.model,
              isExercise,
              requestExplanation,
              boundedMaxTokens
            );
          case 'xAI':
            return await callXAI(
              formattedSystemMessage,
              formattedHistory,
              effectiveMessage,
              modelConfig.model,
              isExercise,
              boundedMaxTokens
            );
          default:
            throw new Error(`Provider not implemented: ${modelConfig.provider}`);
        }
      };

      responseContent = await withTimeout(providerCall(), PROVIDER_TIMEOUT_MS);
    } catch (providerError) {
      if ((providerError as Error).message === "TIMEOUT") {
        await recordSecurityAuditEvent(adminClient, {
          requestId,
          scope: "ai-chat",
          eventType: "provider_timeout",
          outcome: "error",
          actorUserId: user.id,
          metadata: { provider: modelConfig.provider, modelId },
        });
        return jsonResponse(req, { error: "AI service timed out", requestId }, 504);
      }

      throw providerError;
    }

    if (responseContent && typeof responseContent === 'object' && responseContent.tool_calls) {
      await recordSecurityAuditEvent(adminClient, {
        requestId,
        scope: "ai-chat",
        eventType: "request",
        outcome: "success",
        actorUserId: user.id,
        metadata: {
          modelId,
          provider: modelConfig.provider,
          requestMode: requestMode ?? null,
          historyCount: formattedHistory.length,
          messageLength: typeof message === "string" ? message.length : 0,
        },
      });
      return jsonResponse(req, {
          tool_calls: responseContent.tool_calls,
          content: responseContent.content || null,
          modelId,
          modelUsed: modelConfig.model,
          provider: modelConfig.provider,
          isExercise,
          timestamp: new Date().toISOString(),
          requestId,
        });
    }
    
    // Extract structured fields from AI response (handles markdown-wrapped JSON)
    const parsedFields: Record<string, unknown> = {};
    try {
      const jsonMatch = responseContent.match(/```json\s*\n([\s\S]*?)\n\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseContent;
      const parsed = JSON.parse(jsonStr);
      if (parsed.isCorrect !== undefined) parsedFields.isCorrect = parsed.isCorrect;
      if (parsed.isMath !== undefined) parsedFields.isMath = parsed.isMath;
      if (parsed.sections) parsedFields.sections = parsed.sections;
      if (requestMode === 'problemExtraction') parsedFields.problemSubmission = parsed;
      if (requestMode === 'groupedProblemGrading') parsedFields.problemEvaluation = parsed;
    } catch (e) {
      // Raw text response is acceptable.
    }

    await recordSecurityAuditEvent(adminClient, {
      requestId,
      scope: "ai-chat",
      eventType: "request",
      outcome: "success",
      actorUserId: user.id,
      metadata: {
        modelId,
        provider: modelConfig.provider,
        requestMode: requestMode ?? null,
        historyCount: formattedHistory.length,
        messageLength: typeof message === "string" ? message.length : 0,
        maxTokens: boundedMaxTokens,
      },
    });

    return jsonResponse(req, {
        content: responseContent,
        ...parsedFields,
        modelId,
        modelUsed: modelConfig.model,
        provider: modelConfig.provider,
        isExercise,
        timestamp: new Date().toISOString(),
        requestId,
      });
  } catch (error) {
    console.error("[ai-chat] request failed", {
      name: (error as Error).name,
      message: (error as Error).message || String(error),
    });

    return jsonResponse(
      req,
      {
        error: "Unable to complete the AI request",
      },
      500,
    );
  }
});
