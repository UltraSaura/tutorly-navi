import React from 'react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { processMathContentForDisplay } from '@/utils/mathDisplayProcessor';
import { cn } from '@/lib/utils';

interface ExplanationTwoCardsProps {
  problem: string;
  guidance: string;
  className?: string;
}

// Comprehensive text formatting function with better word boundary detection
const formatConcatenatedText = (text: string): string => {
  if (!text) return '';
  
  // Common words that help with word boundary detection
  const commonWords = [
    'the', 'and', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
    'this', 'that', 'these', 'those', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for',
    'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'among', 'under', 'over', 'around',
    'think', 'through', 'step', 'by', 'step', 'multiplication', 'addition', 'subtraction',
    'division', 'number', 'numbers', 'same', 'different', 'way', 'ways', 'adding',
    'multiple', 'times', 'time', 'group', 'groups', 'items', 'each', 'every',
    'expression', 'equation', 'problem', 'solution', 'answer', 'correct', 'incorrect',
    'let', 'us', 'we', 'you', 'your', 'our', 'their', 'they', 'them', 'it', 'its',
    'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom', 'whose',
    'for', 'example', 'means', 'add', 'total', 'get', 'when', 'result', 'will', 'be',
    'answer', 'to', 'times', 'plus', 'equals', 'plus', 'minus', 'divided'
  ];

  let result = text
    // Remove status markers first
    .replace(/\b(CORRECT|INCORRECT|NOT_MATH)\b/gi, '')
    
    // Fix specific known concatenated patterns
    .replace(/Let'sthinkaboutthisstepbystep\.Multiplicationisawayofaddingthesamenumbermultipletimes\.F/g,
      "Let's think about this step by step. Multiplication is a way of adding the same number multiple times. For")
    .replace(/Forexample/g, 'For example')
    .replace(/3meansweaddthenumber2atotalo f3times/g, '3 means we add the number 2 a total of 3 times')
    .replace(/Whatdoyougetwhenyouadd2/g, 'What do you get when you add 2')
    .replace(/\?Thatresultwillbetheanswerto2/g, '? That result will be the answer to 2')
    .replace(/thinkaboutthisstepbystep/g, 'think about this step by step')
    .replace(/Multiplicationisawayofadding/g, 'Multiplication is a way of adding')
    .replace(/thesamenumbermultipletimes/g, 'the same number multiple times')
    .replace(/Let'sthinkaboutwhatmultiplicationreallymeans/g, 'Let\'s think about what multiplication really means')
    .replace(/Theexpression/g, 'The expression')
    .replace(/canbeunderstood/g, 'can be understood')
    .replace(/as"3grou/g, 'as "3 groups')
    .replace(/ofitems/g, 'of items')
    .replace(/eachgroup/g, 'each group')
    .replace(/So3/g, 'So 3')
    .replace(/times5/g, 'times 5')
    .replace(/equals15/g, 'equals 15')
    .replace(/not87/g, 'not 87')
    .replace(/Itlooksliketheremightbeamisunderstandingabouthowadditionworks/g, 'It looks like there might be a misunderstanding about how addition works')
    .replace(/Let'sbreakthisdowntogether/g, 'Let\'s break this down together')
    .replace(/First, le/g, 'First, let\'s')
    
    // Fix markdown formatting
    .replace(/\*\*Problem:\*\*\s*\*\*([^*]+)\*\*/g, '**Problem:** $1')
    .replace(/\*\*Guidance:\*\*\s*\*\*([^*]+)\*\*/g, '**Guidance:** $1')
    .replace(/\*\*([^*]+)\*\*\s*\*\*([^*]+)\*\*/g, '**$1:** $2')
    .replace(/\*\*Problem:\*\*\s*([^*]+)/g, '**Problem:** $1')
    .replace(/\*\*Guidance:\*\*\s*([^*]+)/g, '**Guidance:** $1');

  // More aggressive word splitting using common words as boundaries
  const words = result.split(/(\s+)/);
  const processedWords = words.map(word => {
    if (!word.trim()) return word; // Keep whitespace as-is
    
    // If word is already properly spaced, return as-is
    if (word.includes(' ')) return word;
    
    // Try to split concatenated words using common word boundaries
    let processed = word;
    
    // Look for common word patterns within the word
    for (const commonWord of commonWords) {
      const regex = new RegExp(`(${commonWord})`, 'gi');
      if (regex.test(processed)) {
        // Split around the common word
        processed = processed.replace(
          new RegExp(`(^|\\s)(${commonWord})(?=[A-Z])`, 'gi'),
          `$1$2 `
        );
        processed = processed.replace(
          new RegExp(`(?<=[a-z])(${commonWord})(\\s|$)`, 'gi'),
          ` $1$2`
        );
      }
    }
    
    // Additional specific patterns
    processed = processed
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Basic camelCase
      .replace(/([a-z])([a-z])([A-Z])/g, '$1$2 $3')
      .replace(/([a-z])([a-z])([a-z])([A-Z])/g, '$1$2$3 $4')
      .replace(/([a-z])([a-z])([a-z])([a-z])([A-Z])/g, '$1$2$3$4 $5')
      .replace(/([a-z])([a-z])([a-z])([a-z])([a-z])([A-Z])/g, '$1$2$3$4$5 $6')
      .replace(/([a-z])([a-z])([a-z])([a-z])([a-z])([a-z])([A-Z])/g, '$1$2$3$4$5$6 $7')
      .replace(/([a-z])([a-z])([a-z])([a-z])([a-z])([a-z])([a-z])([A-Z])/g, '$1$2$3$4$5$6$7 $8');
    
    return processed;
  });
  
  result = processedWords.join('');
  
  // Final cleanup
  result = result
    // Add spaces around punctuation
    .replace(/([a-z])([.!?])/g, '$1$2')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .replace(/([a-z])([,:;])/g, '$1$2')
    .replace(/([,:;])([A-Z])/g, '$1 $2')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  return result;
};

// Function to split text into sentences and format properly
const formatTextIntoParagraphs = (text: string): string[] => {
  if (!text) return [];
  
  const formatted = formatConcatenatedText(text);
  
  // Split by sentences (periods followed by space and capital letter)
  const sentences = formatted
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .filter(sentence => sentence.trim().length > 0);
  
  // If no proper sentence breaks, split by length
  if (sentences.length <= 1) {
    const words = formatted.split(' ');
    const chunks = [];
    let currentChunk = [];
    
    for (const word of words) {
      currentChunk.push(word);
      if (currentChunk.length >= 15 || word.endsWith('.')) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    return chunks;
  }
  
  return sentences;
};

export const ExplanationTwoCards: React.FC<ExplanationTwoCardsProps> = ({
  problem,
  guidance,
  className
}) => {
  const formattedProblem = formatConcatenatedText(problem);
  const problemParagraphs = formatTextIntoParagraphs(problem);
  const guidanceParagraphs = formatTextIntoParagraphs(guidance);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Problem Card */}
      {formattedProblem && (
        <div className="p-4 rounded-card border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">📘</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">
                Problem
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                {problemParagraphs.map((paragraph, index) => {
                  const processed = processMathContentForDisplay(paragraph);
                  return processed.isMath ? (
                    <MathRenderer 
                      key={index} 
                      latex={processed.processed} 
                      inline={false} 
                      className="my-1" 
                    />
                  ) : (
                    <p key={index} className="leading-relaxed">{paragraph}</p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guidance Card */}
      {guidance && (
        <div className="p-4 rounded-card border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-sm font-bold">💡</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-3">
                Guidance
              </h4>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-2">
                {guidanceParagraphs.map((paragraph, index) => {
                  const processed = processMathContentForDisplay(paragraph);
                  return processed.isMath ? (
                    <MathRenderer 
                      key={index} 
                      latex={processed.processed} 
                      inline={false} 
                      className="my-1" 
                    />
                  ) : (
                    <p key={index} className="leading-relaxed">{paragraph}</p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplanationTwoCards;
