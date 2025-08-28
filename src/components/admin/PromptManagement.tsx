import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePromptManagement } from '@/hooks/usePromptManagement';
import { Loader2, Plus, Settings } from 'lucide-react';
import SystemPromptConfigNew from './SystemPromptConfigNew';

const PromptManagement = () => {
  const { templates, loading } = usePromptManagement();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading prompt templates...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompt Management</h2>
          <p className="text-muted-foreground">
            Centralized management of AI prompts across all system interactions
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Overview of active prompt templates by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {['chat', 'grading'].map((type) => {
                const typeTemplates = templates.filter(t => t.usage_type === type);
                const activeCount = typeTemplates.filter(t => t.is_active).length;
                
                return (
                  <div key={type} className="text-center">
                    <div className="text-2xl font-bold">{activeCount}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {type.replace('_', ' ')} Active
                    </div>
                    <Badge variant={activeCount > 0 ? 'default' : 'secondary'} className="mt-1">
                      {typeTemplates.length} Total
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <SystemPromptConfigNew />
      </div>
    </div>
  );
};

export default PromptManagement;