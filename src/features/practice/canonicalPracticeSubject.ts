const SUBJECT_ALIASES: Record<string, string> = {
  math: 'mathematiques', maths: 'mathematiques', mathematics: 'mathematiques', mathematiques: 'mathematiques',
  french: 'francais', francais: 'francais', english: 'anglais', anglais: 'anglais', science: 'sciences', sciences: 'sciences',
  history: 'histoire', histoire: 'histoire', geography: 'geographie', geographie: 'geographie',
};

export function canonicalPracticeSubject(subject: string): string {
  const normalized = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  return SUBJECT_ALIASES[normalized] ?? subject;
}
