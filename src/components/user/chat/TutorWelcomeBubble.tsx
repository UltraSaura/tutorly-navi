import { motion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

interface TutorWelcomeBubbleProps {
  firstName: string;
  greeting: string;
  helper: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.12,
      delayChildren: 0.12,
    },
  },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 7 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};

export function TutorWelcomeBubble({
  firstName,
  greeting,
  helper,
}: TutorWelcomeBubbleProps) {
  const [visibleGreeting, setVisibleGreeting] = useState("");
  const [visibleFirstName, setVisibleFirstName] = useState("");
  const [visibleHelper, setVisibleHelper] = useState("");

  useEffect(() => {
    setVisibleGreeting("");
    setVisibleFirstName("");
    setVisibleHelper("");

    const lines = [
      { text: greeting, setter: setVisibleGreeting, speed: 45 },
      { text: firstName, setter: setVisibleFirstName, speed: 50 },
      { text: helper, setter: setVisibleHelper, speed: 24 },
    ] as const;

    let lineIndex = 0;
    let charIndex = 0;
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    const startTyping = () => {
      const currentLine = lines[lineIndex];
      if (!currentLine) return;

      intervalId = window.setInterval(() => {
        charIndex += 1;
        currentLine.setter(currentLine.text.slice(0, charIndex));

        if (charIndex >= currentLine.text.length) {
          if (intervalId) window.clearInterval(intervalId);
          lineIndex += 1;
          charIndex = 0;

          if (lineIndex < lines.length) {
            timeoutId = window.setTimeout(startTyping, 120);
          }
        }
      }, currentLine.speed);
    };

    timeoutId = window.setTimeout(startTyping, 120);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [firstName, greeting, helper]);

  return (
    <div className="relative" style={{ overflow: "visible" }}>
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.5, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "-26px",
          right: "-2px",
          width: "34px",
          height: "34px",
          overflow: "visible",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "2px",
            bottom: "2px",
            display: "block",
            width: "5px",
            height: "20px",
            borderRadius: "3px",
            background: "#A996FF",
            transform: "rotate(-34deg)",
            transformOrigin: "bottom center",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "15px",
            bottom: "0px",
            display: "block",
            width: "5px",
            height: "24px",
            borderRadius: "3px",
            background: "#A996FF",
            transform: "rotate(0deg)",
            transformOrigin: "bottom center",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: "2px",
            bottom: "2px",
            display: "block",
            width: "5px",
            height: "20px",
            borderRadius: "3px",
            background: "#A996FF",
            transform: "rotate(34deg)",
            transformOrigin: "bottom center",
          }}
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ overflow: "visible" }}
        className="
          relative
          w-[272px]
          max-w-[calc(100vw-48px)]
          rounded-[26px]
          border border-[#AFC4FF]
          bg-white/95
          px-[26px] py-5
          shadow-[0_13px_34px_rgba(113,130,255,0.14)]
          backdrop-blur-sm
        "
      >
        <div
          aria-hidden
          className="
            absolute left-[29px] bottom-[-25px]
            h-0 w-0
            border-l-[18px] border-r-[18px] border-t-[26px]
            border-l-transparent border-r-transparent border-t-[#AFC4FF]
            rotate-[18deg]
          "
        />
        <div
          aria-hidden
          className="
            absolute left-[30px] bottom-[-22px]
            h-0 w-0
            border-l-[16px] border-r-[16px] border-t-[24px]
            border-l-transparent border-r-transparent border-t-white
            rotate-[18deg]
          "
        />

        <div
          aria-hidden
          className="absolute right-[28px] top-[36px] text-[20px] leading-none text-[#A996FF]"
        >
          ✦
        </div>

        <motion.div
          variants={lineVariants}
          className="text-[24px] font-medium leading-none tracking-[-0.02em] text-[#60708C]"
        >
          {visibleGreeting}
        </motion.div>

        <motion.div
          variants={lineVariants}
          className="mt-3 text-[45px] font-extrabold leading-none tracking-[-0.055em] text-[#4F46FF]"
        >
          {visibleFirstName}
        </motion.div>

        <motion.div
          variants={lineVariants}
          className="mt-5 max-w-[216px] text-[20px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#334768]"
        >
          {visibleHelper}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default TutorWelcomeBubble;
