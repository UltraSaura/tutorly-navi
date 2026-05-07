import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorFallback({ 
  error, 
  onReset 
}: { 
  error?: Error; 
  onReset?: () => void;
}) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
        </div>
        
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try refreshing the page or go back to home.
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <div className="p-3 bg-muted rounded-md overflow-auto max-h-32">
            <p className="text-xs font-mono text-muted-foreground break-words">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex gap-3 pt-2">
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Call optional error callback for analytics/logging
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorFallback 
          error={this.state.error} 
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}