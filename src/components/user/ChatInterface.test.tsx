// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import ChatInterface from './ChatInterface';
import type { Exercise, Message } from '@/types/chat';
import type { TutorAdaptiveData } from '@/hooks/useTutorAdaptiveProblem';
import { resources } from '@/i18n/resources';
import * as adaptiveService from '@/services/tutorAdaptiveService';
import * as unitRenderer from '@/features/learning-session/LearningUnitRenderer';

// Only external chat/grading boundaries and unrelated chat widgets are replaced.
// The production owner, adaptive hook/services, dialog, player and remediation renderer are real.
const fixture = vi.hoisted(() => ({
  exercise: undefined as Exercise | undefined,
  events: vi.fn(), ai: vi.fn(), file: vi.fn(), photo: vi.fn(),
  studentId: 'student-1', level: 'CM1', concept: 'division', method: 'local' as 'local' | 'ai',
}));
vi.mock('@/services/learningAnalytics', () => ({ trackLearningInteraction: fixture.events }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: fixture.studentId, user_metadata: { level: fixture.level } } }) }));
vi.mock('@/context/AdminContext', () => ({ useAdmin: () => ({ getActiveSubjects: () => [], selectedModelId: 'test' }) }));
vi.mock('@/context/OverlayContext', () => ({ useOverlay: () => ({ hasActiveOverlay: false }) }));
vi.mock('@/context/SimpleLanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/useChat', () => ({ useChat: () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  return {
    messages, filteredMessages: messages, inputMessage, setInputMessage, isLoading: false,
    addMessage: (message: Message) => setMessages(previous => [...previous, message]),
    clearMessages: () => setMessages([]), removeMessage: vi.fn(),
    handleSendMessage: fixture.ai, handleFileUpload: fixture.file, handlePhotoUpload: fixture.photo,
    calculationState: { isProcessing: false },
  };
} }));
vi.mock('@/hooks/useExercises', () => ({ useExercises: () => ({
  processHomeworkFromChat: async (message: string) => {
    if (!message.includes('=')) return { localGraded: false, isCorrect: false };
    const [question, userAnswer] = message.split('=');
    const count = (fixture.exercise?.attemptCount ?? 0) + 1;
    const isCorrect = userAnswer === '108';
    fixture.exercise = {
      id: 'homework-864', question, userAnswer, expanded: true, subjectId: 'maths',
      conceptId: fixture.concept || undefined, conceptName: 'Division', gradingMethod: fixture.method,
      attemptCount: count, isCorrect, needsRetry: !isCorrect, lastAttemptDate: new Date(),
      attempts: [...(fixture.exercise?.attempts ?? []), {
        id: `attempt-${count}`, answer: userAnswer, isCorrect, timestamp: new Date(), attemptNumber: count,
      }],
    };
    return { exercise: fixture.exercise, localGraded: fixture.method === 'local', isCorrect };
  },
  clearExercises: () => { fixture.exercise = undefined; }, addExercises: vi.fn(),
}) }));
vi.mock('./chat/AIResponse', () => ({ default: ({ messages, onSubmitAnswer, onClearAll }: {
  messages: Message[]; onSubmitAnswer: (question: string, answer: string) => void; onClearAll: () => void;
}) => <section aria-label="Tutor conversation">
  {messages.map(message => <p key={message.id}>{message.content}</p>)}
  {fixture.exercise && <article aria-label="Homework" data-problem-id={fixture.exercise.id}>
    <p>{fixture.exercise.question}</p><p>{fixture.exercise.userAnswer}</p>
    <button onClick={() => onSubmitAnswer(fixture.exercise!.question, '108')}>Retry homework</button>
  </article>}
  <button onClick={onClearAll}>Clear chat</button>
</section> }));
vi.mock('./chat/MessageInput', () => ({ default: ({ inputMessage, setInputMessage, handleSendMessage, handleFileUpload, handlePhotoUpload }: {
  inputMessage: string; setInputMessage: (value: string) => void; handleSendMessage: () => void;
  handleFileUpload: (file: File) => void; handlePhotoUpload: (file: File) => void;
}) => <form onSubmit={event => { event.preventDefault(); handleSendMessage(); }}>
  <input aria-label="Your answer" value={inputMessage} onChange={event => setInputMessage(event.target.value)} />
  <button type="submit">Send</button>
  <button type="button" onClick={() => handleFileUpload(new File(['test'], 'homework.pdf'))}>Upload document</button>
  <button type="button" onClick={() => handlePhotoUpload(new File(['test'], 'homework.png'))}>Upload photo</button>
</form> }));
vi.mock('./chat/WelcomeFox', () => ({ default: () => null }));
vi.mock('./chat/CameraCapture', () => ({ default: () => null }));
vi.mock('./chat/CalculationStatus', () => ({ default: () => null }));
vi.mock('@/components/learning/QuizOverlayController', () => ({ QuizOverlayController: () => null }));
vi.mock('@/components/seo/PageMeta', () => ({ PageMeta: () => null }));

