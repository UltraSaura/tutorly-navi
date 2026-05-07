/**
 * Geometry grading engine — grades area, perimeter, circumference, and angle problems locally.
 */

import type { LocalGradeResult } from './localMathGrader';

const PI = Math.PI;
const TOLERANCE = 0.05; // accept π ≈ 3.14 approximations

/**
 * Attempt to grade a geometry question locally. Returns null if not a geometry question.
 */
export function gradeGeometry(question: string, userAnswer: string): LocalGradeResult | null {
  const q = question.toLowerCase();

  // Detect geometry keywords
  const geoKeywords = ['area', 'perimeter', 'circumference', 'angle', 'surface', 'aire', 'périmètre', 'circonférence'];
  if (!geoKeywords.some(k => q.includes(k))) return null;

  const shapeKeywords = ['rectangle', 'square', 'carré', 'triangle', 'circle', 'cercle'];
  const shape = shapeKeywords.find(s => q.includes(s));
  if (!shape) return null;

  const nums = extractNumbers(question);
  const userVal = parseUserAnswer(userAnswer);
  if (userVal === null) return null;

  let correct: number | null = null;

  const isArea = /\b(area|aire|surface)\b/i.test(q);
  const isPerimeter = /\b(perimeter|périmètre|circumference|circonférence)\b/i.test(q);
  const isAngle = /\b(angle)\b/i.test(q);

  switch (shape) {
    case 'rectangle': {
      if (nums.length < 2) return null;
      const [l, w] = nums;
      if (isArea) correct = l * w;
      else if (isPerimeter) correct = 2 * (l + w);
      break;
    }
    case 'square':
    case 'carré': {
      if (nums.length < 1) return null;
      const s = nums[0];
      if (isArea) correct = s * s;
      else if (isPerimeter) correct = 4 * s;
      break;
    }
    case 'triangle': {
      if (isAngle && nums.length >= 2) {
        // Triangle angle sum: find missing angle
        const knownSum = nums.reduce((a, b) => a + b, 0);
        correct = 180 - knownSum;
      } else if (isArea && nums.length >= 2) {
        // A = (base × height) / 2
        correct = (nums[0] * nums[1]) / 2;
      } else if (isPerimeter && nums.length >= 3) {
        correct = nums[0] + nums[1] + nums[2];
      }
      break;
    }
    case 'circle':
    case 'cercle': {
      if (nums.length < 1) return null;
      const r = extractRadius(q, nums);
      if (isArea) correct = PI * r * r;
      else if (isPerimeter) correct = 2 * PI * r;
      break;
    }
  }

  if (correct === null) return null;

  const isCorrect = Math.abs(userVal - correct) <= Math.max(TOLERANCE, Math.abs(correct) * 0.01);

  return {
    isCorrect,
    correctAnswer: String(Math.round(correct * 10000) / 10000),
    confidence: 'high',
    method: 'local',
  };
}

/** Extract all numbers from a string */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

/** Parse user answer, stripping units */
function parseUserAnswer(answer: string): number | null {
  // Strip common units
  const stripped = answer.replace(/\s*(cm²|m²|cm|mm|m|km|°|deg|pi|π)\s*/gi, '').trim();
  
  // Handle π expressions like "9π" or "9pi"
  const piMatch = answer.match(/(\d+(?:\.\d+)?)\s*[πpi]/i);
  if (piMatch) {
    return parseFloat(piMatch[1]) * PI;
  }

  const val = parseFloat(stripped);
  return isNaN(val) ? null : val;
}

/** Try to figure out if a dimension is radius or diameter */
function extractRadius(q: string, nums: number[]): number {
  if (/\b(radius|rayon|r\s*=)\b/i.test(q)) return nums[0];
  if (/\b(diameter|diamètre|d\s*=)\b/i.test(q)) return nums[0] / 2;
  // Default to treating the number as radius
  return nums[0];
}
