import { detectLanguage } from "@/lib/langDetect";
import { sendMessageToAI } from "@/services/chatService";

// Map language codes and names
const normalizeLanguage = (lang: string): string => {
  const langMap: Record<string, string> = {
    'English': 'en',
    'French': 'fr',
    'en': 'en',
    'fr': 'fr'
  };
  return langMap[lang] || 'en';
};

export async function ensureLanguage(text: string, target: string, selectedModelId?: string): Promise<string> {
  const detected = detectLanguage(text);
  const normalizedTarget = normalizeLanguage(target);
  
  if (!text) return text;
  if (detected === normalizedTarget) return text;

  // Get the model to use for translation - use selected model or fallback
  const modelToUse = selectedModelId || localStorage.getItem('selectedModelId') || 'deepseek-chat';

  // Minimal fallback: prepend a one-shot instruction and re-ask the selected model to translate.
  try {
    const targetLangName = normalizedTarget === 'fr' ? 'French' : 'English';
    const translationPrompt = `Translate to ${targetLangName} keeping emoji headers and formatting exactly:\n\n${text}`;
    
    const result = await sendMessageToAI(
      translationPrompt,
      [],
      modelToUse,
      targetLangName
    );
    
    return result?.data?.content || text;
  } catch {
    return text; // if no translator, return original to avoid blocking
  }
}