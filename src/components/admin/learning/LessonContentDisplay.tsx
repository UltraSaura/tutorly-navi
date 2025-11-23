import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, BookOpen, Lightbulb, AlertCircle, ClipboardList, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import type { LessonContent } from '@/types/learning';

interface LessonContentDisplayProps {
  content: LessonContent;
}

export function LessonContentDisplay({ content }: LessonContentDisplayProps) {
  const [openSections, setOpenSections] = useState<string[]>(['explanation']);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="space-y-3">
      {/* Generated info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Generated: {new Date(content.generated_at).toLocaleString()}</span>
        {content.generated_by_model && (
          <Badge variant="outline" className="text-xs">
            {content.generated_by_model}
          </Badge>
        )}
      </div>

      {/* Explanation */}
      <Collapsible
        open={openSections.includes('explanation')}
        onOpenChange={() => toggleSection('explanation')}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Explanation
              </CardTitle>
              <ChevronDown className={`w-4 h-4 transition-transform ${openSections.includes('explanation') ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{content.explanation}</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Example */}
      <Collapsible
        open={openSections.includes('example')}
        onOpenChange={() => toggleSection('example')}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Worked Example
              </CardTitle>
              <ChevronDown className={`w-4 h-4 transition-transform ${openSections.includes('example') ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{content.example}</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Common Mistakes */}
      <Collapsible
        open={openSections.includes('mistakes')}
        onOpenChange={() => toggleSection('mistakes')}
      >
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Common Mistakes ({content.common_mistakes.length})
              </CardTitle>
              <ChevronDown className={`w-4 h-4 transition-transform ${openSections.includes('mistakes') ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                {content.common_mistakes.map((mistake, idx) => (
                  <li key={idx} className="text-sm">{mistake}</li>
                ))}
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Task Counts */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Practice Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{content.guided_practice.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Exit Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{content.exit_ticket.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
