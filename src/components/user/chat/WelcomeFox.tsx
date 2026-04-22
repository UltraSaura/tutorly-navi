// src/components/user/chat/WelcomeFox.tsx
// Fox mascot illustration (PNG from /public) + animated speech bubble greeting

import { motion } from "framer-motion";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/SimpleLanguageContext";

interface WelcomeFoxProps {
  userName?: string | null;
}

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

  const greeting = isFr ? "Salut" : "Hi to";
  const subtitle = isFr
    ? "Soumets ta question pour obtenir de l'aide !"
    : "Submit your question for help!";

  return (
    <div className="w-full mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="
          relative overflow-hidden rounded-3xl
          bg-white border border-orange-100
          shadow-[0_8px_40px_0_rgba(251,146,60,0.13)]
          px-6 py-6 sm:px-10 sm:py-8
          flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10
        "
      >
        {/* Soft background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-10 w-72 h-72 rounded-full
                     bg-gradient-to-br from-orange-50 via-amber-50 to-transparent opacity-70 blur-3xl"
        />

        {/* ── Fox mascot image ── */}
        <motion.img
          src="/fox-mascot.png"
          alt="Friendly fox mascot waving"
          draggable={false}
          className="w-40 sm:w-48 h-auto select-none pointer-events-none flex-shrink-0 relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -8, 0],
            rotate: [0, -3, 0, 3, 0],
          }}
          transition={{
            opacity: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* ── Speech Bubble ── */}
        <div className="relative flex-shrink-0">
          {/* Bubble tail pointing left */}
          <div
            aria-hidden
            className="absolute left-[-18px] top-[42px] w-0 h-0"
            style={{
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderRight: "20px solid white",
              filter: "drop-shadow(-2px 0 2px rgba(0,0,0,0.06))",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, x: 12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="
              relative bg-white rounded-3xl border border-gray-100
              shadow-[0_4px_24px_0_rgba(0,0,0,0.09)]
              px-7 py-6 min-w-[200px] max-w-[240px]
              flex flex-col items-center gap-1
            "
          >
            {/* Purple sparkle lines top-right */}
            <motion.div
              className="absolute top-4 right-5 flex gap-[3px] items-end"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              aria-hidden
            >
              <span style={{ width: 3, height: 14, background: "#A78BFA", borderRadius: 2, display: "inline-block", transform: "rotate(20deg)" }} />
              <span style={{ width: 3, height: 20, background: "#A78BFA", borderRadius: 2, display: "inline-block" }} />
              <span style={{ width: 3, height: 14, background: "#A78BFA", borderRadius: 2, display: "inline-block", transform: "rotate(-20deg)" }} />
            </motion.div>

            {/* Yellow star bottom-right */}
            <motion.span
              className="absolute bottom-4 right-5 text-yellow-400 text-2xl"
              animate={{ scale: [0.9, 1.15, 0.9], rotate: [0, 15, 0] }}
              transition={{ duration: 2.8, repeat: Infinity }}
              aria-hidden
            >★</motion.span>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-[#1e1b6b] font-bold text-2xl tracking-tight"
            >
              {greeting}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.68, duration: 0.4 }}
              className="text-purple-500 font-extrabold text-4xl tracking-tight leading-tight"
            >
              {firstName}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.86, duration: 0.4 }}
              className="text-[#1e1b6b] font-semibold text-sm text-center leading-snug mt-1"
            >
              {subtitle}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default WelcomeFox;
