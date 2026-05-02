import React from 'react';
import { FileText } from 'lucide-react';
import { ProblemSubmission } from '@/types/chat';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface ProblemCardProps {
  problem: ProblemSubmission;
}

const ProblemCard = ({ problem }: ProblemCardProps) => {
  const { language } = useLanguage();

  return (
    <div className="w-full rounded-lg border border-neutral-border bg-neutral-surface shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-border bg-white">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-neutral-text break-words">
              {problem.title || (language === 'fr' ? 'Problème' : 'Problem')}
            </h2>
            <Badge variant="outline" className="mt-2">
              {problem.status === 'needs_more_information'
                ? (language === 'fr' ? 'À clarifier' : 'Needs clarification')
                : (language === 'fr' ? 'Réponse attendue' : 'Awaiting answer')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm text-neutral-muted whitespace-pre-wrap break-words">
            {problem.statement || problem.rawText}
          </p>
        </div>

        {problem.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {problem.attachments.map(attachment => (
              <Badge key={attachment.id} variant="secondary">
                {attachment.filename}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-text">
            {language === 'fr' ? 'Ta réponse' : 'Your answer'}
          </label>
          <Textarea
            placeholder={language === 'fr' ? 'Écris ta réponse complète ici...' : 'Write your full answer here...'}
            className="min-h-[140px]"
          />
          <div className="flex justify-end">
            <Button disabled>
              {language === 'fr' ? 'Soumettre' : 'Submit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemCard;
