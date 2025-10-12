import { useState } from 'react';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianExplanations } from '@/hooks/useGuardianExplanations';
import ExplanationCard from '@/components/guardian/ExplanationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, BookOpen } from 'lucide-react';
import { ExplanationModal } from '@/features/explanations/ExplanationModal';

export default function GuardianExplanations() {
  const { guardianId, loading: authLoading } = useGuardianAuth();
  const { data: explanations, isLoading } = useGuardianExplanations(guardianId);
  const [selectedExplanation, setSelectedExplanation] = useState<any>(null);

  const handleViewExplanation = (explanation: any) => {
    setSelectedExplanation(explanation);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Explanations</h1>
        <p className="text-muted-foreground">
          View AI-generated explanations for your children's exercises
        </p>
      </div>

      {explanations && explanations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {explanations.map((explanation: any) => (
            <ExplanationCard
              key={explanation.id}
              explanation={explanation}
              onView={handleViewExplanation}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No explanations yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Explanations will appear here when your children complete exercises and request help.
            </p>
          </CardContent>
        </Card>
      )}

      <ExplanationModal
        open={!!selectedExplanation}
        onClose={() => setSelectedExplanation(null)}
        loading={false}
        sections={selectedExplanation?.explanation_data}
        error={null}
        onTryAgain={() => {}}
        exerciseQuestion={selectedExplanation?.exerciseContent || ''}
      />
    </div>
  );
}
