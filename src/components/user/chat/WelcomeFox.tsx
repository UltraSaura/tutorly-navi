import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { motion } from "framer-motion";
import { Camera, FileText, Image, Keyboard } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { Button } from "@/components/ui/button";

interface WelcomeFoxProps {
  userName?: string | null;
  onUploadDocument?: () => void;
  onUploadPhoto?: () => void;
  onOpenCamera?: () => void;
}

const MESSAGES: Record<string, { greeting: string; helper: string; title: string; subtitle: string; document: string; photo: string; camera: string; type: string }> = {
  en: {
    greeting: "Hi",
    helper: "Show me your homework or type your question.",
    title: "What do you need help with?",
    subtitle: "Send me the exercise and I’ll guide you step by step without giving away the answer.",
    document: "Upload homework",
    photo: "Upload photo",
    camera: "Take photo",
    type: "Type question",
  },
  fr: {
    greeting: "Salut",
    helper: "Montre-moi ton devoir ou écris ta question.",
    title: "Avec quoi as-tu besoin d’aide ?",
    subtitle: "Envoie-moi l’exercice et je te guiderai étape par étape sans donner directement la réponse.",
    document: "Envoyer le devoir",
    photo: "Envoyer une photo",
    camera: "Prendre une photo",
    type: "Écrire la question",
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

export function WelcomeFox({ userName, onUploadDocument, onUploadPhoto, onOpenCamera }: WelcomeFoxProps) {
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

  return (
    <div className="w-full bg-white px-4 pb-40 pt-4 sm:pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="mx-auto flex w-full max-w-2xl flex-col gap-4"
      >
        <header className="text-center">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-3xl">
            {messages.title}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-neutral-600 sm:text-base sm:leading-6">
            {messages.subtitle}
          </p>
        </header>

        <div className="grid w-full grid-cols-2 gap-2.5" aria-label={ui("Homework submission options")}>
          <Button type="button" variant="outline" onClick={onOpenCamera} className="h-[82px] flex-col gap-1.5 rounded-2xl bg-slate-50 p-2 text-slate-900 shadow-none">
            <Camera className="h-5 w-5" aria-hidden="true" />
            <span className="text-center text-[13px] font-bold leading-tight">{messages.camera}</span>
          </Button>
          <Button type="button" variant="outline" onClick={onUploadPhoto} className="h-[82px] flex-col gap-1.5 rounded-2xl bg-slate-50 p-2 text-slate-900 shadow-none">
            <Image className="h-5 w-5" aria-hidden="true" />
            <span className="text-center text-[13px] font-bold leading-tight">{messages.photo}</span>
          </Button>
          <Button type="button" variant="outline" onClick={onUploadDocument} className="h-[82px] flex-col gap-1.5 rounded-2xl bg-slate-50 p-2 text-slate-900 shadow-none">
            <FileText className="h-5 w-5" aria-hidden="true" />
            <span className="text-center text-[13px] font-bold leading-tight">{messages.document}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus()}
            className="h-[82px] flex-col gap-1.5 rounded-2xl bg-slate-50 p-2 text-slate-900 shadow-none"
          >
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            <span className="text-center text-[13px] font-bold leading-tight">{messages.type}</span>
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.25 }}
          className="flex min-h-[118px] items-center gap-3 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-white px-3 py-2 sm:px-4"
        >
          <div className="flex h-[104px] w-[104px] shrink-0 items-end justify-center overflow-hidden sm:h-[120px] sm:w-[120px]">
            <video
              src="/Baby_Fox.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label={ui("Baby fox mascot animation")}
              className="h-full w-full object-contain pointer-events-none select-none mix-blend-multiply"
            />
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <p className="text-sm font-semibold text-slate-500">{messages.greeting}</p>
            <p className="truncate text-xl font-extrabold text-indigo-600 sm:text-2xl">{firstName}</p>
            <p className="mt-1 text-sm font-medium leading-5 text-slate-700">{messages.helper}</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default WelcomeFox;
