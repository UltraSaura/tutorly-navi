import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBankAttemptStatus } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';

interface TestYourselfInlineProps {
  bankId: string;
  className?: string;
  locked?: boolean;
  progressMessage?: string;
}

export function TestYourselfInline({ 
  bankId, 
  className, 
  locked = false,
  progressMessage 
}: TestYourselfInlineProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: attemptStatus } = useBankAttemptStatus(bankId, user?.id);

  const handleClick = () => {
    if (locked) return;
    const params = new URLSearchParams(searchParams);
    params.set('quiz', bankId);
    navigate({ search: params.toString() }, { replace: true });
  };

  const isPassed = attemptStatus?.bestScore != null && attemptStatus.bestScore === attemptStatus.maxScore;
  const hasAttempted = attemptStatus?.bestScore != null;

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        onClick={handleClick}
        className={cn(
          className,
          locked && "opacity-50 cursor-not-allowed",
          isPassed && "border-green-500 text-green-700 dark:text-green-400",
          hasAttempted && !isPassed && "border-orange-500 text-orange-700 dark:text-orange-400"
        )}
        disabled={locked}
      >
        {locked && <Lock className="w-4 h-4 mr-2" />}
        {isPassed && <Check className="w-4 h-4 mr-2" />}
        {hasAttempted && !isPassed && <X className="w-4 h-4 mr-2" />}
        Test yourself
      </Button>
      {locked && progressMessage && (
        <p className="text-xs text-muted-foreground">{progressMessage}</p>
      )}
      {hasAttempted && (
        <p className={cn(
          "text-xs",
          isPassed ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
        )}>
          {isPassed ? "✓ Passed" : `Best: ${attemptStatus.bestScore}/${attemptStatus.maxScore}`}
        </p>
      )}
    </div>
  );
}

