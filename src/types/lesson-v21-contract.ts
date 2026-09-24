export type ContractIssue = { path: string; message: string; expected?: string; received?: string };

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const array = (v: unknown): v is unknown[] => Array.isArray(v);
const answers = ['multiple_choice', 'numeric', 'text', 'selection', 'ordering'];
const visuals = ['number_line', 'groups', 'timeline', 'clock', 'comparison', 'part_whole', 'table', 'equation', 'diagram', 'sequence'];

export function validateLessonV21(value: unknown): { success: true } | { success: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const bad = (path: string, message: string, expected?: string, received?: unknown) => issues.push({ path, message, expected, received: received === undefined ? undefined : Array.isArray(received) ? 'array' : typeof received });
  const required = (v: Record<string, unknown>, path: string, fields: string[]) => fields.forEach((f) => { if (!text(v[f])) bad(`${path}.${f}`, 'Required non-empty string', 'string', v[f]); });
  const stringArray = (v: unknown, path: string, min = 0, max = Infinity) => { if (!array(v) || v.length < min || v.length > max || v.some((x) => !text(x))) bad(path, `Expected ${min}–${max === Infinity ? 'many' : max} non-empty strings`, 'array', v); };
  const structured = (v: unknown, path: string, fields: string[]) => { if (!array(v)) return bad(path, 'Expected array', 'array', v); v.forEach((x, i) => { const p = `${path}[${i}]`; if (!obj(x)) return bad(p, 'Expected object'); required(x, p, fields); }); };
  const question = (v: unknown, path: string) => { if (!obj(v)) return bad(path, 'Expected object'); required(v, path, ['id', 'question', 'skill', 'success_feedback', 'error_feedback']); if (!answers.includes(String(v.answer_type))) bad(`${path}.answer_type`, 'Unsupported answer type'); if (v.correct_answer === undefined) bad(`${path}.correct_answer`, 'Required value'); if (typeof v.difficulty !== 'string' && typeof v.difficulty !== 'number') bad(`${path}.difficulty`, 'Expected string or number'); if (v.choices !== undefined && (!array(v.choices) || v.choices.some((x) => !text(x)))) bad(`${path}.choices`, 'Expected string array'); };
  const block = (v: unknown, path: string) => {
    if (!obj(v)) return bad(path, 'Expected object');
    required(v, path, ['id']);
    if (!text(v.type)) return bad(`${path}.type`, 'Required block type');
    const optionalStrings = (field: string) => { if (v[field] !== undefined && !text(v[field])) bad(`${path}.${field}`, 'Expected string'); };
    const optionalHints = () => { if (v.hints !== undefined) stringArray(v.hints, `${path}.hints`); };
    switch (v.type) {
      case 'hook': case 'concept': case 'rule': required(v, path, ['title', 'content']); optionalStrings('representation'); break;
      case 'visual': required(v, path, ['title', 'content']); if (!obj(v.visual)) bad(`${path}.visual`, 'Required object'); else if (!visuals.includes(String(v.visual.kind))) bad(`${path}.visual.kind`, 'Unsupported visual kind'); break;
      case 'prediction': required(v, path, ['question', 'explanation']); if (v.correct_answer === undefined) bad(`${path}.correct_answer`, 'Required value'); if (v.choices !== undefined && (!array(v.choices) || v.choices.length < 2 || v.choices.some((x) => !text(x)))) bad(`${path}.choices`, 'Expected at least 2 strings'); optionalHints(); break;
      case 'guided_example': required(v, path, ['context']); if (!array(v.steps) || v.steps.length < 1) bad(`${path}.steps`, 'Expected non-empty array'); else v.steps.forEach((s, i) => { const p = `${path}.steps[${i}]`; if (!obj(s)) return bad(p, 'Expected object'); required(s, p, ['instruction', 'reason']); if (s.representation !== undefined && !text(s.representation)) bad(`${p}.representation`, 'Expected string'); }); break;
      case 'student_try': case 'feedback_checkpoint': required(v, path, ['question', 'success_feedback', 'error_feedback']); if (!answers.includes(String(v.answer_type))) bad(`${path}.answer_type`, 'Unsupported answer type'); if (v.correct_answer === undefined) bad(`${path}.correct_answer`, 'Required value'); if (v.choices !== undefined && (!array(v.choices) || v.choices.some((x) => !text(x)))) bad(`${path}.choices`, 'Expected string array'); optionalHints(); break;
      case 'contrast': required(v, path, ['title', 'left', 'right', 'explanation']); break;
      case 'worked_example': required(v, path, ['context', 'conclusion']); if (!array(v.steps) || v.steps.length < 1) bad(`${path}.steps`, 'Expected non-empty array'); else v.steps.forEach((s, i) => { const p = `${path}.steps[${i}]`; if (typeof s === 'string') { if (!text(s)) bad(p, 'Expected non-empty string'); } else if (obj(s)) { required(s, p, ['instruction', 'reason']); if (s.representation !== undefined && !text(s.representation)) bad(`${p}.representation`, 'Expected string'); } else bad(p, 'Expected string or object'); }); break;
      case 'reflection': required(v, path, ['question', 'expected_idea']); break;
      case 'mastery_check': if (!array(v.questions) || v.questions.length < 1 || v.questions.length > 4) bad(`${path}.questions`, 'Expected 1–4 questions', 'array(1..4)', v.questions); else v.questions.forEach((q, i) => question(q, `${path}.questions[${i}]`)); break;
      default: bad(`${path}.type`, 'Unsupported block type');
    }
  };
  if (!obj(value)) return { success: false, issues: [{ path: '', message: 'Expected object' }] };
  if (value.version !== '2.1') bad('version', 'Invalid version', '2.1', value.version);
  if (!text(value.topic_goal)) bad('topic_goal', 'Required non-empty string', 'string', value.topic_goal);
  if (!array(value.levels) || value.levels.length < 1 || value.levels.length > 4) bad('levels', 'Expected 1–4 levels', 'array(1..4)', value.levels);
  if (array(value.levels)) value.levels.forEach((level, li) => { const p = `levels[${li}]`; if (!obj(level)) return bad(p, 'Expected object'); required(level, p, ['id', 'title', 'purpose', 'difficulty']); if (typeof level.level_number !== 'number' || !Number.isInteger(level.level_number) || level.level_number < 1) bad(`${p}.level_number`, 'Expected integer >= 1'); if (!array(level.objective_ids) || level.objective_ids.some((id) => !text(id))) bad(`${p}.objective_ids`, 'Expected string array'); if (!obj(level.lesson)) return bad(`${p}.lesson`, 'Expected object'); const l = level.lesson; required(l, `${p}.lesson`, ['lesson_goal']); stringArray(l.success_criteria, `${p}.lesson.success_criteria`, 1, 5); structured(l.prerequisites, `${p}.lesson.prerequisites`, ['id', 'description', 'check_question', 'expected_answer', 'remediation_hint']); structured(l.misconceptions, `${p}.lesson.misconceptions`, ['id', 'description', 'detect_if', 'feedback', 'remediation_strategy']); if (!array(l.sequence) || l.sequence.length < 1) bad(`${p}.lesson.sequence`, 'Expected non-empty array'); else l.sequence.forEach((b, bi) => block(b, `${p}.lesson.sequence[${bi}]`)); if (!obj(l.mastery)) bad(`${p}.lesson.mastery`, 'Expected object'); else { stringArray(l.mastery.skills, `${p}.lesson.mastery.skills`); if (typeof l.mastery.threshold !== 'number' || l.mastery.threshold < 0 || l.mastery.threshold > 1) bad(`${p}.lesson.mastery.threshold`, 'Expected number between 0 and 1'); } });
  return issues.length ? { success: false, issues } : { success: true };
}