const trustedData: TutorAdaptiveData = {
  prerequisiteRelationships: [{ subjectId: 'maths', prerequisiteConceptId: 'mul:8', targetConceptId: 'division', relationshipType: 'required' }],
  previousMastery: [{ studentId: 'student-1', subjectId: 'maths', conceptId: 'mul:8', status: 'assessed',
    currentScore: 25, bestScore: 25, currentMasteryLevel: 1, bestMasteryLevel: 1, confidence: 0.8,
    totalAttempts: 4, correctAttempts: 1, consecutiveCorrect: 0, consecutiveIncorrect: 3, updatedAt: '2026-09-11T00:00:00Z' }],
};
const i18n = createInstance();
beforeAll(async () => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({
    matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
  await i18n.use(initReactI18next).init({ resources, lng: 'en', fallbackLng: 'en', keySeparator: false, interpolation: { escapeValue: false } });
});
beforeEach(async () => {
  vi.clearAllMocks(); fixture.exercise = undefined; fixture.studentId = 'student-1'; fixture.level = 'CM1'; fixture.concept = 'division'; fixture.method = 'local';
  await i18n.changeLanguage('en');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup(data: TutorAdaptiveData | undefined = trustedData) {
  const tree = () => <I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/chat']}><ChatInterface adaptiveData={data} /></MemoryRouter></I18nextProvider>;
  const rendered = render(tree());
  const user = userEvent.setup();
  const submit = async (answer: string) => {
    await user.clear(screen.getByRole('textbox', { name: 'Your answer' }));
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), `864/8=${answer}`);
    await user.click(screen.getByRole('button', { name: 'Send' }));
  };
  const offer = async () => { await submit('104'); await submit('106'); };
  return { user, submit, offer, rerender: () => rendered.rerender(tree()) };
}
const events = (name: string) => fixture.events.mock.calls.map(([event]) => event).filter(event => event.eventType === name);

describe('Production Tutor remediation handoff (Phase 7.1)', () => {
  it('offers only after two trusted incorrect attempts and mounts the real player by keyboard', async () => {
    const { user, submit } = setup();
    await submit('104');
    expect(screen.queryByRole('button', { name: 'Start the challenge' })).toBeNull();
    await submit('106');
    const start = screen.getByRole('button', { name: 'Start the challenge' });
    start.focus(); await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'A quick challenge to help you' });
    expect(within(dialog).getByRole('progressbar', { name: 'Session progress' })).toBeTruthy();
    expect(within(dialog).getByText('Review the prerequisite: mul:8.')).toBeTruthy();
    expect(events('tutor_remediation_started')).toHaveLength(1);
  });

  it('completes, restores focus and retries the same retained homework without fabricating mastery', async () => {
    const resume = vi.spyOn(adaptiveService, 'resumeTutorAfterRemediation');
    const process = vi.spyOn(adaptiveService, 'processTutorAttempt');
    const { user, offer } = setup();
    await offer();
    const homework = screen.getByRole('article', { name: 'Homework' });
    const conversation = screen.getByRole('region', { name: 'Tutor conversation' });
    const originalHistory = conversation.textContent;
    await user.click(screen.getByRole('button', { name: 'Start the challenge' }));
    await user.click(screen.getByRole('button', { name: 'Return to homework' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('article', { name: 'Homework' })).toBe(homework);
    expect(conversation.textContent).toBe(originalHistory);
    expect(fixture.exercise?.isCorrect).toBe(false);
    expect(fixture.exercise?.userAnswer).toBe('106');
    const resumed = resume.mock.results[0].value;
    expect(resumed).toMatchObject({ problemId: 'homework-864', originalPrompt: '864/8', status: 'resumed' });
    expect(resumed.conversationId).toBe(resume.mock.calls[0][1].conversationId);
    expect(document.activeElement).toBe(screen.getByRole('status'));
    expect(events('tutor_remediation_completed')).toHaveLength(1);
    expect(events('tutor_problem_resumed')[0].metadata.completed).toBe(true);
    expect(process).toHaveBeenCalledTimes(2); // Descriptor completion supplies no attempt.
    await user.click(screen.getByRole('button', { name: 'Retry homework' }));
    await waitFor(() => expect(fixture.exercise?.isCorrect).toBe(true));
    expect(fixture.exercise?.id).toBe('homework-864');
    expect(fixture.exercise?.attemptCount).toBe(3);
    expect(process.mock.calls[2][0].masteryStateMap?.get('mul:8')).toEqual(trustedData.previousMastery![0]);
  });

  it.each(['Exit session', 'Close', 'Escape'])('exits through %s without completion evidence', async exit => {
    const { user, offer } = setup(); await offer();
    await user.click(screen.getByRole('button', { name: 'Start the challenge' }));
    if (exit === 'Escape') await user.keyboard('{Escape}');
    else await user.click(screen.getByRole('button', { name: exit }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeTruthy();
    expect(events('tutor_remediation_completed')).toHaveLength(0);
    expect(events('tutor_problem_resumed')[0].metadata.completed).toBe(false);
    expect(fixture.exercise?.isCorrect).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('status'));
  });

  it('declines and suppresses repeated offers through the existing cooldown', async () => {
    const { user, offer, submit } = setup(); await offer();
    await user.click(screen.getByRole('button', { name: 'Continue in Tutor' }));
    await submit('105'); await submit('107');
    expect(screen.queryByRole('button', { name: 'Start the challenge' })).toBeNull();
    expect(events('tutor_remediation_offered')).toHaveLength(1);
    expect(events('tutor_remediation_started')).toHaveLength(0);
    expect(events('tutor_remediation_completed')).toHaveLength(0);
    expect(fixture.exercise?.needsRetry).toBe(true);
  });

  it.each(['no concept', 'no prerequisites', 'AI grading'])('fails open with %s', async condition => {
    if (condition === 'no concept') fixture.concept = '';
    if (condition === 'AI grading') fixture.method = 'ai';
    const { offer } = setup(condition === 'no prerequisites' ? {} : trustedData);
    await offer();
    expect(screen.queryByRole('button', { name: 'Start the challenge' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeTruthy();
    expect(events('tutor_remediation_offered')).toHaveLength(0);
  });

  it('uses French older-learner copy throughout the detour', async () => {
    fixture.level = '3e'; await i18n.changeLanguage('fr');
    const { user, offer } = setup(); await offer();
    await user.click(screen.getByRole('button', { name: 'Réviser le prérequis' }));
    expect(screen.getByRole('dialog', { name: 'Réviser un prérequis' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Progression de la session' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reprendre le devoir' }));
    expect(screen.getByRole('status').textContent).toContain('Reprenons le problème initial.');
  });

  it('clears stale remediation with chat and hides it on an account change', async () => {
    const { user, offer, rerender } = setup(); await offer();
    fixture.studentId = 'student-2'; rerender();
    expect(screen.queryByRole('button', { name: 'Start the challenge' })).toBeNull();
    fixture.studentId = 'student-1'; rerender();
    expect(screen.queryByRole('button', { name: 'Start the challenge' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Clear chat' }));
    await offer();
    expect(screen.getByRole('button', { name: 'Start the challenge' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Clear chat' }));
    expect(screen.queryByRole('button', { name: 'Start the challenge' })).toBeNull();
    expect(screen.queryByRole('article', { name: 'Homework' })).toBeNull();
  });

  it('keeps homework available if the remediation renderer fails', async () => {
    const { user, offer } = setup(); await offer();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(unitRenderer, 'LearningUnitRenderer').mockImplementation(() => { throw new Error('Renderer unavailable'); });
    await user.click(screen.getByRole('button', { name: 'Start the challenge' }));
    expect(screen.getByRole('alert').textContent).toContain('Your homework is still available.');
    await user.click(screen.getByRole('button', { name: 'Continue in Tutor' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fixture.exercise?.id).toBe('homework-864');
    expect(fixture.exercise?.isCorrect).toBe(false);
    expect(events('tutor_remediation_completed')).toHaveLength(0);
  });

  it('preserves normal text and document/photo upload entry points', async () => {
    const { user } = setup({});
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Help me understand division');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(fixture.ai).toHaveBeenCalled();
    expect(events('tutor_adaptive_attempt_processed')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Upload document' }));
    await user.click(screen.getByRole('button', { name: 'Upload photo' }));
    expect(fixture.file.mock.calls[0][0].name).toBe('homework.pdf');
    expect(fixture.photo.mock.calls[0][0].name).toBe('homework.png');
  });
});
