import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorFallback() {
  const { t } = useLanguage();
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">{t("errors.somethingWrong")}</h2>
        <p className="text-muted-foreground mb-4">{t("errors.refreshPage")}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Refresh Page
        </button>
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback />;
    }

    return this.props.children;
  }
}