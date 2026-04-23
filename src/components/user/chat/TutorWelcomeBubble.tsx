import { motion, type Variants } from "framer-motion";

interface TutorWelcomeBubbleProps {
  firstName: string;
  greeting: string;
  helper: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.18,
      delayChildren: 0.2,
    },
  },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

export function TutorWelcomeBubble({
  firstName,
  greeting,
  helper,
}: TutorWelcomeBubbleProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative bg-white rounded-2xl border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-4 py-3 max-w-[200px]"
    >
      <motion.div
        variants={lineVariants}
        className="text-sm text-slate-500 leading-none"
      >
        {greeting}
      </motion.div>
      <motion.div
        variants={lineVariants}
        className="text-2xl font-bold text-slate-900 leading-tight mt-0.5"
      >
        {firstName}
      </motion.div>
      <motion.div
        variants={lineVariants}
        className="text-xs text-slate-500 mt-1"
      >
        {helper}
      </motion.div>

      {/* Tail pointing down-left toward the fox */}
      <div
        aria-hidden
        className="absolute bottom-[-5px] left-6 w-[10px] h-[10px] bg-white border-l border-b border-slate-200 rotate-45"
      />
    </motion.div>
  );
}

export default TutorWelcomeBubble;
