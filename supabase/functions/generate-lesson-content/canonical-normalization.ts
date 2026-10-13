type LessonBlock = Record<string, unknown>;
export type CanonicalNormalizationEvent = { path: string; from: string; to: string };
export type CanonicalNormalizationResult = { lesson: Record<string, unknown>; events: CanonicalNormalizationEvent[]; errors: Array<{ path: string; message: string }> };

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const answerFrom = (candidate: LessonBlock): unknown => {
  if (candidate.correct_answer !== undefined) return candidate.correct_answer;
  const aliases: Array<[string, unknown]> = [['answer', candidate.answer], ['expected_answer', candidate.expected_answer], ['correctAnswer', candidate.correctAnswer]];
  const alias = aliases.find(([, value]) => value !== undefined && (typeof value !== 'string' || value.trim().length > 0));
  if (alias) return alias[1];
  if (typeof candidate.solution === 'string' && candidate.solution.trim().length > 0 && candidate.solution.trim().length <= 200) return candidate.solution.trim();
  if (Array.isArray(candidate.choices)) {
    const correct = candidate.choices.find((choice) => choice && typeof choice === 'object' && !Array.isArray(choice) && ((choice as LessonBlock).correct === true || (choice as LessonBlock).is_correct === true));
    if (correct && typeof correct === 'object') return (correct as LessonBlock).value ?? (correct as LessonBlock).label ?? (correct as LessonBlock).text;
  }
  return undefined;
};

function normalizeQuestion(candidate: LessonBlock, path: string, events: CanonicalNormalizationEvent[], errors: Array<{ path: string; message: string }>): LessonBlock {
  if (!['student_try', 'feedback_checkpoint', 'prediction'].includes(String(candidate.type))) return candidate;
  const answer = answerFrom(candidate);
  if (candidate.correct_answer === undefined && answer !== undefined) {
    const source = candidate.answer !== undefined ? 'answer' : candidate.expected_answer !== undefined ? 'expected_answer' : candidate.correctAnswer !== undefined ? 'correctAnswer' : typeof candidate.solution === 'string' ? 'solution' : 'choices';
    events.push({ path: `${path}.correct_answer`, from: source, to: 'correct_answer' });
    return { ...candidate, correct_answer: answer };
  }
  if (answer === undefined) errors.push({ path: `${path}.correct_answer`, message: 'Interactive block has no safely inferable correct answer.' });
  return candidate;
}

export function normalizeCanonicalAnswers(lesson: Record<string, unknown>): CanonicalNormalizationResult {
  const events: CanonicalNormalizationEvent[] = [];
  const errors: Array<{ path: string; message: string }> = [];
  const sequence = Array.isArray(lesson.sequence) ? lesson.sequence.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const block = raw as LessonBlock;
    const normalized = normalizeQuestion(block, `sequence[${index}]`, events, errors);
    if (normalized.type !== 'mastery_check' || !Array.isArray(normalized.questions)) return normalized;
    const questions = normalized.questions.map((question, questionIndex) => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) return question;
      return normalizeQuestion({ ...(question as LessonBlock), type: 'student_try' }, `sequence[${index}].questions[${questionIndex}]`, events, errors);
    }).map((question) => { if (question && typeof question === 'object' && !Array.isArray(question)) { const copy = { ...(question as LessonBlock) }; delete copy.type; return copy; } return question; });
    return { ...normalized, questions };
  }) : lesson.sequence;
  return { lesson: { ...lesson, sequence }, events, errors };
}
