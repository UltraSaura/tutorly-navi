import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface TestYourselfInlineProps {
  bankId: string;
  className?: string;
}

export function TestYourselfInline({ bankId, className }: TestYourselfInlineProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleClick = () => {
    const params = new URLSearchParams(searchParams);
    params.set('quiz', bankId);
    navigate({ search: params.toString() }, { replace: true });
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={className}
    >
      Test yourself
    </Button>
  );
}

