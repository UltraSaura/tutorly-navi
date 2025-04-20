import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { PromptTemplate, NewPromptTemplate } from '@/types/admin';
import { PromptTemplateCard } from './prompts/PromptTemplateCard';
import { PromptEditor } from './prompts/PromptEditor';
import { PromptTemplateDetails } from './prompts/PromptTemplateDetails';
import { NewTemplateDialog } from './prompts/NewTemplateDialog';

const promptTemplates: PromptTemplate[] = [
  {
    id: '1',
    name: 'Math Tutor',
    subject: 'Mathematics',
    description: 'Friendly tutor for elementary to high school math',
    prompt: `You are a helpful and patient math tutor for students from elementary to high school level. Explain concepts clearly using simple language and examples. When students are stuck, guide them step by step rather than giving away answers. Use encouraging language and positive reinforcement. For incorrect answers, explain what went wrong and how to improve. Tailor explanations to the student's grade level.`,
    tags: ['math', 'elementary', 'high school', 'algebra', 'geometry'],
    isActive: true,
    lastModified: new Date(2023, 5, 20),
    type: 'tutor'
  },
  {
    id: '2',
    name: 'Science Explainer',
    subject: 'Science',
    description: 'Makes complex science concepts accessible to students',
    prompt: `You are a science educator who makes complex concepts accessible and engaging for K-12 students. Use analogies and real-world examples to explain scientific principles. When discussing theories, distinguish between established scientific consensus and ongoing research. Ask follow-up questions to check understanding and encourage critical thinking. Use age-appropriate language but never talk down to students. For experiments, emphasize safety first.`,
    tags: ['science', 'biology', 'chemistry', 'physics', 'environmental'],
    isActive: false,
    lastModified: new Date(2023, 5, 18),
    type: 'tutor'
  },
  {
    id: '3',
    name: 'Essay Feedback',
    subject: 'Language Arts',
    description: 'Provides constructive feedback on essays and writing',
    prompt: `You are an English teacher who provides constructive feedback on student essays and writing assignments. Focus on both strengths and areas for improvement. Start with positive observations before suggesting changes. Give specific, actionable advice rather than vague criticism. Cover structure, argumentation, evidence usage, grammar, and style as appropriate to the student's level. Suggest rewrites for problematic sentences but encourage students to revise themselves. Adapt your feedback to the student's grade level and writing experience.`,
    tags: ['writing', 'essays', 'grammar', 'language arts', 'feedback'],
    isActive: false,
    lastModified: new Date(2023, 5, 15),
    type: 'tutor'
  },
  {
    id: '4',
    name: 'Answer Grader',
    subject: 'All Subjects',
    description: 'Strict correct/incorrect grading of answers',
    prompt: 'You are a grader. Your role is to ONLY determine if the answer is correct or incorrect. Respond with ONLY "CORRECT" or "INCORRECT" and nothing else. For math problems, verify the calculation but do not explain why.',
    tags: ['grading', 'assessment', 'evaluation'],
    isActive: true,
    lastModified: new Date(2023, 5, 15),
    type: 'grading'
  }
];

const SystemPromptConfig = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>(promptTemplates);
  const [activeTab, setActiveTab] = useState<string>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(templates.find(t => t.isActive) || null);
  const [editedPrompt, setEditedPrompt] = useState<string>(selectedTemplate?.prompt || '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState<NewPromptTemplate>({
    name: '',
    subject: 'General',
    description: '',
    prompt: '',
    tags: [],
    type: 'tutor'
  });
  const [newTag, setNewTag] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'tutor' | 'grading'>('all');
  
  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditedPrompt(template.prompt);
  };
  
  const handleActiveChange = (templateId: string) => {
    setTemplates(templates.map(template => ({
      ...template,
      isActive: template.id === templateId,
    })));
    
    const newActiveTemplate = templates.find(t => t.id === templateId);
    if (newActiveTemplate) {
      setSelectedTemplate(newActiveTemplate);
      setEditedPrompt(newActiveTemplate.prompt);
      toast.success(`"${newActiveTemplate.name}" set as the active system prompt`);
    }
  };
  
  const handleSavePrompt = () => {
    if (!selectedTemplate) return;
    
    setTemplates(templates.map(template => 
      template.id === selectedTemplate.id
        ? { ...template, prompt: editedPrompt, lastModified: new Date() }
        : template
    ));
    
    toast.success("System prompt updated successfully");
  };
  
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(template => template.id !== templateId));
    
    if (selectedTemplate?.id === templateId) {
      const firstTemplate = templates.find(t => t.id !== templateId);
      setSelectedTemplate(firstTemplate || null);
      setEditedPrompt(firstTemplate?.prompt || '');
    }
    
    toast.success("Template deleted successfully");
  };
  
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    setNewTemplate({
      ...newTemplate,
      tags: [...newTemplate.tags, newTag.trim()],
    });
    
    setNewTag('');
  };
  
  const handleRemoveTag = (tag: string) => {
    setNewTemplate({
      ...newTemplate,
      tags: newTemplate.tags.filter(t => t !== tag),
    });
  };
  
  const handleAddTemplate = () => {
    if (!newTemplate.name || !newTemplate.prompt) {
      toast.error("Name and prompt are required");
      return;
    }
    
    const newId = Date.now().toString();
    const newTemplateItem: PromptTemplate = {
      ...newTemplate,
      id: newId,
      isActive: false,
      lastModified: new Date(),
    };
    
    setTemplates([...templates, newTemplateItem]);
    setNewTemplate({
      name: '',
      subject: 'General',
      description: '',
      prompt: '',
      tags: [],
      type: 'tutor'
    });
    
    setShowAddDialog(false);
    toast.success("New template added successfully");
  };
  
  const filteredTemplates = templates.filter(template => 
    selectedType === 'all' || template.type === selectedType
  );
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Prompt Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Customize how the AI tutor behaves and responds to students
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md glass">
          <TabsTrigger value="templates">Prompt Templates</TabsTrigger>
          <TabsTrigger value="editor">Prompt Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Available Templates</h2>
              <Select 
                value={selectedType}
                onValueChange={(value: 'all' | 'tutor' | 'grading') => setSelectedType(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                  <SelectItem value="grading">Grading</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button className="bg-studywhiz-600 hover:bg-studywhiz-700" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <PromptTemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={handleTemplateSelect}
                onDelete={handleDeleteTemplate}
                onSetActive={handleActiveChange}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="editor" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PromptTemplateDetails selectedTemplate={selectedTemplate} />
            <PromptEditor
              selectedTemplate={selectedTemplate}
              editedPrompt={editedPrompt}
              onPromptChange={setEditedPrompt}
              onSave={handleSavePrompt}
            />
          </div>
        </TabsContent>
      </Tabs>

      <NewTemplateDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        newTemplate={newTemplate}
        onNewTemplateChange={setNewTemplate}
        onAddTemplate={handleAddTemplate}
        newTag={newTag}
        onNewTagChange={setNewTag}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
};

export default SystemPromptConfig;
