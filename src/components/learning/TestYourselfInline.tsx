import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const handleClick = () => {
    if (locked) return;
    const params = new URLSearchParams(searchParams);
    params.set('quiz', bankId);
    navigate({ search: params.toString() }, { replace: true });
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        onClick={handleClick}
        className={cn(
          className,
          locked && "opacity-50 cursor-not-allowed"
        )}
        disabled={locked}
      >
        {locked && <Lock className="w-4 h-4 mr-2" />}
        Test yourself
      </Button>
      {locked && progressMessage && (
        <p className="text-xs text-muted-foreground">{progressMessage}</p>
      )}
    </div>
  );
}

