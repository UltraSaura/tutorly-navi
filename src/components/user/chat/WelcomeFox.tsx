// src/components/user/chat/WelcomeFox.tsx

import { motion } from "framer-motion";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { TutorWelcomeBubble } from "./TutorWelcomeBubble";

interface WelcomeFoxProps {
  userName?: string | null;
}

const BUBBLE_MESSAGES: Record<string, { hi: string; helper: string }> = {
  en: { hi: "Hi", helper: "Submit your question for help" },
  fr: { hi: "Salut", helper: "Soumets ta question pour obtenir de l'aide !" },
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

export function WelcomeFox({ userName }: WelcomeFoxProps) {
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
        isFr ? "Élève" : "Student"
      );

  const messages = BUBBLE_MESSAGES[language] ?? BUBBLE_MESSAGES.en;

  return (
    <div className="w-full h-full">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center h-full px-4"
      >
        <div className="relative inline-block">
          {/* ── Fox video ── */}
          <video
            src="/Baby_Fox.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label="Baby fox mascot animation"
            className="w-full max-w-xl sm:max-w-3xl object-contain pointer-events-none select-none mix-blend-multiply"
            style={{ maxHeight: "100%" }}
          />

          {/* ── Speech bubble (above-right of fox) ── */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-6 z-10">
            <TutorWelcomeBubble
              firstName={firstName}
              greeting={messages.hi}
              helper={messages.helper}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default WelcomeFox;
