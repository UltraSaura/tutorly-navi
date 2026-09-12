import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Camera, FileText, Image, Keyboard } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { TutorWelcomeBubble } from "./TutorWelcomeBubble";
import { Button } from "@/components/ui/button";

interface WelcomeFoxProps {
  userName?: string | null;
  onUploadDocument?: () => void;
  onUploadPhoto?: () => void;
  onOpenCamera?: () => void;
}

const BUBBLE_MESSAGES: Record<string, { hi: string; helper: string; title: string; subtitle: string; document: string; photo: string; camera: string; type: string }> = {
  en: {
    hi: "Hi",
    helper: "Show me your homework or type your question.",
    title: "What do you need help with?",
    subtitle: "Take a photo, upload your homework, or type the exercise below. I’ll guide you without simply giving away the answer.",
    document: "Upload homework",
    photo: "Upload a photo",
    camera: "Take a photo",
    type: "Type below",
  },
  fr: {
    hi: "Salut",
    helper: "Montre-moi ton devoir ou écris ta question.",
    title: "Avec quoi as-tu besoin d’aide ?",
    subtitle: "Prends une photo, envoie ton devoir ou écris l’exercice ci-dessous. Je vais te guider sans simplement donner la réponse.",
    document: "Envoyer un devoir",
    photo: "Envoyer une photo",
    camera: "Prendre une photo",
    type: "Écrire ci-dessous",
  },
};

const resolveFirstName = (
  profileFirstName: string | undefined,
  fullName: string | undefined,
  email: string | undefined,
  fallback: string
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
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    setShowBubble(false);
    const timeoutId = window.setTimeout(() => setShowBubble(true), 500);
    return () => window.clearTimeout(timeoutId);
  }, [language, userName]);

  const isFr = language === "fr";
  const firstName = userName
    ? userName.trim().split(" ")[0]
    : resolveFirstName(
        profile?.firstName,
        user?.user_metadata?.full_name as string | undefined,
        user?.email ?? undefined,
        isFr ? "Élève" : "Student"
      );
  const messages = BUBBLE_MESSAGES[language] ?? BUBBLE_MESSAGES.en;

  return (
    <div className="w-full min-h-full bg-white px-4 pt-5 pb-36 sm:pt-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{messages.title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">{messages.subtitle}</p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4" aria-label={ui("Homework submission options")}>
          <Button type="button" variant="outline" onClick={onOpenCamera} className="h-auto min-h-24 flex-col gap-2 rounded-2xl p-3">
            <Camera className="h-6 w-6" /><span className="text-center text-sm font-semibold">{messages.camera}</span>
          </Button>
          <Button type="button" variant="outline" onClick={onUploadPhoto} className="h-auto min-h-24 flex-col gap-2 rounded-2xl p-3">
            <Image className="h-6 w-6" /><span className="text-center text-sm font-semibold">{messages.photo}</span>
          </Button>
          <Button type="button" variant="outline" onClick={onUploadDocument} className="h-auto min-h-24 flex-col gap-2 rounded-2xl p-3">
            <FileText className="h-6 w-6" /><span className="text-center text-sm font-semibold">{messages.document}</span>
          </Button>
          <Button type="button" variant="outline" onClick={() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus()} className="h-auto min-h-24 flex-col gap-2 rounded-2xl p-3">
            <Keyboard className="h-6 w-6" /><span className="text-center text-sm font-semibold">{messages.type}</span>
          </Button>
        </div>

        <div className="relative mt-1 w-full max-w-2xl">
          <video
            src="/Baby_Fox.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label={ui("Baby fox mascot animation")}
            className="mx-auto max-h-[34vh] w-full object-contain pointer-events-none select-none mix-blend-multiply"
          />
          {showBubble && (
            <div className="absolute right-0 top-0 z-10 sm:right-5">
              <TutorWelcomeBubble firstName={firstName} greeting={messages.hi} helper={messages.helper} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default WelcomeFox;
