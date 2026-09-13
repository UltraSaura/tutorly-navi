import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { motion } from "framer-motion";
import { Calculator, FileImage, MessageCircleQuestion, Check } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/SimpleLanguageContext";

interface WelcomeFoxProps {
  userName?: string | null;
}

const MESSAGES: Record<string, {
  greeting: string;
  helper: string;
  clear: string;
  hints: string;
  noAnswer: string;
  examples: string;
  math: string;
  photo: string;
  lesson: string;
}> = {
  en: {
    greeting: "Hi",
    helper: "Send me your homework or type your question. I’ll guide you step by step!",
    clear: "Clear explanations",
    hints: "Hints when you need them",
    noAnswer: "No ready-made answer",
    examples: "A few examples",
    math: "A math exercise",
    photo: "Homework from a photo",
    lesson: "A lesson question",
  },
  fr: {
    greeting: "Salut",
    helper: "Envoie ton devoir ou écris ta question. Je vais te guider étape par étape !",
    clear: "Des explications claires",
    hints: "Des indices si besoin",
    noAnswer: "Pas la réponse toute faite",
    examples: "Quelques exemples",
    math: "Un exercice de maths",
    photo: "Un devoir en photo",
    lesson: "Une question de cours",
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
  const fromEmail = email?.split("@")[0];
  if (fromEmail) return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  return fallback;
};

export function WelcomeFox({ userName }: WelcomeFoxProps) {
  const ui = useInterfaceTranslation();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { language } = useLanguage();

  const isFr = language === "fr";
  const firstName = userName
    ? userName.trim().split(" ")[0]
    : resolveFirstName(
        profile?.firstName,
        user?.user_metadata?.full_name as string | undefined,
        user?.email ?? undefined,
        isFr ? "Élève" : "Student",
      );
  const messages = MESSAGES[language] ?? MESSAGES.en;

  const benefits = [messages.clear, messages.hints, messages.noAnswer];
  const examples = [
    { label: messages.math, icon: Calculator },
    { label: messages.photo, icon: FileImage },
    { label: messages.lesson, icon: MessageCircleQuestion },
  ];

  return (
    <div className="w-full bg-white px-3 pb-44 pt-3 sm:px-5 sm:pt-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-3xl"
      >
        <section className="relative h-[430px] overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-white shadow-[0_20px_60px_rgba(79,70,229,0.08)] sm:h-[460px]">
          <div className="absolute inset-y-0 left-0 w-[48%] overflow-hidden sm:w-[46%]" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_54%,rgba(99,102,241,0.12),transparent_62%)]" />
            <video
              src="/Baby_Fox.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label={ui("Baby fox mascot animation")}
              className="absolute bottom-[-4%] left-1/2 h-[112%] w-[170%] max-w-none -translate-x-1/2 scale-[1.55] object-contain object-bottom mix-blend-multiply pointer-events-none select-none sm:h-[116%] sm:w-[165%] sm:scale-[1.45]"
            />
          </div>

          <div className="absolute right-4 top-5 w-[58%] max-w-[360px] sm:right-6 sm:top-7 sm:w-[56%]">
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.28 }}
              className="relative rounded-[26px] border border-indigo-200 bg-white/96 px-5 py-5 shadow-[0_16px_40px_rgba(99,102,241,0.10)] backdrop-blur-sm sm:px-6"
            >
              <span aria-hidden="true" className="absolute -right-1 -top-4 text-2xl text-indigo-400">✦</span>
              <div aria-hidden="true" className="absolute -bottom-5 left-12 h-10 w-10 rotate-45 border-b border-r border-indigo-200 bg-white" />
              <p className="text-base font-semibold text-slate-500 sm:text-lg">{messages.greeting}</p>
              <p className="mt-1 truncate text-[34px] font-extrabold leading-none tracking-tight text-indigo-600 sm:text-[40px]">{firstName}</p>
              <p className="mt-4 text-[15px] font-semibold leading-6 text-slate-700 sm:text-base">{messages.helper}</p>
            </motion.div>

            <div className="mt-9 space-y-3 pl-1 sm:mt-10">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5 text-[13px] font-semibold leading-tight text-slate-600 sm:text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{messages.examples}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
            {examples.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-3 sm:min-h-[112px] sm:p-4">
                <Icon className="h-6 w-6 text-indigo-500" aria-hidden="true" />
                <p className="mt-3 text-[12px] font-bold leading-[1.25] text-slate-700 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
}

export default WelcomeFox;
