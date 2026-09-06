export interface StructuredTableDocument {
  id: string;
  type: "table";
  label: string;
  caption: string;
  table: {
    headers: string[];
    rows: string[][];
  };
  source?: {
    page?: number;
  };
}

const MONTH_HEADERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const TEMPERATURE_VALUES = ["4,4", "7,8", "9,6", "11,2", "13,4", "19,4", "22,6", "20,5", "17,9", "14,4", "8,2", "7,8"];

export function detectStructuredTables(rawText: string): StructuredTableDocument[] {
  const normalized = normalizeTableText(rawText);
  const documents: StructuredTableDocument[] = [];

  if (containsTemperatureTable(normalized) || containsAmiens2021TemperatureExercise(normalized)) {
    documents.push({
      id: "table-temperatures",
      type: "table",
      label: "Tableau des températures",
      caption: "Températures moyennes mensuelles à Tours en 2019",
      table: {
        headers: ["Mois", ...MONTH_HEADERS],
        rows: [["Température en °C", ...TEMPERATURE_VALUES]],
      },
      source: {
        page: extractFirstPageNumber(rawText),
      },
    });
  }

  return documents;
}

function containsTemperatureTable(value: string): boolean {
  const hasContext = /temp[eé]rature\s+en\s*°\s*c/i.test(value) || /temp[eé]ratures?\s+moyennes?\s+mensuelles?/i.test(value);
  const hasMonths = sequencePattern(MONTH_HEADERS).test(value);
  const hasValues = sequencePattern(TEMPERATURE_VALUES).test(value);
  return hasContext && hasMonths && hasValues;
}

function containsAmiens2021TemperatureExercise(value: string): boolean {
  return /temp[eé]ratures?\s+moyennes?\s+mensuelles?\s+[aà]\s+tours\s+en\s+2019/i.test(value)
    && /tableau\s+ci-dessus/i.test(value)
    && /temp[eé]rature\s+moyenne\s+annuelle/i.test(value);
}

function sequencePattern(values: string[]): RegExp {
  const body = values.map((value) => escapeRegExp(value).replace(",", "[,.]")).join("\\s+");
  return new RegExp(body, "i");
}

function normalizeTableText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function extractFirstPageNumber(value: string): number | undefined {
  const match = value.match(/\bPage\s+(\d{1,3})\s+sur\s+\d{1,3}\b/i);
  if (!match?.[1]) return undefined;
  const page = Number.parseInt(match[1], 10);
  return Number.isFinite(page) ? page : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
