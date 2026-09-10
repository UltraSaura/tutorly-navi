import type { ColumnFillQ, ColumnFillRow, ColumnFillBlankSpec } from "@/types/quiz-bank";

type Operation = ColumnFillQ["operation"];

type BuildInput = {
  id: string;
  prompt: string;
  operation: Operation;
  firstOperand: number;
  secondOperand: number;
  hint?: string;
  points?: number;
  locale?: "fr" | "en";
  instructions?: string;
};

function padDigits(value: number | string, size: number) {
  return String(value).padStart(size, "0").split("");
}

function makeBlank(id: string, answer: string, kind: ColumnFillBlankSpec["kind"] = "digit", label?: string): ColumnFillBlankSpec {
  return { id, answer, kind, label };
}

function carryRow(carries: Array<string | null>, columns: number): ColumnFillRow {
  return {
    minHeight: 24,
    cells: [
      { kind: "spacer" },
      ...Array.from({ length: columns }, (_, index) => {
        const carry = carries[index] ?? null;
        return carry
          ? { kind: "blank", blankId: `carry-${index}`, className: "text-[13px] text-amber-600 font-semibold" }
          : { kind: "spacer" };
      }),
    ],
  };
}

function blankDigits(prefix: string, digits: string[], kind: ColumnFillBlankSpec["kind"] = "digit") {
  return digits.map((digit, index) => ({
    kind: "blank" as const,
    blankId: `${prefix}-${index}`,
    answer: digit,
    spec: makeBlank(`${prefix}-${index}`, digit, kind),
  }));
}

function additionQuestion(input: BuildInput): ColumnFillQ {
  const top = input.firstOperand;
  const bottom = input.secondOperand;
  const result = top + bottom;
  const width = Math.max(String(top).length, String(bottom).length, String(result).length);
  const topDigits = padDigits(top, width);
  const bottomDigits = padDigits(bottom, width);
  const resultDigits = padDigits(result, width);

  const carries: Array<string | null> = Array.from({ length: width }, () => null);
  let carry = 0;
  for (let col = width - 1; col >= 0; col -= 1) {
    const sum = Number(topDigits[col]) + Number(bottomDigits[col]) + carry;
    carry = sum >= 10 ? 1 : 0;
    if (carry && col > 0) carries[col - 1] = "1";
  }

  const carrySpecs = carries.flatMap((value, index) => value ? [makeBlank(`carry-${index}`, value, "carry")] : []);
  const resultBlanks = blankDigits("result", resultDigits, "digit");

  return {
    id: input.id,
    kind: "column-fill",
    prompt: input.prompt,
    hint: input.hint,
    points: input.points,
    operation: "addition",
    operands: [String(top), String(bottom)],
    locale: input.locale ?? "fr",
    instructions: input.instructions ?? "Complète les retenues et le résultat de l'addition posée.",
    layout: {
      columns: width + 1,
      rows: [
        carryRow(carries, width),
        {
          cells: [
            { kind: "spacer" },
            ...topDigits.map((digit) => ({ kind: "text" as const, text: digit })),
          ],
        },
        {
          cells: [
            { kind: "text", text: "+" },
            ...bottomDigits.map((digit) => ({ kind: "text" as const, text: digit })),
          ],
        },
        {
          cells: [
            { kind: "spacer", borderTop: true },
            ...Array.from({ length: width }, () => ({ kind: "spacer" as const, borderTop: true })),
          ],
        },
        {
          cells: [
            { kind: "spacer" },
            ...resultBlanks.map((blank) => ({ kind: "blank" as const, blankId: blank.blankId })),
          ],
        },
      ],
    },
    blanks: [...carrySpecs, ...resultBlanks.map((blank) => blank.spec)],
  };
}

function subtractionQuestion(input: BuildInput): ColumnFillQ {
  const top = Math.max(input.firstOperand, input.secondOperand);
  const bottom = Math.min(input.firstOperand, input.secondOperand);
  const result = top - bottom;
  const width = Math.max(String(top).length, String(bottom).length, String(result).length);
  const topDigits = padDigits(top, width);
  const bottomDigits = padDigits(bottom, width);
  const resultDigits = padDigits(result, width);

  const borrowMarkers: Array<string | null> = Array.from({ length: width }, () => null);
  let borrow = 0;
  for (let col = width - 1; col >= 0; col -= 1) {
    let currentTop = Number(topDigits[col]) - borrow;
    const currentBottom = Number(bottomDigits[col]);
    if (currentTop < currentBottom && col > 0) {
      borrowMarkers[col - 1] = "1";
      currentTop += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }
  }

  const borrowSpecs = borrowMarkers.flatMap((value, index) => value ? [makeBlank(`borrow-${index}`, value, "borrow")] : []);
  const resultBlanks = blankDigits("result", resultDigits, "digit");

  return {
    id: input.id,
    kind: "column-fill",
    prompt: input.prompt,
    hint: input.hint,
    points: input.points,
    operation: "subtraction",
    operands: [String(top), String(bottom)],
    locale: input.locale ?? "fr",
    instructions: input.instructions ?? "Complète les emprunts et le résultat de la soustraction posée.",
    layout: {
      columns: width + 1,
      rows: [
        {
          minHeight: 24,
          cells: [
            { kind: "spacer" },
            ...borrowMarkers.map((marker, index) =>
              marker
                ? { kind: "blank" as const, blankId: `borrow-${index}`, className: "text-[13px] text-amber-600 font-semibold" }
                : { kind: "spacer" as const }),
          ],
        },
        {
          cells: [
            { kind: "spacer" },
            ...topDigits.map((digit) => ({ kind: "text" as const, text: digit })),
          ],
        },
        {
          cells: [
            { kind: "text", text: "−" },
            ...bottomDigits.map((digit) => ({ kind: "text" as const, text: digit })),
          ],
        },
        {
          cells: [
            { kind: "spacer", borderTop: true },
            ...Array.from({ length: width }, () => ({ kind: "spacer" as const, borderTop: true })),
          ],
        },
        {
          cells: [
            { kind: "spacer" },
            ...resultBlanks.map((blank) => ({ kind: "blank" as const, blankId: blank.blankId })),
          ],
        },
      ],
    },
    blanks: [...borrowSpecs, ...resultBlanks.map((blank) => blank.spec)],
  };
}

