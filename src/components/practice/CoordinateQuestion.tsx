import { useTranslation } from 'react-i18next';
import { useCoordinateEligibility } from '@/hooks/useCoordinateEligibility';
import { CoordinatePlaneActivity } from './CoordinatePlaneActivity';
import type { CoordinateAnswer, CoordinatePlaneExercise } from '@/features/practice/coordinatePlane';

export function CoordinateQuestion({ exercise, disabled, onChange, onComplete }: {
  exercise: CoordinatePlaneExercise; disabled?: boolean;
  onChange?: (state: CoordinateAnswer) => void; onComplete?: (state: CoordinateAnswer) => void;
}) {
  const eligibility = useCoordinateEligibility();
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'fr';
  if (eligibility.pending) return <p role="status">Vérification du niveau scolaire…</p>;
  if (!eligibility.allowed) return <p role="alert">Cet exercice de coordonnées est réservé au programme français de 5ème. Vérifie le niveau du profil ou l’affectation de la banque.</p>;
  return <CoordinatePlaneActivity key={`${eligibility.sessionKey}:${exercise.id}`} exercise={exercise} language={language} disabled={disabled} onChange={onChange} onComplete={onComplete} />;
}
