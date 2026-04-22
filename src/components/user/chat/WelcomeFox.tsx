// src/components/user/chat/WelcomeFox.tsx
//
// SETUP (one-time):
//   - Export your fox image as a PNG with a TRANSPARENT background
//   - Upload it to your Lovable project under: public/fox-mascot.png

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
          px-6 py-8 sm:px-12 sm:py-10
          flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12
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

        {/* ── Fox image ── */}
        <div className="relative flex-shrink-0">
          {/* Float up/down */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Subtle body sway to mimic waving */}
            <motion.div
              animate={{ rotate: [0, 3, -2, 3, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 1.4,
              }}
              style={{ transformOrigin: "center 80%" }}
            >
              <video
                src="/Baby_Fox.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-label="Baby fox mascot animation"
                className="w-40 h-auto sm:w-52 drop-shadow-xl pointer-events-none select-none"
              />
            </motion.div>
          </motion.div>

          {/* Purple sparkle near fox */}
          <motion.div
            className="absolute -top-2 -right-1 text-purple-400 text-lg select-none"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8], rotate: [0, 20, 0] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            aria-hidden
          >
            ✦
          </motion.div>
        </div>

        {/* ── Speech Bubble ── */}
        <div className="relative flex-shrink-0">
          {/* Bubble pointer (desktop only) */}
          <div
            aria-hidden
            className="hidden sm:block absolute left-[-20px] top-[44px] w-0 h-0"
            style={{
              borderTop: "12px solid transparent",
              borderBottom: "12px solid transparent",
              borderRight: "22px solid white",
              filter: "drop-shadow(-3px 0 2px rgba(0,0,0,0.05))",
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="
              relative bg-white rounded-3xl
              border border-gray-100
              shadow-[0_6px_32px_0_rgba(0,0,0,0.10)]
              px-8 py-7
              min-w-[220px] max-w-[260px]
              flex flex-col items-center gap-1 text-center
            "
          >
            {/* Purple sparkle lines — top right of bubble */}
            <motion.div
              className="absolute top-5 right-6 flex gap-1 items-end"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              aria-hidden
            >
              {[14, 20, 14].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: 3,
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
              className="absolute bottom-5 right-6 text-2xl select-none"
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
              className="text-[#1e1b6b] font-bold text-2xl"
            >
              {greeting}
            </motion.p>

            {/* First name */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.38 }}
              className="text-purple-500 font-extrabold text-4xl leading-tight"
            >
              {firstName}
            </motion.p>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.80, duration: 0.38 }}
              className="text-[#1e1b6b] font-semibold text-sm leading-snug mt-1"
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
