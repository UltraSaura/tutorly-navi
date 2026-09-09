import { useLocale } from '@/i18n/useLocale';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { PromptTemplate } from '@/types/admin';
import { getPromptTemplateDisplayName } from './promptUsageLabels';

interface PromptTemplateDetailsProps {
  selectedTemplate: PromptTemplate | null;
}

export const PromptTemplateDetails = ({ selectedTemplate }: PromptTemplateDetailsProps) => {
  const { locale, dateLocale } = useLocale();
  const ui = useInterfaceTranslation();
  if (!selectedTemplate) {
    return (
      <Card className="glass lg:col-span-1">
        <CardHeader>
          <CardTitle>{ui("Active Template")}</CardTitle>
          <CardDescription>
            {ui("Currently active system prompt that guides the AI tutor's behavior")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">
              {ui("No template selected. Please select a template from the Templates tab.")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass lg:col-span-1">
      <CardHeader>
        <CardTitle>{ui("Active Template")}</CardTitle>
        <CardDescription>
          {ui("Currently active system prompt that guides the AI tutor's behavior")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{getPromptTemplateDisplayName(selectedTemplate)}</h3>
            <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium">{ui("Subject")}</p>
            <Badge variant="outline" className="mt-1">
              {selectedTemplate.subject}
            </Badge>
          </div>
          
          {selectedTemplate.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium">{ui("Tags")}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTemplate.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium">{ui("Last Updated")}</p>
            <p className="text-sm">
              {new Date(selectedTemplate.updated_at).toLocaleDateString(locale)} {ui("at")} {' '}
              {new Date(selectedTemplate.updated_at).toLocaleTimeString(locale)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
