import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SkillCardProps {
  name: string;
  exercises: number;
  onStart: () => void;
}

export function SkillCard({ name, exercises, onStart }: SkillCardProps) {
  const ui = useInterfaceTranslation();
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{name}</p>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{exercises} {ui("quick exercises")}</p>
        <Button size="sm" className="w-full" onClick={onStart}>
          {ui("Start")}
        </Button>
      </CardContent>
    </Card>
  );
}
