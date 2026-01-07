import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorCardProps {
  title?: string;
  description?: string;
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function ErrorCard({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  error,
  onRetry,
  onGoHome,
  showDetails = false,
  className,
}: ErrorCardProps) {
  return (
    <Card className={cn('max-w-md mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        
        {showDetails && error && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs font-mono text-muted-foreground break-words">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex gap-2">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onGoHome && (
            <Button onClick={onGoHome} variant="ghost" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FullPageError({
  title,
  description,
  error,
  onRetry,
  onGoHome,
}: ErrorCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-background">
      <ErrorCard
        title={title}
        description={description}
        error={error}
        onRetry={onRetry}
        onGoHome={onGoHome}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    </div>
  );
}
