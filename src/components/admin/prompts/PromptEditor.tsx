
import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Save, RefreshCw, Copy, CheckCheck, FileText } from 'lucide-react';
import { PromptTemplate } from '@/types/admin';
import { VariableHelper } from './VariableHelper';

interface PromptEditorProps {
  selectedTemplate: PromptTemplate | null;
  editedPrompt: string;
  onPromptChange: (value: string) => void;
  onSave: () => void;
  onInsertVariable?: (variableName: string) => void;
}

export const PromptEditor = ({
  selectedTemplate,
  editedPrompt,
  onPromptChange,
  onSave,
}: PromptEditorProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    if (!selectedTemplate) return;
    navigator.clipboard.writeText(editedPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleInsertVariable = (variableName: string) => {
    const textarea = promptTextareaRef.current;
    if (!textarea) return;

    const variable = `{{${variableName}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insert the variable at cursor position
    const newValue = editedPrompt.slice(0, start) + variable + editedPrompt.slice(end);
    onPromptChange(newValue);
    
    // Move cursor after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  if (!selectedTemplate) {
    return (
      <Card className="glass lg:col-span-2">
        <CardHeader>
          <CardTitle>Edit Prompt</CardTitle>
          <CardDescription>
            Modify the system prompt to customize the AI tutor's behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">
              No template selected. Please select a template from the Templates tab.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass lg:col-span-2">
      <CardHeader>
        <CardTitle>Edit Prompt</CardTitle>
        <CardDescription>
          Modify the system prompt to customize the AI tutor's behavior
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            ref={promptTextareaRef}
            value={editedPrompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="Enter system prompt instructions..."
          />
          
          <div className="p-4 border rounded-md bg-muted/30">
            <h4 className="text-sm font-medium mb-2">Tips for writing effective prompts:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Be specific about the AI's role and personality</li>
              <li>Define how to handle incorrect answers and misconceptions</li>
              <li>Specify the level of detail for explanations</li>
              <li>Include guidelines for age-appropriate language</li>
              <li>Set boundaries on what topics to avoid or focus on</li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onPromptChange(selectedTemplate.prompt_content)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleCopy}
          >
            {isCopied ? (
              <>
                <CheckCheck className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>
        
        <Button 
          onClick={onSave}
          disabled={editedPrompt === selectedTemplate.prompt_content}
          className="bg-studywhiz-600 hover:bg-studywhiz-700"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};
