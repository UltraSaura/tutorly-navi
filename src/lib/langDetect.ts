// Simple language detection using common words and patterns
export function detectLanguage(text: string): string {
  if (!text) return 'en';
  
  const lowerText = text.toLowerCase();
  
  // French indicators
  const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'est', 'avec', 'pour', 'dans', 'sur', 'par', 'cette', 'nous', 'vous', 'ils', 'elles', 'être', 'avoir'];
  const frenchCount = frenchWords.filter(word => 
    lowerText.includes(` ${word} `) || 
    lowerText.startsWith(`${word} `) || 
    lowerText.endsWith(` ${word}`)
  ).length;
  
  // English indicators  
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'we', 'you', 'they', 'are', 'is', 'was', 'were', 'have', 'has'];
  const englishCount = englishWords.filter(word => 
    lowerText.includes(` ${word} `) || 
    lowerText.startsWith(`${word} `) || 
    lowerText.endsWith(` ${word}`)
  ).length;
  
  // Return detected language code
  if (frenchCount > englishCount && frenchCount > 2) {
    return 'fr';
  }
  return 'en';
}