import { Link, useLocation } from 'react-router-dom';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ExerciseHistoryNav = () => {
  const location = useLocation();
  const isActive = location.pathname === '/exercise-history';

  return (
    <Link
      to="/exercise-history"
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <History className="h-4 w-4" />
      Exercise History
    </Link>
  );
};