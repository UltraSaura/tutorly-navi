import { sendMessageToAI } from "@/services/chatService";

// Simple language detection using common words and patterns
function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();
  
  // French indicators
  const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'est', 'avec', 'pour', 'dans', 'sur', 'par', 'cette', 'cette', 'nous', 'vous', 'ils', 'elles', 'être', 'avoir'];
  const frenchCount = frenchWords.filter(word => lowerText.includes(` ${word} `) || lowerText.startsWith(`${word} `) || lowerText.endsWith(` ${word}`)).length;
  
  // English indicators  
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'we', 'you', 'they', 'are', 'is', 'was', 'were', 'have', 'has'];
  const englishCount = englishWords.filter(word => lowerText.includes(` ${word} `) || lowerText.startsWith(`${word} `) || lowerText.endsWith(` ${word}`)).length;
  
  // Return detected language
  if (frenchCount > englishCount && frenchCount > 2) {
    return 'French';
  }
  return 'English';
}

// Map language codes to full names
const languageMap: Record<string, string> = {
  'en': 'English',
  'fr': 'French',
  'English': 'English',
  'French': 'French'
};

export async function ensureLanguage(
  text: string, 
  expectedLanguage: string,
  modelId: string = 'gpt-4o-mini'
): Promise<string> {
  try {
    // Normalize language names
    const normalizedExpected = languageMap[expectedLanguage] || expectedLanguage;
    const detectedLanguage = detectLanguage(text);
    
    console.log('[ensureLanguage] Expected:', normalizedExpected, 'Detected:', detectedLanguage);
    
    // If languages match, return original text
    if (detectedLanguage === normalizedExpected) {
      return text;
    }
    
    // If languages don't match, translate
    console.log(`[ensureLanguage] Translating from ${detectedLanguage} to ${normalizedExpected}`);
    
    const translationPrompt = `Translate the following educational content to ${normalizedExpected}. Maintain all formatting, structure, and technical accuracy. Only return the translated content, no additional commentary:

${text}`;

    const translationResult = await sendMessageToAI(
      translationPrompt,
      [], // No message history needed for translation
      modelId,
      normalizedExpected
    );
    
    if (translationResult?.data?.content) {
      console.log('[ensureLanguage] Translation successful');
      return translationResult.data.content;
    } else {
      console.warn('[ensureLanguage] Translation failed, using original text');
      return text;
    }
    
  } catch (error) {
    console.error('[ensureLanguage] Error during language processing:', error);
    // Return original text if translation fails
    return text;
  }
}