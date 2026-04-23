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
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-0 px-4"
      >
        {/* ── Speech Bubble (above fox, with downward pointer) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="
            relative bg-white rounded-3xl
            border border-gray-100
            shadow-[0_6px_32px_0_rgba(0,0,0,0.10)]
            px-10 py-6
            w-72 sm:w-80
            flex flex-col items-center text-center
            mt-2
          "
        >
          {/* Downward-pointing triangle pointer */}
          <svg
            aria-hidden
            width="32"
            height="20"
            viewBox="0 0 32 20"
            className="absolute -bottom-[18px] left-1/2 -translate-x-1/2 pointer-events-none"
          >
            <path
              d="M0 0 L32 0 L16 20 Z"
              fill="white"
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          </svg>

          {/* Purple sparkle lines — top right of bubble */}
          <motion.div
            className="absolute top-3 right-4 flex gap-[2px] items-end"
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

          {/* Greeting + name on one line */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.38 }}
            className="leading-tight"
          >
            <span className="text-[#1e1b6b] font-bold text-lg">{greeting} </span>
            <span className="text-purple-500 font-extrabold text-2xl sm:text-3xl break-words">
              {firstName}
            </span>
          </motion.p>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.38 }}
            className="text-[#1e1b6b] font-semibold text-xs leading-snug mt-2"
          >
            {subtitle}
          </motion.p>
        </motion.div>

        {/* ── Fox video below bubble ── */}
        <video
          src="/Baby_Fox.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="Baby fox mascot animation"
          className="w-full max-w-xl sm:max-w-3xl object-contain pointer-events-none select-none mix-blend-multiply -mt-2"
          style={{ maxHeight: "87vh" }}
        />
      </motion.div>
    </div>
  );
}

export default WelcomeFox;
