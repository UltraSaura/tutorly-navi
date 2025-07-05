// Content validation utilities for educational material

// Check if content contains educational/mathematical elements
export function isEducationalContent(content: string): boolean {
  const educationalIndicators = [
    /\d+\/\d+/, // fractions
    /\d+\s*[+\-×÷]\s*\d+/, // operations
    /=/, // equals
    /\d+/, // any numbers
    /(calcul|résoudre|simplifi|réduire|complet|écris|trouve)/i, // French educational keywords
    /[A-Za-z]{3,}/ // meaningful text (not just single characters)
  ];
  
  return educationalIndicators.some(pattern => pattern.test(content)) && 
         content.length > 2 &&
         !/^[.\s_-]+$/.test(content); // not just dots, spaces, underscores, or dashes
}

// Extract context around a fraction
export function extractContextAroundFraction(text: string, fraction: string): string {
  const index = text.indexOf(fraction);
  if (index === -1) return fraction;
  
  const start = Math.max(0, index - 15);
  const end = Math.min(text.length, index + fraction.length + 15);
  return text.substring(start, end).trim();
}