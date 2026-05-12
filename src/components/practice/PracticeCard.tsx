import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PracticeCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  ctaLabel: string;
  onClick?: () => void;
  className?: string;
  secondaryCtaLabel?: string;
  onSecondaryClick?: () => void;
}

export function PracticeCard({
  title,
  subtitle,
  icon,
  ctaLabel,
  onClick,
  className,
  secondaryCtaLabel,
  onSecondaryClick,
}: PracticeCardProps) {
  const primaryDisabled = !onClick;
  const secondaryDisabled = !!secondaryCtaLabel && !onSecondaryClick;

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} transition={{ duration: 0.18 }}>
      <Card
        className={cn(
          'overflow-hidden border-border/70 shadow-sm',
          primaryDisabled ? 'opacity-80' : null,
          className,
        )}
      >
        <CardContent className="p-4">
          <div className="mb-4 flex items-start gap-3">
            {icon ? <div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div> : null}
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-tight">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={onClick} disabled={primaryDisabled}>
              {ctaLabel}
            </Button>
            {secondaryCtaLabel ? (
              <Button variant="outline" className="flex-1" onClick={onSecondaryClick} disabled={secondaryDisabled}>
                {secondaryCtaLabel}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
