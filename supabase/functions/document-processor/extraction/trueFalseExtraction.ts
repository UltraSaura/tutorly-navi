export type ExtractedExercise = {
  question: string;
  answer: string;
  responseType?: 'true_false';
  choices?: string[];
  groupedProblem?: ExtractedGroupedProblem;
};

export type ExtractedGroupedProblem = {
  responseType: 'grouped_choice_problem';
  answerType: 'true_false';
  title?: string;
  instructions?: string;
  requiresJustification: boolean;
  keepGrouped: true;
  sections: Array<{
    id: string;
    label?: string;
    context?: string;
    rows: Array<{
      id: string;
      label: string;
      prompt: string;
      options: string[];
      answerType: 'true_false';
      requiresJustification: boolean;
    }>;
  }>;
};

const TRUE_FALSE_CHOICES = ['Vrai', 'Faux'];

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function extractSharedContext(text: string, firstAffirmationIndex: number): string {
  const beforeAffirmations = text.slice(0, firstAffirmationIndex);
  const lines = beforeAffirmations
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)
    .filter(line => !/^exercice\b/i.test(line))
    .filter(line => !/vraie?\s+ou\s+fausse?|vrai\s+ou\s+faux|justifi/i.test(line));

  const contextLines = lines.filter(line =>
    /\d+(?:\s*[;,]\s*\d+){2,}/.test(line) ||
    /\b(prix|valeurs?|donn[ée]es?|relev[ée]s?|tableau|liste|s[ée]rie)\b/i.test(line)
  );

  return contextLines.join('\n');
}

export function extractTrueFalseExercises(text: string): ExtractedExercise[] {
  const groupedProblem = extractTrueFalseGroupedProblem(text);
  if (!groupedProblem) return [];

  return [{
    question: text.trim(),
    answer: '',
    responseType: 'true_false',
    choices: TRUE_FALSE_CHOICES,
    groupedProblem,
  }];
}

export function extractTrueFalseGroupedProblem(text: string): ExtractedGroupedProblem | null {
  const looksTrueFalse =
    /vraie?\s+ou\s+fausse?|vrai\s+ou\s+faux/i.test(text) ||
    (text.match(/\bAffirmation\s+[A-Z]\s*[:：]/gi)?.length || 0) >= 2;

  if (!looksTrueFalse) return null;

  const affirmationPattern = /\bAffirmation\s+([A-Z])\s*[:：]\s*([\s\S]*?)(?=\n\s*\bAffirmation\s+[A-Z]\s*[:：]|\bAffirmation\s+[A-Z]\s*[:：]|$)/gi;
  const matches = [...text.matchAll(affirmationPattern)];
  if (matches.length === 0) return null;

  const sharedContext = extractSharedContext(text, matches[0].index ?? 0);
  const title = text.split('\n').map(normalizeLine).find(line => /^Exercice\b/i.test(line));
  const instructions = text
    .split('\n')
    .map(normalizeLine)
    .filter(line => /vraie?\s+ou\s+fausse?|vrai\s+ou\s+faux|chaque\s+r[ée]ponse|justifi/i.test(line))
    .join('\n');
  const requiresJustification = /justifi/i.test(text);

  const rows = matches
    .map((match, index) => {
      const letter = match[1].toUpperCase();
      const statementBlock = normalizeLine(match[2])
        .replace(/\b(?:réponse|reponse|answer|choix)\s*[:\-]?\s*(?:vrai|faux|true|false)\b/gi, '')
        .trim();

      if (!statementBlock) return null;

      return {
        id: `row-${letter || index + 1}`,
        label: letter,
        prompt: statementBlock,
        options: TRUE_FALSE_CHOICES,
        answerType: 'true_false' as const,
        requiresJustification,
      };
    })
    .filter((row): row is ExtractedGroupedProblem['sections'][number]['rows'][number] => Boolean(row));

  if (rows.length === 0) return null;

  return {
    responseType: 'grouped_choice_problem',
    answerType: 'true_false',
    title,
    instructions,
    requiresJustification,
    keepGrouped: true,
    sections: [{
      id: 'section-1',
      context: sharedContext,
      rows,
    }],
  };
}
