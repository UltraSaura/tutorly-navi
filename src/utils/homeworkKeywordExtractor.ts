/**
 * Extracts relevant keywords/tags from homework content
 * These keywords will be used to match videos with similar tags
 */

export interface ExtractedKeywords {
  mathConcepts: string[];
  operations: string[];
  topics: string[];
  allKeywords: string[];
}

const MATH_CONCEPTS = [
  'fraction', 'fractions', 'decimal', 'decimals', 'percentage', 'percentages',
  'algebra', 'linear equation', 'quadratic equation', 'polynomial',
  'geometry', 'triangle', 'circle', 'area', 'perimeter', 'volume',
  'calculus', 'derivative', 'integral', 'limit',
  'statistics', 'mean', 'median', 'mode', 'probability',
  'trigonometry', 'sine', 'cosine', 'tangent', 'angle',
  'addition', 'subtraction', 'multiplication', 'division',
  'simplify', 'simplification', 'factor', 'factoring', 'expand', 'expansion',
  'solve', 'equation', 'inequality', 'system of equations',
  'graph', 'plot', 'coordinate', 'slope', 'intercept'
];

const OPERATIONS = [
  'add', 'subtract', 'multiply', 'divide', 'simplify', 'solve',
  'calculate', 'compute', 'evaluate', 'find', 'determine',
  'factor', 'expand', 'reduce', 'convert', 'transform'
];

export function extractKeywordsFromHomework(homeworkContent: string): ExtractedKeywords {
  const content = homeworkContent.toLowerCase();
  const allKeywords: string[] = [];
  
  // Extract math concepts
  const mathConcepts: string[] = [];
  MATH_CONCEPTS.forEach(concept => {
    if (content.includes(concept.toLowerCase())) {
      mathConcepts.push(concept);
      allKeywords.push(concept);
    }
  });
  
  // Extract operations
  const operations: string[] = [];
  OPERATIONS.forEach(op => {
    if (content.includes(op.toLowerCase())) {
      operations.push(op);
      allKeywords.push(op);
    }
  });
  
  // Extract topic keywords from common patterns
  const topics: string[] = [];
  
  // Fraction-related
  if (/\d+\/\d+/.test(content) || content.includes('fraction')) {
    topics.push('fractions');
    if (!allKeywords.includes('fractions')) allKeywords.push('fractions');
  }
  
  // Equation-related
  if (/x\s*[=+-]|equation|solve/.test(content)) {
    topics.push('equations');
    if (!allKeywords.includes('equations')) allKeywords.push('equations');
  }
  
  // Geometry-related
  if (/triangle|circle|square|rectangle|angle|area|perimeter/.test(content)) {
    topics.push('geometry');
    if (!allKeywords.includes('geometry')) allKeywords.push('geometry');
  }
  
  // Algebra-related
  if (/variable|coefficient|x|y|z|algebra/.test(content)) {
    topics.push('algebra');
    if (!allKeywords.includes('algebra')) allKeywords.push('algebra');
  }
  
  // Remove duplicates
  const uniqueKeywords = Array.from(new Set(allKeywords));
  
  return {
    mathConcepts: Array.from(new Set(mathConcepts)),
    operations: Array.from(new Set(operations)),
    topics: Array.from(new Set(topics)),
    allKeywords: uniqueKeywords,
  };
}

/**
 * Scores how well a video's tags match homework keywords
 */
export function scoreVideoMatch(videoTags: string[], homeworkKeywords: string[]): number {
  if (!videoTags || videoTags.length === 0) return 0;
  if (!homeworkKeywords || homeworkKeywords.length === 0) return 0;
  
  const videoTagsLower = videoTags.map(t => t.toLowerCase());
  const homeworkKeywordsLower = homeworkKeywords.map(k => k.toLowerCase());
  
  // Count matches
  let matches = 0;
  videoTagsLower.forEach(tag => {
    if (homeworkKeywordsLower.some(keyword => 
      keyword.includes(tag) || tag.includes(keyword)
    )) {
      matches++;
    }
  });
  
  // Score: matches / max(video tags, homework keywords)
  const maxTags = Math.max(videoTags.length, homeworkKeywords.length);
  return maxTags > 0 ? matches / maxTags : 0;
}
