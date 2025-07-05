// PHASE 4: Force split strategy for single long content

// Force split strategy for single long content
export function createForcedSplitExercises(text: string): Array<{ question: string, answer: string }> {
  console.log('Applying forced split strategy...');
  
  if (text.length < 50) {
    return [{
      question: text.trim() || "No content extracted",
      answer: ""
    }];
  }
  
  // If content is substantial but we only found one exercise, force split it
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  if (sentences.length > 1) {
    console.log(`Force splitting into ${sentences.length} parts`);
    return sentences.slice(0, 5).map((sentence, index) => ({
      question: `${String.fromCharCode(97 + index)}. ${sentence.trim()}`,
      answer: ""
    }));
  }
  
  // Last resort: split by length
  const words = text.split(/\s+/);
  const chunkSize = Math.ceil(words.length / 3); // Split into 3 parts
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 10) {
      chunks.push(chunk.trim());
    }
  }
  
  if (chunks.length > 1) {
    console.log(`Force splitting by length into ${chunks.length} parts`);
    return chunks.map((chunk, index) => ({
      question: `${String.fromCharCode(97 + index)}. ${chunk}`,
      answer: ""
    }));
  }
  
  // Absolute fallback
  return [{
    question: text.trim() || "No content extracted",
    answer: ""
  }];
}