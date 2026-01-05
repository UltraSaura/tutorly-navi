import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4',
};

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative">
        <div className={cn(
          'rounded-full border-muted',
          sizeClasses[size]
        )} />
        <div className={cn(
          'absolute top-0 left-0 rounded-full border-primary border-t-transparent animate-spin',
          sizeClasses[size]
        )} />
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <LoadingSpinner size="xl" message={message || 'Loading...'} />
    </div>
  );
}
