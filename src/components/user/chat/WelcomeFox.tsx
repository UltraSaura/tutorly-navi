import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { motion } from 'framer-motion';
import { Calculator, CheckCircle2, FileImage, MessageCircleQuestion } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface WelcomeFoxProps {
  userName?: string | null;
}

type WelcomeCopy = {
  greeting: string;
  helper: string;
  benefits: [string, string, string];
  examplesTitle: string;
  examples: [string, string, string];
};

const MESSAGES: Record<string, WelcomeCopy> = {
  en: {
    greeting: 'Hi',
    helper: "Send me your homework or type your question. I'll guide you step by step!",
    benefits: ['Clear explanations', 'Hints when you need them', 'No ready-made answer'],
    examplesTitle: 'A few examples',
    examples: ['A math exercise', 'Homework from a photo', 'A lesson question'],
  },
  fr: {
    greeting: 'Salut',
    helper: 'Envoie ton devoir ou écris ta question. Je vais te guider étape par étape !',
    benefits: ['Des explications claires', 'Des indices si besoin', 'Pas la réponse toute faite'],
    examplesTitle: 'Quelques exemples',
    examples: ['Un exercice de maths', 'Un devoir en photo', 'Une question de cours'],
  },
};

const resolveFirstName = (
  profileFirstName: string | undefined,
  fullName: string | undefined,
  email: string | undefined,
  fallback: string,
): string => {
  const fromProfile = profileFirstName?.trim();
  if (fromProfile) return fromProfile;
  const fromFull = fullName?.trim().split(/\s+/)[0];
  if (fromFull) return fromFull;
  const fromEmail = email?.split('@')[0];
  if (fromEmail) return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  return fallback;
};

export function WelcomeFox({ userName }: WelcomeFoxProps) {
  const ui = useInterfaceTranslation();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { language } = useLanguage();

  const isFr = language === 'fr';
  const firstName = userName
    ? userName.trim().split(' ')[0]
    : resolveFirstName(
        profile?.firstName,
        user?.user_metadata?.full_name as string | undefined,
        user?.email ?? undefined,
        isFr ? 'Élève' : 'Student',
      );
  const messages = MESSAGES[language] ?? MESSAGES.en;
  const exampleIcons = [Calculator, FileImage, MessageCircleQuestion] as const;

  return (
    <div className="w-full bg-white px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-4xl"
      >
        <section className="relative overflow-hidden rounded-[32px] border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70 px-3 pb-3 pt-4 shadow-[0_18px_50px_rgba(91,92,190,0.08)] sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-indigo-100/45 blur-3xl" aria-hidden="true" />

          <div className="relative grid min-h-[clamp(300px,42vh,390px)] grid-cols-[0.95fr_1.05fr] items-center gap-1 sm:grid-cols-[1.05fr_0.95fr] sm:gap-6">
            <div className="relative flex h-full min-w-0 items-end justify-center self-end overflow-visible">
              <motion.video
                src="/Baby_Fox.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={ui('Baby fox mascot animation')}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-[clamp(275px,39vh,370px)] w-full max-w-[360px] object-contain object-bottom mix-blend-multiply"
              />
            </div>

            <div className="relative z-10 flex min-w-0 flex-col justify-center py-3 pr-1 sm:pr-3">
              <motion.div
                initial={{ opacity: 0, x: 12, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.18, duration: 0.35 }}
                className="relative rounded-[26px] border border-indigo-200 bg-white/95 px-4 py-4 shadow-[0_14px_35px_rgba(79,70,229,0.10)] backdrop-blur-sm sm:px-6 sm:py-5"
              >
                <span className="absolute -right-1 -top-5 text-2xl text-indigo-400" aria-hidden="true">✦</span>
                <p className="text-sm font-semibold text-slate-500 sm:text-base">{messages.greeting}</p>
                <h1 className="mt-1 break-words text-[clamp(1.65rem,7vw,2.8rem)] font-extrabold leading-none tracking-[-0.045em] text-indigo-600">
                  {firstName}
                </h1>
                <p className="mt-3 text-[13px] font-semibold leading-[1.45] text-slate-700 sm:text-base">
                  {messages.helper}
                </p>
                <div
                  aria-hidden="true"
                  className="absolute -bottom-4 left-8 h-0 w-0 border-l-[13px] border-r-[13px] border-t-[17px] border-l-transparent border-r-transparent border-t-indigo-200"
                />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-[13px] left-[34px] h-0 w-0 border-l-[11px] border-r-[11px] border-t-[15px] border-l-transparent border-r-transparent border-t-white"
                />
              </motion.div>

              <div className="mt-7 space-y-2.5">
                {messages.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-[12px] font-semibold leading-4 text-slate-600 sm:text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">{messages.examplesTitle}</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {messages.examples.map((example, index) => {
              const Icon = exampleIcons[index];
              return (
                <div
                  key={example}
                  className="flex min-h-[82px] flex-col justify-between rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/75 to-white p-3 shadow-[0_8px_24px_rgba(79,70,229,0.05)] sm:min-h-[96px] sm:p-4"
                >
                  <Icon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                  <p className="mt-2 text-[11px] font-bold leading-[1.3] text-slate-700 sm:text-sm">{example}</p>
                </div>
              );
            })}
          </div>
        </section>
      </motion.div>
    </div>
  );
}

export default WelcomeFox;
