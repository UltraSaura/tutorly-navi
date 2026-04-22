// src/components/user/chat/WelcomeFox.tsx
// Matches reference image: 3D fox in teal hoodie + backpack, waving paw, speech bubble

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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

  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const blinkCycle = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    };
    const id = setInterval(blinkCycle, 3500);
    return () => clearInterval(id);
  }, []);

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

        {/* ── Fox ── */}
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex-shrink-0 select-none"
          aria-label="Friendly fox mascot waving"
          role="img"
        >
          <FoxWithHoodie blink={blink} />
        </motion.div>

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

// ─── Fox SVG ─────────────────────────────────────────────────────────────────
function FoxWithHoodie({ blink }: { blink: boolean }) {
  return (
    <svg
      width="160"
      height="224"
      viewBox="0 0 160 224"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Tail ── */}
      <ellipse cx="122" cy="172" rx="34" ry="19" fill="#F97316" transform="rotate(-28 122 172)" />
      <ellipse cx="128" cy="177" rx="20" ry="11" fill="#FEF3C7" transform="rotate(-28 128 177)" />

      {/* ── Hoodie body ── */}
      <rect x="36" y="110" width="88" height="84" rx="22" fill="#2DD4BF" />
      {/* Hoodie hood/neck shadow */}
      <path d="M60 114 Q80 126 100 114" stroke="#14B8A6" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Pocket */}
      <rect x="56" y="158" width="48" height="26" rx="11" fill="#14B8A6" />
      {/* Drawstrings */}
      <line x1="72" y1="134" x2="67" y2="152" stroke="#ccfaf8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="88" y1="134" x2="93" y2="152" stroke="#ccfaf8" strokeWidth="2.5" strokeLinecap="round" />

      {/* ── Backpack strap + pack ── */}
      <path d="M100 114 Q116 132 112 160" stroke="#B45309" strokeWidth="8" strokeLinecap="round" fill="none" />
      <rect x="108" y="124" width="20" height="32" rx="7" fill="#D97706" />
      <rect x="110" y="127" width="16" height="22" rx="5" fill="#FBBF24" />
      <line x1="118" y1="127" x2="118" y2="149" stroke="#D97706" strokeWidth="2" />
      <line x1="110" y1="138" x2="126" y2="138" stroke="#D97706" strokeWidth="2" />

      {/* ── Left arm (slight sway) ── */}
      <motion.g
        style={{ originX: "40px", originY: "120px" }}
        animate={{ rotate: [0, 6, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="25" y="116" width="22" height="48" rx="11" fill="#2DD4BF" />
        <ellipse cx="36" cy="168" rx="13" ry="9" fill="#5C2D0A" />
        <ellipse cx="36" cy="167" rx="9" ry="6" fill="#E8A87C" opacity="0.55" />
      </motion.g>

      {/* ── Waving right arm ── */}
      <motion.g
        style={{ originX: "116px", originY: "116px" }}
        animate={{ rotate: [0, -40, -12, -42, 0] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
      >
        <rect x="112" y="106" width="22" height="50" rx="11" fill="#2DD4BF" transform="rotate(-32 112 106)" />
        {/* Paw */}
        <ellipse cx="138" cy="76" rx="15" ry="13" fill="#5C2D0A" transform="rotate(-8 138 76)" />
        <ellipse cx="138" cy="76" rx="11" ry="9" fill="#E8A87C" opacity="0.6" transform="rotate(-8 138 76)" />
        {/* Toe lines */}
        <line x1="130" y1="69" x2="128" y2="64" stroke="#5C2D0A" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="137" y1="67" x2="136" y2="62" stroke="#5C2D0A" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="144" y1="70" x2="144" y2="65" stroke="#5C2D0A" strokeWidth="2.2" strokeLinecap="round" />
        {/* Purple wave lines */}
        <motion.g
          animate={{ opacity: [0, 1, 0], y: [-2, -5, -2] }}
          transition={{ duration: 1.7, repeat: Infinity, repeatDelay: 1.5 }}
        >
          <line x1="116" y1="60" x2="111" y2="52" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
          <line x1="124" y1="55" x2="121" y2="46" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
          <line x1="132" y1="53" x2="131" y2="44" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
        </motion.g>
      </motion.g>

      {/* ── Feet ── */}
      <ellipse cx="57" cy="197" rx="16" ry="10" fill="#5C2D0A" />
      <ellipse cx="103" cy="197" rx="16" ry="10" fill="#5C2D0A" />

      {/* ── Head ── */}
      <ellipse cx="80" cy="62" rx="40" ry="38" fill="#F97316" />

      {/* ── Ears ── */}
      <polygon points="44,40 30,4 64,28" fill="#F97316" />
      <polygon points="46,38 34,8 62,28" fill="#5C2D0A" />
      <polygon points="48,36 38,12 60,28" fill="#FDE68A" opacity="0.45" />

      <polygon points="116,40 130,4 96,28" fill="#F97316" />
      <polygon points="114,38 126,8 98,28" fill="#5C2D0A" />
      <polygon points="112,36 122,12 100,28" fill="#FDE68A" opacity="0.45" />

      {/* ── White muzzle ── */}
      <ellipse cx="80" cy="72" rx="24" ry="19" fill="#FEF3C7" />

      {/* ── Forehead fur ── */}
      <path d="M66 36 Q80 27 94 36 Q87 43 80 41 Q73 43 66 36Z" fill="#E06000" opacity="0.45" />

      {/* ── Eyes ── */}
      <ellipse cx="64" cy="58" rx="11" ry="12" fill="white" />
      <ellipse cx="96" cy="58" rx="11" ry="12" fill="white" />

      {blink ? (
        <>
          <line x1="55" y1="58" x2="73" y2="58" stroke="#2d1200" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="87" y1="58" x2="105" y2="58" stroke="#2d1200" strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="65" cy="59" r="8" fill="#2d1200" />
          <circle cx="97" cy="59" r="8" fill="#2d1200" />
          <circle cx="65" cy="59" r="5" fill="#5C2D0A" opacity="0.5" />
          <circle cx="97" cy="59" r="5" fill="#5C2D0A" opacity="0.5" />
          <circle cx="68" cy="56" r="3" fill="white" opacity="0.9" />
          <circle cx="100" cy="56" r="3" fill="white" opacity="0.9" />
        </>
      )}

      {/* ── Eyebrows ── */}
      <path d="M56 46 Q64 41 72 44" stroke="#5C2D0A" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M104 46 Q96 41 88 44" stroke="#5C2D0A" strokeWidth="2.8" fill="none" strokeLinecap="round" />

      {/* ── Nose ── */}
      <ellipse cx="80" cy="74" rx="5.5" ry="4" fill="#2d1200" />
      <ellipse cx="79" cy="73" rx="2" ry="1.5" fill="white" opacity="0.35" />

      {/* ── Open smile ── */}
      <path d="M67 80 Q80 93 93 80" stroke="#2d1200" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="80" cy="85" rx="10" ry="6" fill="#E8547A" opacity="0.75" />

      {/* ── Cheek blush ── */}
      <ellipse cx="50" cy="72" rx="9" ry="5.5" fill="#fca5a5" opacity="0.38" />
      <ellipse cx="110" cy="72" rx="9" ry="5.5" fill="#fca5a5" opacity="0.38" />
    </svg>
  );
}
