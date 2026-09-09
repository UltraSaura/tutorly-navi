import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { motion } from "framer-motion";

interface SessionProgressProps {
  current: number;
  total: number;
}

export function SessionProgress({ current, total }: SessionProgressProps) {
  const ui = useInterfaceTranslation();
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {ui("Exercise")} {Math.min(current, total)} / {total}
        </span>
        <span className="hidden sm:inline">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden opacity-80">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
      </div>
    </div>
  );
}
