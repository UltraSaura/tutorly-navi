type PedagogyIssue = { path: string; message: string };

export function pedagogicalIssues(lesson: Record<string, unknown>, grade: string, topicName: string): PedagogyIssue[] {
  const issues: PedagogyIssue[] = [];
  const primary = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'].includes(grade);
  if (!primary) return issues;
  const sequence = Array.isArray(lesson.sequence) ? lesson.sequence as Array<Record<string, unknown>> : [];
  const concepts = sequence.filter((block) => block.type === 'concept');
  concepts.forEach((block) => {
    const conceptIndex = sequence.indexOf(block);
    const content = typeof block.content === 'string' ? block.content.trim() : '';
    const words = content ? content.split(/\s+/).length : 0;
    if (words > 90) issues.push({ path: `sequence[${conceptIndex}].content`, message: `Concept trop long (${words} mots); découper en petites idées.` });
    const visualData = block.visual && typeof block.visual === 'object' ? (block.visual as Record<string, unknown>).data : null;
    const visualKind = block.visual && typeof block.visual === 'object' ? String((block.visual as Record<string, unknown>).kind ?? '') : '';
    const visibleClockIdea = /aiguille|heure exacte|heure pile/i.test(content);
    if (visibleClockIdea && (!block.visual || visualKind !== 'clock')) issues.push({ path: `sequence[${conceptIndex}].visual`, message: 'Ce concept d’heure doit fournir un visuel clock déterministe.' });
    if (visibleClockIdea && visualKind === 'clock' && visualData && typeof visualData === 'object') {
      const d = visualData as Record<string, unknown>;
      const statedHour = content.match(/(?:petite aiguille|heure)[^\d]{0,30}(\d{1,2})/i)?.[1];
      if (statedHour && Number(d.hour) !== Number(statedHour)) issues.push({ path: `sequence[${conceptIndex}].visual.data.hour`, message: 'L’heure du visuel ne correspond pas au texte du concept.' });
      if (/grande aiguille[^.]{0,30}(?:sur )?12/i.test(content) && Number(d.minute ?? 0) !== 0) issues.push({ path: `sequence[${conceptIndex}].visual.data.minute`, message: 'La grande aiguille sur 12 exige minute=0.' });
    }
    if (block.visual && !Array.isArray(block.key_points)) issues.push({ path: `sequence[${conceptIndex}].key_points`, message: 'Un concept visuel doit séparer ses idées en key_points.' });
    if (block.visual && typeof block.takeaway !== 'string' ) issues.push({ path: `sequence[${conceptIndex}].takeaway`, message: 'Un concept visuel doit fournir un takeaway.' });
  });
  const hasInteraction = sequence.some((block) => ['prediction', 'student_try', 'feedback_checkpoint'].includes(String(block.type)));
  if (!hasInteraction) issues.push({ path: 'sequence', message: 'Le niveau primaire doit proposer une interaction avant la maîtrise.' });
  const visualTopic = /durée|heure|fraction|angle|triangle|rectangle|cercle|géométr|repère|solide|conversion/i.test(`${topicName} ${String(lesson.lesson_goal ?? '')}`);
  const hasVisual = sequence.some((block) => block.type === 'visual');
  if (visualTopic && !hasVisual) issues.push({ path: 'sequence', message: 'Ce concept bénéficie d’un visuel pédagogique déterministe.' });
  return issues;
}
