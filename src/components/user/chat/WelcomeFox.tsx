// src/components/user/chat/WelcomeFox.tsx

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

  const greeting = isFr ? "Salut" : "Hi";
  const subtitle = isFr
    ? "Soumets ta question pour obtenir de l'aide !"
    : "Submit your question for help!";

  return (
    <div className="w-full mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="
          relative overflow-hidden rounded-3xl
          bg-white border border-orange-100
          shadow-[0_8px_40px_0_rgba(251,146,60,0.12)]
          px-4 pt-6 pb-8 sm:px-8
          flex flex-col items-center gap-0
        "
      >
        {/* Warm background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 80%, rgba(251,191,36,0.08) 0%, transparent 60%), " +
              "radial-gradient(ellipse at 80% 10%, rgba(249,115,22,0.06) 0%, transparent 55%)",
          }}
        />

        {/* Top-right purple sparkle (card-level decoration) */}
        <motion.div
          className="absolute top-4 right-5 text-purple-400 text-xl select-none z-10"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8], rotate: [0, 20, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          aria-hidden
        >
          ✦
        </motion.div>

        {/* ── Fox video with overlaid speech bubble ── */}
        <div className="relative w-full flex justify-center">
          <video
            src="/Baby_Fox.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label="Baby fox mascot animation"
            className="w-full max-w-[420px] h-auto mx-auto -translate-x-4 sm:-translate-x-6 drop-shadow-xl pointer-events-none select-none mix-blend-multiply"
          />

          {/* ── Speech Bubble (overlaid top-right, tail pointing left to fox) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="
              absolute top-2 right-2 sm:top-4 sm:right-4 z-20
              bg-white rounded-3xl
              border border-gray-100
              shadow-[0_6px_32px_0_rgba(0,0,0,0.10)]
              px-5 py-4
              min-w-[160px] max-w-[200px]
              flex flex-col items-center gap-1 text-center
            "
            style={{
              filter: "drop-shadow(-2px 0 1px rgba(0,0,0,0.04))",
            }}
          >
            {/* Left-pointing bubble tail (centered on left edge, aimed at fox) */}
            <div
              aria-hidden
              className="absolute w-0 h-0"
              style={{
                left: "-14px",
                top: "50%",
                transform: "translateY(-50%)",
                borderTop: "12px solid transparent",
                borderBottom: "12px solid transparent",
                borderRight: "16px solid white",
              }}
            />

            {/* Purple sparkle lines — top right of bubble */}
            <motion.div
              className="absolute top-2 right-3 flex gap-[2px] items-end"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              aria-hidden
            >
              {[8, 12, 8].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: 2,
                    height: h,
                    background: "#A78BFA",
                    borderRadius: 2,
                    display: "inline-block",
                    transform:
                      i === 0 ? "rotate(20deg)" : i === 2 ? "rotate(-20deg)" : "none",
                  }}
                />
              ))}
            </motion.div>

            {/* Yellow star — bottom right of bubble */}
            <motion.span
              className="absolute -bottom-2 -right-2 text-lg select-none"
              animate={{ scale: [0.9, 1.15, 0.9], rotate: [0, 12, 0] }}
              transition={{ duration: 2.8, repeat: Infinity }}
              aria-hidden
            >
              ⭐
            </motion.span>

            {/* Greeting */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.38 }}
              className="text-[#1e1b6b] font-bold text-lg leading-none"
            >
              {greeting}
            </motion.p>

            {/* First name */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.38 }}
              className="text-purple-500 font-extrabold text-2xl sm:text-3xl leading-tight break-words max-w-full"
            >
              {firstName}
            </motion.p>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.80, duration: 0.38 }}
              className="text-[#1e1b6b] font-semibold text-xs leading-snug mt-1"
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
