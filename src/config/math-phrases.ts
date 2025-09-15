export const PHRASES = {
  arithmetic: [
    "add","plus","sum","increase by",
    "subtract","minus","difference",
    "times","multiply","product",
    "divide","over","quotient","per","percent","percentage"
  ],
  algebra: [
    "solve for","equation","factor","simplify","expand",
    "roots of","zeroes of","linear equation","quadratic","polynomial"
  ],
  calculus: [
    "derivative of","differentiate","integral of","antiderivative",
    "limit as","rate of change","gradient"
  ],
  geometry: [
    "area of","perimeter of","circumference","volume of",
    "pythagorean","slope of the line","distance between","triangle","circle","rectangle"
  ],
  stats: [
    "mean","median","mode","variance","standard deviation",
    "probability","distribution","expected value"
  ],
  triggers: [
    "calculate","compute","what is","evaluate","find",
    "how much is","result of","equals","is equal to"
  ],
  unknown: []
} as const;

// Symbols / LaTeX cues that almost certainly mean math
export const MATH_SYMBOLS = /[+\-*/×÷^=(){}\[\]<>≤≥√∑∫%]|\\(frac|sqrt|int|sum|log|ln|sin|cos|tan)/i;