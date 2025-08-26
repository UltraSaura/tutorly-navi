import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showXpToast } from '@/components/game/XpToast';
import ExplanationCards from './ExplanationCards';
import type { Step } from './types';

interface ExplanationModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  steps: Step[];
  error: string | null;
  onTryAgain?: () => void;
  exerciseQuestion?: string;
}

export function ExplanationModal({ 
  open, 
  onClose, 
  loading, 
  steps, 
  error,
  onTryAgain,
  exerciseQuestion 
}: ExplanationModalProps) {
  if (!open) return null;

  const handleTryAgain = () => {
    if (onTryAgain) {
      onTryAgain();
      showXpToast(5, "Great effort! Keep learning!");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground">Step-by-step explanation</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
            aria-label="Close"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="space-y-4">
              {/* Exercise Card */}
              <div className="bg-slate-50 rounded-xl border p-4">
                <h4 className="flex items-center gap-2 font-semibold text-foreground mb-2">
                  <span>📘</span>
                  Exercise
                </h4>
                <p className="text-sm text-muted-foreground">
                  {exerciseQuestion || "Practice exercise"}
                </p>
              </div>

              {/* Explanation Card */}
              <div className="bg-card rounded-xl border shadow-md p-6">
                <ExplanationCards steps={steps} />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border">
          {process.env.NODE_ENV !== "production" && (
            <div className="mb-4 text-xs text-muted-foreground">
              <button 
                onClick={() => console.log("[Explain] steps", steps)}
                className="hover:text-foreground transition-colors"
              >
                Log steps
              </button>
              <span className="mx-2">•</span>
              <button 
                onClick={() => alert("If empty, check console for raw AI output and prompt.")}
                className="hover:text-foreground transition-colors"
              >
                Help
              </button>
            </div>
          )}
          <Button 
            onClick={handleTryAgain}
            className="w-full"
            size="lg"
          >
            Try again → +5 XP
          </Button>
        </div>
      </div>
    </div>
  );
}