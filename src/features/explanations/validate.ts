import { StepsPayload, Step, StepIcon } from './types';

// Valid step icons
const VALID_ICONS: StepIcon[] = ['magnifier', 'checklist', 'divide', 'lightbulb', 'target', 'warning'];

// Default fallback payload
const DEFAULT_PAYLOAD: StepsPayload = {
  steps: [
    {
      title: "How to approach",
      body: "Try breaking the problem into smaller steps.",
      icon: "lightbulb"
    }
  ]
};

/**
 * Safely parses AI response text into a validated StepsPayload
 * @param aiText - Raw AI response text that may contain JSON
 * @returns StepsPayload - Either parsed valid steps or fallback
 */
export function safeParse(aiText: string): StepsPayload {
  try {
    // Step 1: Clean the AI response text
    let cleanedText = aiText.trim();
    
    // Remove markdown code fences
    cleanedText = cleanedText.replace(/^```json\s*/i, ''); // Remove opening ```json
    cleanedText = cleanedText.replace(/^```\s*/i, ''); // Remove opening ```
    cleanedText = cleanedText.replace(/\s*```\s*$/i, ''); // Remove closing ```
    
    // Remove any trailing text after the JSON
    const jsonEndIndex = cleanedText.lastIndexOf('}');
    if (jsonEndIndex !== -1) {
      cleanedText = cleanedText.substring(0, jsonEndIndex + 1);
    }
    
    // Step 2: Parse JSON
    const parsed = JSON.parse(cleanedText);
    
    // Step 3: Validate structure
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.steps)) {
      console.warn('Invalid AI response structure - missing or invalid steps array');
      return DEFAULT_PAYLOAD;
    }
    
    // Step 4: Validate and clean steps
    const validSteps: Step[] = [];
    
    for (const step of parsed.steps) {
      // Check required properties
      if (!step || typeof step !== 'object' || 
          typeof step.title !== 'string' || 
          typeof step.body !== 'string' || 
          typeof step.icon !== 'string') {
        console.warn('Invalid step structure, skipping:', step);
        continue;
      }
      
      // Validate icon
      if (!VALID_ICONS.includes(step.icon as StepIcon)) {
        console.warn(`Invalid icon "${step.icon}", defaulting to lightbulb`);
        step.icon = 'lightbulb';
      }
      
      // Clean and validate content
      const cleanStep: Step = {
        title: step.title.trim().substring(0, 100), // Reasonable title limit
        body: step.body.trim().substring(0, 500), // Reasonable body limit
        icon: step.icon as StepIcon
      };
      
      // Skip empty steps
      if (cleanStep.title && cleanStep.body) {
        validSteps.push(cleanStep);
      }
    }
    
    // Step 5: Limit to 5 steps max
    const limitedSteps = validSteps.slice(0, 5);
    
    // Ensure we have at least one step
    if (limitedSteps.length === 0) {
      console.warn('No valid steps found in AI response, using fallback');
      return DEFAULT_PAYLOAD;
    }
    
    return { steps: limitedSteps };
    
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.log('Raw AI text:', aiText);
    return DEFAULT_PAYLOAD;
  }
}