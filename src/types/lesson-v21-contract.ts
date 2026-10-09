export type ContractIssue = { path: string; message: string; expected?: string; received?: string };

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const array = (v: unknown): v is unknown[] => Array.isArray(v);
const answers = ['multiple_choice', 'numeric', 'time', 'short_text', 'text', 'selection', 'ordering'];
const visuals = ['clock','timeline','number_line','fraction_bar','fraction_circle','triangle','rectangle','circle','polygon','angle','symmetry','coordinate_plane','geometric_solid','solid_section','measurement','unit_conversion','groups','comparison','part_whole','table','equation','diagram','sequence'];

export function validateLessonV21(value: unknown): { success: true } | { success: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const bad = (path: string, message: string, expected?: string, received?: unknown) => issues.push({ path, message, expected, received: received === undefined ? undefined : Array.isArray(received) ? 'array' : typeof received });
  const required = (v: Record<string, unknown>, path: string, fields: string[]) => fields.forEach((f) => { if (!text(v[f])) bad(`${path}.${f}`, 'Required non-empty string', 'string', v[f]); });
  const stringArray = (v: unknown, path: string, min = 0, max = Infinity) => { if (!array(v) || v.length < min || v.length > max || v.some((x) => !text(x))) bad(path, `Expected ${min}–${max === Infinity ? 'many' : max} non-empty strings`, 'array', v); };
  const structured = (v: unknown, path: string, fields: string[]) => { if (!array(v)) return bad(path, 'Expected array', 'array', v); v.forEach((x, i) => { const p = `${path}[${i}]`; if (!obj(x)) return bad(p, 'Expected object'); required(x, p, fields); }); };
  const visual = (v: unknown, path: string) => { if (!obj(v)) return bad(path, 'Expected object'); if (!visuals.includes(String(v.kind))) bad(`${path}.kind`, 'Unsupported visual kind'); if (v.alt_text !== undefined && !text(v.alt_text)) bad(`${path}.alt_text`, 'Expected string'); if (v.purpose !== undefined && !text(v.purpose)) bad(`${path}.purpose`, 'Expected string'); };
  const conceptPresentation = (v: Record<string, unknown>, path: string) => {
    if (v.key_points !== undefined) {
      if (!array(v.key_points) || v.key_points.length < 1 || v.key_points.length > 6) bad(`${path}.key_points`, 'Expected 1–6 key points', 'array(1..6)', v.key_points);
      else v.key_points.forEach((point, i) => { const p = `${path}.key_points[${i}]`; if (!obj(point)) return bad(p, 'Expected object'); required(point, p, ['label', 'text']); });
    }
    if (v.takeaway !== undefined && !text(v.takeaway)) bad(`${path}.takeaway`, 'Expected string');
    if (v.visual !== undefined) visual(v.visual, `${path}.visual`);
  };
  const prerequisite = (v: unknown, path: string) => {
    if (!obj(v)) return bad(path, 'Expected object');
    required(v, path, ['id', 'description', 'check_question', 'remediation_hint']);
    const answerType = String(v.answer_type ?? '');
    if (!answers.includes(answerType)) bad(`${path}.answer_type`, 'Unsupported or missing prerequisite answer type');
    if (v.expected_answer === undefined || (typeof v.expected_answer === 'string' && !text(v.expected_answer))) bad(`${path}.expected_answer`, 'Required value');
    const choices = v.choices;
    if (choices !== undefined && (!array(choices) || choices.some((choice) => !text(choice)))) bad(`${path}.choices`, 'Expected string array');
    if (['multiple_choice', 'selection'].includes(answerType)) {
      if (!array(choices) || choices.length < 2) bad(`${path}.choices`, 'Multiple-choice prerequisite requires at least 2 choices');
      else if (!choices.some((choice) => String(choice).trim().toLowerCase() === String(v.expected_answer).trim().toLowerCase())) bad(`${path}.expected_answer`, 'Expected answer must be one of the choices');
    }
    if (answerType === 'numeric' && !/^[-+]?\d+(?:[.,]\d+)?$/.test(String(v.expected_answer).trim())) bad(`${path}.expected_answer`, 'Numeric prerequisite requires a numeric expected answer');
    if (answerType === 'time' && !(/^\s*\d{1,2}\s*(?:h|heures?)\s*\d{1,2}\s*(?:min|minutes?)?\.?\s*$/i.test(String(v.expected_answer)) || /^\s*\d{1,2}\s*(?:h|heures?)\s*$/i.test(String(v.expected_answer)) || /^\s*\d{1,2}:\d{2}\s*$/.test(String(v.expected_answer)))) bad(`${path}.expected_answer`, 'Time prerequisite requires an hour/minute expected answer');
    const question = String(v.check_question ?? '').toLowerCase();
    if (/(aiguille|quelle forme|identifier|reconna[iî]tre)/.test(question) && ['numeric', 'time'].includes(answerType)) bad(`${path}.answer_type`, 'Identification question requires multiple_choice, selection, or short_text');
    if (v.visual !== undefined) visual(v.visual, `${path}.visual`);
  };
  const question = (v: unknown, path: string) => { if (!obj(v)) return bad(path, 'Expected object'); required(v, path, ['id', 'question', 'skill', 'success_feedback', 'error_feedback']); if (!answers.includes(String(v.answer_type))) bad(`${path}.answer_type`, 'Unsupported answer type'); if (v.correct_answer === undefined) bad(`${path}.correct_answer`, 'Required value'); if (typeof v.difficulty !== 'string' && typeof v.difficulty !== 'number') bad(`${path}.difficulty`, 'Expected string or number'); if (v.choices !== undefined && (!array(v.choices) || v.choices.some((x) => !text(x)))) bad(`${path}.choices`, 'Expected string array'); };
  const block = (v: unknown, path: string) => {
    if (!obj(v)) return bad(path, 'Expected object');
    required(v, path, ['id']);
    if (!text(v.type)) return bad(`${path}.type`, 'Required block type');
    const optionalStrings = (field: string) => { if (v[field] !== undefined && !text(v[field])) bad(`${path}.${field}`, 'Expected string'); };
    const optionalHints = () => { if (v.hints !== undefined) stringArray(v.hints, `${path}.hints`); };
    switch (v.type) {
      case 'hook': required(v, path, ['title', 'content']); optionalStrings('representation'); break;
      case 'concept': required(v, path, ['title', 'content']); optionalStrings('representation'); conceptPresentation(v, path); break;
      case 'rule': required(v, path, ['title', 'content']); optionalStrings('representation'); break;
      case 'visual': required(v, path, ['title', 'content']); if (!obj(v.visual)) bad(`${path}.visual`, 'Required object'); else { if (!visuals.includes(String(v.visual.kind))) bad(`${path}.visual.kind`, 'Unsupported visual kind'); if (v.visual.alt_text !== undefined && !text(v.visual.alt_text)) bad(`${path}.visual.alt_text`, 'Expected string'); if (v.visual.purpose !== undefined && !text(v.visual.purpose)) bad(`${path}.visual.purpose`, 'Expected string'); } break;
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
  if (array(value.levels)) value.levels.forEach((level, li) => { const p = `levels[${li}]`; if (!obj(level)) return bad(p, 'Expected object'); required(level, p, ['id', 'title', 'purpose', 'difficulty']); if (typeof level.level_number !== 'number' || !Number.isInteger(level.level_number) || level.level_number < 1) bad(`${p}.level_number`, 'Expected integer >= 1'); if (!array(level.objective_ids) || level.objective_ids.some((id) => !text(id))) bad(`${p}.objective_ids`, 'Expected string array'); if (!obj(level.lesson)) return bad(`${p}.lesson`, 'Expected object'); const l = level.lesson; required(l, `${p}.lesson`, ['lesson_goal']); stringArray(l.success_criteria, `${p}.lesson.success_criteria`, 1, 5); if (!array(l.prerequisites)) bad(`${p}.lesson.prerequisites`, 'Expected array'); else l.prerequisites.forEach((item, index) => prerequisite(item, `${p}.lesson.prerequisites[${index}]`)); structured(l.misconceptions, `${p}.lesson.misconceptions`, ['id', 'description', 'detect_if', 'feedback', 'remediation_strategy']); if (!array(l.sequence) || l.sequence.length < 1) bad(`${p}.lesson.sequence`, 'Expected non-empty array'); else l.sequence.forEach((b, bi) => block(b, `${p}.lesson.sequence[${bi}]`)); if (!obj(l.mastery)) bad(`${p}.lesson.mastery`, 'Expected object'); else { stringArray(l.mastery.skills, `${p}.lesson.mastery.skills`); if (typeof l.mastery.threshold !== 'number' || l.mastery.threshold < 0 || l.mastery.threshold > 1) bad(`${p}.lesson.mastery.threshold`, 'Expected number between 0 and 1'); } });
  return issues.length ? { success: false, issues } : { success: true };
}