function multiplicationQuestion(input: BuildInput): ColumnFillQ {
  const top = input.firstOperand;
  const bottom = input.secondOperand;
  const result = top * bottom;
  const width = Math.max(String(top).length, String(bottom).length, String(result).length);
  const topDigits = padDigits(top, width);
  const bottomDigits = padDigits(bottom, width);
  const resultDigits = padDigits(result, width);
  const resultBlanks = blankDigits("result", resultDigits, "digit");

  return {
    id: input.id,
    kind: "column-fill",
    prompt: input.prompt,
    hint: input.hint,
    points: input.points,
    operation: "multiplication",
    operands: [String(top), String(bottom)],
    locale: input.locale ?? "fr",
    instructions: input.instructions ?? "Complète le résultat de la multiplication posée.",
    layout: {
      columns: width + 1,
      rows: [
        {
          cells: [
            { kind: "spacer" },
            ...topDigits.map((digit) => ({ kind: "text" as const, text: digit })),
          ],
        },
        {
          cells: [
            { kind: "text", text: "×" },
            ...bottomDigits.map((digit) => ({ kind: "text" as const, text: digit })),
          ],
        },
        {
          cells: [
            { kind: "spacer", borderTop: true },
            ...Array.from({ length: width }, () => ({ kind: "spacer" as const, borderTop: true })),
          ],
        },
        {
          cells: [
            { kind: "spacer" },
            ...resultBlanks.map((blank) => ({ kind: "blank" as const, blankId: blank.blankId })),
          ],
        },
      ],
    },
    blanks: resultBlanks.map((blank) => blank.spec),
  };
}

function divisionQuestion(input: BuildInput): ColumnFillQ {
  const dividend = input.firstOperand;
  const divisor = input.secondOperand;
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const quotientDigits = String(quotient).split("");
  const quotientBlanks = blankDigits("quotient", quotientDigits, "quotient");
  const remainderDigits = String(remainder).split("");
  const remainderBlanks = remainderDigits.map((digit, index) => ({
    kind: "blank" as const,
    blankId: `remainder-${index}`,
    spec: makeBlank(`remainder-${index}`, digit, "remainder"),
  }));
  const columns = Math.max(String(dividend).length + 3, quotientDigits.length + 3);

  return {
    id: input.id,
    kind: "column-fill",
    prompt: input.prompt,
    hint: input.hint,
    points: input.points,
    operation: "division",
    operands: [String(dividend), String(divisor)],
    locale: input.locale ?? "fr",
    instructions: input.instructions ?? "Complète le quotient et le reste de la division posée.",
    layout: {
      columns,
      rows: [
        {
          cells: [
            ...String(dividend).split("").map((digit) => ({ kind: "text" as const, text: digit })),
            { kind: "text", text: "│", className: "text-slate-900" },
            ...quotientBlanks.map((blank) => ({ kind: "blank" as const, blankId: blank.blankId })),
          ],
        },
        {
          cells: [
            { kind: "spacer", colSpan: String(dividend).length },
            { kind: "text", text: "└", className: "text-slate-900" },
            { kind: "text", text: String(divisor), borderTop: true, colSpan: Math.max(1, quotientDigits.length) },
          ],
        },
        {
          cells: [
            { kind: "text", text: "R", className: "text-slate-600 text-sm" },
            ...remainderBlanks.map((blank) => ({ kind: "blank" as const, blankId: blank.blankId })),
          ],
        },
      ],
    },
    blanks: [...quotientBlanks.map((blank) => blank.spec), ...remainderBlanks.map((blank) => blank.spec)],
  };
}

export function buildColumnFillQuestion(input: BuildInput): ColumnFillQ {
  switch (input.operation) {
    case "addition":
      return additionQuestion(input);
    case "subtraction":
      return subtractionQuestion(input);
    case "multiplication":
      return multiplicationQuestion(input);
    case "division":
      return divisionQuestion(input);
    default:
      return additionQuestion(input);
  }
}
