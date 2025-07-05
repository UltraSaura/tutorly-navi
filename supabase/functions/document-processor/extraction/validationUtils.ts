// Content validation utilities for educational material

// Check if content contains educational/mathematical elements
export function isEducationalContent(content: string): boolean {
  console.log(`Validating content: "${content}" (length: ${content.length})`);
  
  // More lenient validation for French math content
  const educationalIndicators = [
    /\d+\/\d+/, // fractions
    /\d+\s*[+\-×÷*\/]\s*\d+/, // operations (including * and /)
    /=/, // equals
    /\d+/, // any numbers
    /(calcul|résoudre|simplifi|réduire|complet|écris|trouve|fraction|somme|produit)/i, // French educational keywords
    /[A-Za-z]{2,}/, // meaningful text (lowered from 3+ to 2+ characters)
    /^\s*[A-Za-z]\s*$/ // single letters (like exercise markers)
  ];
  
  // Check basic criteria
  const hasEducationalContent = educationalIndicators.some(pattern => {
    const match = pattern.test(content);
    if (match) {
      console.log(`✅ Content matches pattern: ${pattern.source}`);
    }
    return match;
  });
  
  const isLongEnough = content.length > 1; // Reduced from 2 to 1
  const isNotJustPunctuation = !/^[.\s_-]+$/.test(content);
  
  const result = hasEducationalContent && isLongEnough && isNotJustPunctuation;
  
  console.log(`Validation result: ${result} (hasEducational: ${hasEducationalContent}, longEnough: ${isLongEnough}, notPunctuation: ${isNotJustPunctuation})`);
  
  return result;
}

// Extract context around a fraction
export function extractContextAroundFraction(text: string, fraction: string): string {
  const index = text.indexOf(fraction);
  if (index === -1) return fraction;
  
  const start = Math.max(0, index - 15);
  const end = Math.min(text.length, index + fraction.length + 15);
  return text.substring(start, end).trim();
}