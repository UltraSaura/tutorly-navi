import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUserCurriculumProfile } from '@/hooks/useUserCurriculumProfile';
import type { LearningStyle } from '@/types/learning-style';

const COUNTRIES = [
  { code: 'fr', flag: '🇫🇷', label: 'France' },
  { code: 'be', flag: '🇧🇪', label: 'Belgique' },
  { code: 'ch', flag: '🇨🇭', label: 'Suisse' },
] as const;

const LEVELS_BY_COUNTRY: Record<string, { code: string; label: string; age: string }[]> = {
  fr: [
    { code: 'CP', label: 'CP', age: '6-7 ans' },
    { code: 'CE1', label: 'CE1', age: '7-8 ans' },
    { code: 'CE2', label: 'CE2', age: '8-9 ans' },
    { code: 'CM1', label: 'CM1', age: '9-10 ans' },
    { code: 'CM2', label: 'CM2', age: '10-11 ans' },
    { code: '6eme', label: '6ème', age: '11-12 ans' },
  ],
  be: [
    { code: 'P3', label: '3ème primaire', age: '8-9 ans' },
    { code: 'P4', label: '4ème primaire', age: '9-10 ans' },
    { code: 'P5', label: '5ème primaire', age: '10-11 ans' },
    { code: 'P6', label: '6ème primaire', age: '11-12 ans' },
  ],
  ch: [
    { code: 'CM1', label: '5ème HarmoS', age: '9-10 ans' },
    { code: 'CM2', label: '6ème HarmoS', age: '10-11 ans' },
  ],
};

const LEARNING_STYLES: {
  value: LearningStyle;
  emoji: string;
  label: string;
  description: string;
}[] = [
  {
    value: 'visual',
    emoji: '👀',
    label: 'En images',
    description: "J'aime les dessins, les couleurs et les exemples visuels.",
  },
  {
    value: 'auditory',
    emoji: '👂',
    label: 'En écoutant',
    description: "J'aime les phrases simples, les histoires et répéter à voix haute.",
  },
  {
    value: 'kinesthetic',
    emoji: '✋',
    label: 'En pratiquant',
    description: "J'aime dessiner, bouger, trier et essayer moi-même.",
  },
  {
    value: 'mixed',
    emoji: '🌈',
    label: 'Un peu de tout',
    description: "J'aime varier les façons d'apprendre.",
  },
];

export function OnboardingWizard() {
  const ui = useInterfaceTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { updateProfile } = useUserCurriculumProfile();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedCountry, setSelectedCountry] = useState('fr');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<LearningStyle | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const levels = LEVELS_BY_COUNTRY[selectedCountry] ?? LEVELS_BY_COUNTRY.fr;

  const handleComplete = async (style: LearningStyle) => {
    if (!user?.id || !selectedLevel) return;
    setIsSaving(true);

    try {
      await new Promise<void>((resolve, reject) => {
        updateProfile(
          { countryCode: selectedCountry, levelCode: selectedLevel },
          {
            onSuccess: () => resolve(),
            onError: (err: unknown) => reject(err),
          }
        );
      });

      const { error } = await supabase
        .from('users')
        .update({ style })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['userCurriculumProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['learning-subjects'] }),
      ]);
    } catch (err) {
      console.error('[OnboardingWizard] Save failed:', err);
      setIsSaving(false);
    }
  };

  const stepTitles = [
    'Dans quel pays es-tu ?',
    'Quelle est ta classe ?',
    'Comment tu apprends le mieux ?',
  ];

  const stepDescriptions = [
    "Stuwy s'adapte au programme de ton pays.",
    'On va te proposer le bon contenu pour ton niveau.',
    "Stuwy adapte ses explications à ta façon d'apprendre.",
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F3F6FA',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 96,
      }}
    >
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 8,
                borderRadius: 4,
                width: i === step ? 24 : 8,
                background: i <= step ? '#12C6A0' : '#EAECEF',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {step > 0 && (
          <button
            onClick={() => setStep((step - 1) as 0 | 1 | 2)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#667085',
              fontSize: 13,
              fontFamily: 'Poppins, sans-serif',
              marginBottom: 16,
              padding: 0,
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {ui("Retour")}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ flex: 1, padding: '0 20px' }}
        >
          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 6px',
                fontFamily: 'Poppins, sans-serif',
                lineHeight: 1.3,
              }}
            >
              {stepTitles[step]}
            </h2>
            <p style={{ fontSize: 13, color: '#667085', margin: 0, lineHeight: 1.6 }}>
              {stepDescriptions[step]}
            </p>
          </div>

          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setSelectedLevel('');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `1.5px solid ${selectedCountry === country.code ? '#12C6A0' : '#EAECEF'}`,
                    background: selectedCountry === country.code ? '#F2FBF8' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{country.flag}</span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0F172A',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    {country.label}
                  </span>
                  {selectedCountry === country.code && (
                    <div style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%', background: '#12C6A0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check className="h-3.5 w-3.5" style={{ color: 'white' }} />
                    </div>
                  )}
                </button>
              ))}

              <button
                onClick={() => setStep(1)}
                disabled={!selectedCountry}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: 14,
                  borderRadius: 14,
                  border: 'none',
                  background: '#12C6A0',
                  color: '#0F172A',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {ui("Continuer")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {levels.map((level) => (
                  <button
                    key={level.code}
                    onClick={() => setSelectedLevel(level.code)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 14,
                      border: `1.5px solid ${selectedLevel === level.code ? '#12C6A0' : '#EAECEF'}`,
                      background: selectedLevel === level.code ? '#F2FBF8' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: '0 0 3px',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                    >
                      {level.label}
                    </p>
                    <p style={{ fontSize: 11, color: '#667085', margin: 0 }}>
                      {level.age}
                    </p>
                    {selectedLevel === level.code && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#12C6A0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check className="h-2.5 w-2.5" style={{ color: 'white' }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (selectedLevel) setStep(2);
                }}
                disabled={!selectedLevel}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: 14,
                  borderRadius: 14,
                  border: 'none',
                  background: selectedLevel ? '#12C6A0' : '#EAECEF',
                  color: selectedLevel ? '#0F172A' : '#B4B2A9',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: selectedLevel ? 'pointer' : 'not-allowed',
                  fontFamily: 'Poppins, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {ui("Continuer")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LEARNING_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => {
                    setSelectedStyle(style.value);
                    void handleComplete(style.value);
                  }}
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `1.5px solid ${selectedStyle === style.value ? '#12C6A0' : '#EAECEF'}`,
                    background: selectedStyle === style.value ? '#F2FBF8' : 'white',
                    cursor: isSaving ? 'wait' : 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'all 0.15s',
                    opacity: isSaving && selectedStyle !== style.value ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{style.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#0F172A',
                        margin: '0 0 2px',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                    >
                      {style.label}
                    </p>
                    <p style={{ fontSize: 11, color: '#667085', margin: 0, lineHeight: 1.5 }}>
                      {style.description}
                    </p>
                  </div>
                  {isSaving && selectedStyle === style.value && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #12C6A0', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                  )}
                </button>
              ))}

              <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                {ui("Tu pourras changer ton style dans ton profil à tout moment.")}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{ padding: '0 20px 8px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>
          {ui("🎓 Stuwy s'adapte à")} <strong>{ui("toi")}</strong>
        </p>
      </div>
    </div>
  );
}
