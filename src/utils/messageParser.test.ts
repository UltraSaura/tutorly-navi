/**
 * Test the message parser with the user's specific example
 */

import { parseUserMessage } from './messageParser';

// Test the user's example
const testMessage = "calcul le ppcm de 30 et 12 est 30";
const result = parseUserMessage(testMessage);

console.log('🧪 Testing Message Parser');
console.log('Input:', testMessage);
console.log('Result:', result);

// Test other French examples
const testCases = [
  "calcul le ppcm de 30 et 12 est 30",
  "ppcm de 30 et 12 est 60", 
  "2+2 est 4",
  "calcul le pgcd de 12 et 8 est 4",
  "What is 2+2?", // Should be question only
  "calcul le ppcm de 30 et 12" // Should be question only
];

console.log('\n📋 Testing Multiple Cases:');
testCases.forEach((testCase, index) => {
  const parsed = parseUserMessage(testCase);
  console.log(`${index + 1}. "${testCase}"`);
  console.log(`   Question: "${parsed.question}"`);
  console.log(`   Answer: "${parsed.answer}"`);
  console.log(`   Has Answer: ${parsed.hasAnswer}`);
  console.log(`   Confidence: ${parsed.confidence}`);
  console.log('');
});
