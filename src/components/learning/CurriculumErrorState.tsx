import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/SimpleLanguageContext';

export const CurriculumErrorState = ({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">
            {t('learning.curriculumLoadError') || 'Unable to load curriculum'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={onRetry} variant="outline">
            {t('common.retry') || 'Retry'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
