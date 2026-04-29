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
          top: "-18px",
          right: "4px",
          width: "24px",
          height: "24px",
          overflow: "visible",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "2px",
            bottom: "1px",
            display: "block",
            width: "4px",
            height: "14px",
            borderRadius: "3px",
            background: "#A996FF",
            transform: "rotate(-34deg)",
            transformOrigin: "bottom center",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "11px",
            bottom: "0px",
            display: "block",
            width: "4px",
            height: "17px",
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
            bottom: "1px",
            display: "block",
            width: "4px",
            height: "14px",
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
          w-[190px]
          max-w-[calc(100vw-32px)]
          rounded-[18px]
          border border-[#AFC4FF]
          bg-white/95
          px-[18px] py-[14px]
          shadow-[0_13px_34px_rgba(113,130,255,0.14)]
          backdrop-blur-sm
          sm:w-[272px]
          sm:max-w-[calc(100vw-48px)]
          sm:rounded-[26px]
          sm:px-[26px]
          sm:py-5
        "
      >
        <div
          aria-hidden
          className="
            absolute left-[20px] bottom-[-17px]
            h-0 w-0
            border-l-[12px] border-r-[12px] border-t-[17px]
            border-l-transparent border-r-transparent border-t-[#AFC4FF]
            rotate-[18deg]
            sm:left-[29px] sm:bottom-[-25px]
            sm:border-l-[18px] sm:border-r-[18px] sm:border-t-[26px]
          "
        />
        <div
          aria-hidden
          className="
            absolute left-[21px] bottom-[-15px]
            h-0 w-0
            border-l-[10px] border-r-[10px] border-t-[15px]
            border-l-transparent border-r-transparent border-t-white
            rotate-[18deg]
            sm:left-[30px] sm:bottom-[-22px]
            sm:border-l-[16px] sm:border-r-[16px] sm:border-t-[24px]
          "
        />

        <div
          aria-hidden
          className="absolute right-[18px] top-[24px] text-[15px] leading-none text-[#A996FF] sm:right-[28px] sm:top-[36px] sm:text-[20px]"
        >
          ✦
        </div>

        <motion.div
          variants={lineVariants}
          className="text-[17px] font-medium leading-none tracking-[-0.02em] text-[#60708C] sm:text-[24px]"
        >
          {visibleGreeting}
        </motion.div>

        <motion.div
          variants={lineVariants}
          className="mt-2 text-[31px] font-extrabold leading-none tracking-[-0.055em] text-[#4F46FF] sm:mt-3 sm:text-[45px]"
        >
          {visibleFirstName}
        </motion.div>

        <motion.div
          variants={lineVariants}
          className="mt-3 max-w-[150px] text-[14px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#334768] sm:mt-5 sm:max-w-[216px] sm:text-[20px]"
        >
          {visibleHelper}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default TutorWelcomeBubble;
