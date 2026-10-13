type LessonBlock = Record<string, unknown>;
export type CanonicalNormalizationEvent = { path: string; from: string; to: string };
export type CanonicalNormalizationResult = { lesson: Record<string, unknown>; events: CanonicalNormalizationEvent[]; errors: Array<{ path: string; message: string }> };

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function normalizeCriteriaValue(value: unknown): string[] {
  const values = Array.isArray(value) ? value : nonEmpty(value) ? [value] : [];
  return values.filter(nonEmpty).map((item) => item.trim()).filter((item, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase() === item.toLocaleLowerCase()) === index).slice(0, 5);
}

function normalizeMasteryMetadata(lesson: LessonBlock, events: CanonicalNormalizationEvent[]): LessonBlock {
  if (!lesson.mastery || typeof lesson.mastery !== 'object' || Array.isArray(lesson.mastery)) return lesson;
  const mastery = lesson.mastery as LessonBlock;
  const normalized = {
    skills: Array.isArray(mastery.skills) ? mastery.skills.filter(nonEmpty).map((skill) => skill.trim()) : [],
    threshold: Number.isFinite(Number(mastery.threshold)) ? Number(mastery.threshold) : 0.8,
  };
  const extraKeys = Object.keys(mastery).filter((key) => !['skills', 'threshold'].includes(key));
  if (extraKeys.length > 0) events.push({ path: 'mastery', from: extraKeys.join(','), to: 'skills,threshold' });
  return { ...lesson, mastery: normalized };
}

/** Normalize only unambiguous structural variants; never invent a criterion. */
function normalizeSuccessCriteria(lesson: LessonBlock, fallback: unknown, events: CanonicalNormalizationEvent[]): LessonBlock {
  const direct = normalizeCriteriaValue(lesson.success_criteria);
  if (direct.length) {
    if (!Array.isArray(lesson.success_criteria) || direct.length !== (lesson.success_criteria as unknown[]).length) events.push({ path: 'success_criteria', from: typeof lesson.success_criteria, to: 'array' });
    return { ...lesson, success_criteria: direct };
  }
  const aliases = ['successCriteria', 'criteria', 'learning_outcomes'].map((key) => ({ key, value: lesson[key] })).find(({ value }) => normalizeCriteriaValue(value).length);
  if (aliases) { events.push({ path: 'success_criteria', from: aliases.key, to: 'array' }); return { ...lesson, success_criteria: normalizeCriteriaValue(aliases.value) }; }
  const derived = normalizeCriteriaValue(fallback);
  if (derived.length) { events.push({ path: 'success_criteria', from: 'planned_success_criteria', to: 'array' }); return { ...lesson, success_criteria: derived }; }
  return lesson;
}
const answerFrom = (candidate: LessonBlock): unknown => {
  if (candidate.correct_answer !== undefined) return candidate.correct_answer;
  const aliases: Array<[string, unknown]> = [['answer', candidate.answer], ['expected_answer', candidate.expected_answer], ['correctAnswer', candidate.correctAnswer]];
  const alias = aliases.find(([, value]) => value !== undefined && (typeof value !== 'string' || value.trim().length > 0));
  if (alias) return alias[1];
  if (typeof candidate.solution === 'string' && candidate.solution.trim().length > 0 && candidate.solution.trim().length <= 200) return candidate.solution.trim();
  if (Array.isArray(candidate.choices)) {
    // A choice-derived answer is safe only when exactly one option is marked
    // correct. Selecting the first marked option would silently turn an
    // ambiguous provider response into a mathematically/pedagogically false
    // lesson.
    const markedCorrect = candidate.choices.filter((choice) =>
      choice && typeof choice === 'object' && !Array.isArray(choice)
      && ((choice as LessonBlock).correct === true || (choice as LessonBlock).is_correct === true),
    );
    if (markedCorrect.length !== 1) return undefined;
    const correct = markedCorrect[0];
    if (correct && typeof correct === 'object') {
      const value = (correct as LessonBlock).value ?? (correct as LessonBlock).label ?? (correct as LessonBlock).text;
      if (value !== undefined && (typeof value !== 'string' || value.trim().length > 0)) return value;
    }
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

export function normalizeCanonicalAnswers(lesson: Record<string, unknown>, fallbackSuccessCriteria?: unknown): CanonicalNormalizationResult {
  const events: CanonicalNormalizationEvent[] = [];
  const errors: Array<{ path: string; message: string }> = [];
  lesson = normalizeSuccessCriteria(lesson, fallbackSuccessCriteria, events);
  lesson = normalizeMasteryMetadata(lesson, events);
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
