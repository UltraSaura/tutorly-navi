import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Plus } from 'lucide-react';

interface Variable {
  name: string;
  description: string;
  example: string;
}

const AVAILABLE_VARIABLES: Variable[] = [
  {
    name: 'student_level',
    description: 'Student\'s school level (e.g., Grade 5, High School)',
    example: 'Grade 8'
  },
  {
    name: 'first_name',
    description: 'Student\'s first name for personalization',
    example: 'Sarah'
  },
  {
    name: 'country',
    description: 'Student\'s country for curriculum context',
    example: 'Canada'
  },
  {
    name: 'learning_style',
    description: 'Student\'s preferred learning style',
    example: 'visual'
  },
  {
    name: 'user_type',
    description: 'Type of user (student, parent)',
    example: 'student'
  }
];

interface VariableHelperProps {
  onInsertVariable: (variableName: string) => void;
}

export const VariableHelper = ({ onInsertVariable }: VariableHelperProps) => {
  return (
    <Card className="glass border border-border/50">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-4 w-4" />
          Available Variables
        </CardTitle>
        <CardDescription>
          Click to insert variables into your prompt. Variables will be replaced with actual student data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground mb-3">
          <strong>Usage:</strong> Variables use the format <code className="bg-muted px-1 py-0.5 rounded">{'{{variable_name}}'}</code>
        </div>
        
        <div className="space-y-2">
          {AVAILABLE_VARIABLES.map((variable) => (
            <div
              key={variable.name}
              className="flex items-start justify-between p-3 rounded-md border border-border/30 hover:border-border/60 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {`{{${variable.name}}}`}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {variable.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> {variable.example}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onInsertVariable(variable.name)}
                className="ml-2 shrink-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted/30 rounded-md">
          <p className="text-sm text-muted-foreground">
            <strong>Example usage:</strong>
          </p>
          <code className="text-xs block mt-1 text-foreground">
            {`"You are helping {{first_name}}, a {{student_level}} student from {{country}}. Adapt your explanations to {{student_level}} level."`}
          </code>
        </div>
      </CardContent>
    </Card>
  );
};