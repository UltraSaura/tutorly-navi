import { useEffect, useState } from 'react';
import { Check, Loader2, Palette } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  LEARNING_STYLE_COPY,
  normalizeLearningStyle,
  type LearningStyle,
} from '@/types/learning-style';
import { trackLearningInteraction } from '@/services/learningAnalytics';

type LearningPreferenceOption = {
  value: LearningStyle;
  emoji: string;
};

const OPTIONS: LearningPreferenceOption[] = [
  { value: 'visual', emoji: '👀' },
  { value: 'auditory', emoji: '👂' },
  { value: 'kinesthetic', emoji: '✋' },
  { value: 'mixed', emoji: '🌈' },
];

export function LearningPreferenceSelector() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStyle, setSelectedStyle] = useState<LearningStyle>('mixed');

  const { data: savedStyle, isLoading } = useQuery({
    queryKey: ['learning-preference', user?.id],
    queryFn: async (): Promise<LearningStyle> => {
      if (!user?.id) return 'mixed';

      const { data, error } = await supabase
        .from('users')
        .select('style')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return normalizeLearningStyle(data?.style);
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    setSelectedStyle(savedStyle ?? 'mixed');
  }, [savedStyle]);

  const updatePreference = useMutation({
    mutationFn: async ({ style, oldStyle }: { style: LearningStyle; oldStyle: LearningStyle }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ style })
        .eq('id', user.id);

      if (error) throw error;
      return { style, oldStyle };
    },
    onSuccess: ({ style, oldStyle }) => {
      setSelectedStyle(style);
      queryClient.invalidateQueries({ queryKey: ['learning-preference', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-context', user?.id] });
      if (oldStyle !== style) {
        trackLearningInteraction({
          studentId: user?.id,
          eventType: 'learning_preference_changed',
          learningStyleUsed: style,
          supportType: style,
          metadata: {
            oldLearningStyle: oldStyle,
            newLearningStyle: style,
          },
        });
      }
      toast({
        title: 'Learning preference saved',
        description: `${LEARNING_STYLE_COPY[style].label} is now selected.`,
      });
    },
    onError: () => {
      toast({
        title: 'Could not save preference',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSelect = (style: LearningStyle) => {
    const oldStyle = normalizeLearningStyle(savedStyle ?? selectedStyle);
    setSelectedStyle(style);
    updatePreference.mutate({ style, oldStyle });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Learning Preference
        </CardTitle>
        <CardDescription>
          Choose the kind of help that feels best for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OPTIONS.map((option) => {
              const copy = LEARNING_STYLE_COPY[option.value];
              const isSelected = selectedStyle === option.value;
              const isSaving = updatePreference.isPending && isSelected;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={updatePreference.isPending}
                  aria-pressed={isSelected}
                  className={cn(
                    'min-h-32 rounded-xl border bg-card p-4 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40',
                    updatePreference.isPending && 'cursor-wait opacity-80'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl leading-none" aria-hidden="true">
                      {option.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                        {copy.label}
                        {isSelected && (
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                        {copy.description}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
