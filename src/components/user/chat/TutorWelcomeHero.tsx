import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type SupportedLanguage = "en" | "fr";

type TutorWelcomeHeroProps = {
  userName?: string | null;
  language?: SupportedLanguage;
  hasSubmittedQuestion?: boolean;
  foxSrc: string;
  className?: string;
};

const copy = {
  en: {
    hi: "Hi",
    help: "Submit your question for help",
    fallbackName: "Student",
  },
  fr: {
    hi: "Salut",
    help: "Soumets ta question pour obtenir de l'aide !",
    fallbackName: "Student",
  },
} satisfies Record<SupportedLanguage, { hi: string; help: string; fallbackName: string }>;

function getFirstName(name?: string | null, fallback = "Student") {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

const isVideoAsset = (src: string) => /\.(mp4|webm|ogg|mov)$/i.test(src);

export default function TutorWelcomeHero({
  userName,
  language = "en",
  hasSubmittedQuestion = false,
  foxSrc,
  className = "",
}: TutorWelcomeHeroProps) {
  const text = copy[language] ?? copy.en;
  const firstName = useMemo(
    () => getFirstName(userName, text.fallbackName),
    [userName, text.fallbackName]
  );

  const [showBubble, setShowBubble] = useState(!hasSubmittedQuestion);
  const [showHi, setShowHi] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (hasSubmittedQuestion) {
      setShowBubble(false);
      return;
    }

    setShowBubble(true);
    setShowHi(false);
    setShowName(false);
    setShowHelp(false);

    const t1 = setTimeout(() => setShowHi(true), 120);
    const t2 = setTimeout(() => setShowName(true), 260);
    const t3 = setTimeout(() => setShowHelp(true), 420);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [hasSubmittedQuestion, firstName, language]);

  const foxMediaClassName = `
    absolute
    bottom-[110px]
    left-[54%]
    -translate-x-1/2
    z-10
    w-[250px]
    object-contain
    object-center
    select-none
    pointer-events-none
    mix-blend-multiply
  `;

  return (
    <section
      className={`relative w-full overflow-hidden bg-[rgb(241,247,255)] ${className}`}
      aria-label="Tutor welcome hero"
    >
      <div className="relative mx-auto h-[760px] w-full max-w-[760px] overflow-hidden bg-[rgb(241,247,255)]">
        <AnimatePresence>
          {showBubble && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="
                absolute
                top-[36px]
                left-[52%]
                -translate-x-1/2
                z-20
                w-[330px]
                max-w-[calc(100vw-48px)]
              "
            >
              <div
                className="
                  relative
                  rounded-[30px]
                  border
                  border-[#B9C8FF]
                  bg-white/97
                  px-8
                  py-6
                  shadow-[0_10px_30px_rgba(125,140,255,0.10)]
                "
              >
                <div
                  className="
                    absolute
                    left-[56px]
                    bottom-[-16px]
                    h-0
                    w-0
                    border-l-[16px]
                    border-r-[16px]
                    border-t-[22px]
                    border-l-transparent
                    border-r-transparent
                    border-t-white
                    rotate-[32deg]
                  "
                />
                <div
                  className="
                    absolute
                    left-[55px]
                    bottom-[-18px]
                    -z-10
                    h-0
                    w-0
                    border-l-[17px]
                    border-r-[17px]
                    border-t-[24px]
                    border-l-transparent
                    border-r-transparent
                    border-t-[#C7D2FE]
                    rotate-[32deg]
                  "
                />

                <div className="absolute right-[-20px] top-[8px] flex rotate-[10deg] gap-1">
                  <span className="block h-4 w-[5px] rounded-full bg-[#9A7CFF]" />
                  <span className="block h-7 w-[5px] rounded-full bg-[#9A7CFF]" />
                  <span className="block h-4 w-[5px] rounded-full bg-[#9A7CFF]" />
                </div>

                <div className="absolute right-10 top-10 text-[28px] leading-none text-[#B39BFF]">
                  ✦
                </div>

                <AnimatePresence mode="wait">
                  {showHi && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="text-[28px] font-medium leading-none text-[#63738E]"
                    >
                      {text.hi}
                    </motion.p>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {showName && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="mt-3 text-[48px] font-extrabold leading-none tracking-[-0.03em] text-[#4D4BFF]"
                    >
                      {firstName}
                    </motion.p>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {showHelp && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="mt-5 max-w-[240px] text-[24px] font-medium leading-[1.35] text-[#5E6F8D]"
                    >
                      {text.help}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isVideoAsset(foxSrc) ? (
          <motion.video
            src={foxSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label="Tutor fox assistant"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={foxMediaClassName}
            style={{ maxHeight: "100%" }}
          />
        ) : (
          <motion.img
            src={foxSrc}
            alt="Tutor fox assistant"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={foxMediaClassName}
            draggable={false}
          />
        )}
      </div>
    </section>
  );
}
