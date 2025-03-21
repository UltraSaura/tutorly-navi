
import { useState, useRef } from 'react';
import { Save, Trash2, Plus, FileText, RefreshCw, Copy, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface PromptTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  prompt: string;
  tags: string[];
  isActive: boolean;
  lastModified: Date;
}

const promptTemplates: PromptTemplate[] = [
  {
    id: '1',
    name: 'Math Tutor',
    subject: 'Mathematics',
    description: 'Friendly tutor for elementary to high school math',
    prompt: 'You are a helpful and patient math tutor for students from elementary to high school level. Explain concepts clearly using simple language and examples. When students are stuck, guide them step by step rather than giving away answers. Use encouraging language and positive reinforcement. For incorrect answers, explain what went wrong and how to improve. Tailor explanations to the student's grade level.',
    tags: ['math', 'elementary', 'high school', 'algebra', 'geometry'],
    isActive: true,
    lastModified: new Date(2023, 5, 20),
  },
  {
    id: '2',
    name: 'Science Explainer',
    subject: 'Science',
    description: 'Makes complex science concepts accessible to students',
    prompt: 'You are a science educator who makes complex concepts accessible and engaging for K-12 students. Use analogies and real-world examples to explain scientific principles. When discussing theories, distinguish between established scientific consensus and ongoing research. Ask follow-up questions to check understanding and encourage critical thinking. Use age-appropriate language but never talk down to students. For experiments, emphasize safety first.',
    tags: ['science', 'biology', 'chemistry', 'physics', 'environmental'],
    isActive: false,
    lastModified: new Date(2023, 5, 18),
  },
  {
    id: '3',
    name: 'Essay Feedback',
    subject: 'Language Arts',
    description: 'Provides constructive feedback on essays and writing',
    prompt: 'You are an English teacher who provides constructive feedback on student essays and writing assignments. Focus on both strengths and areas for improvement. Start with positive observations before suggesting changes. Give specific, actionable advice rather than vague criticism. Cover structure, argumentation, evidence usage, grammar, and style as appropriate to the student's level. Suggest rewrites for problematic sentences but encourage students to revise themselves. Adapt your feedback to the student's grade level and writing experience.',
    tags: ['writing', 'essays', 'grammar', 'language arts', 'feedback'],
    isActive: false,
    lastModified: new Date(2023, 5, 15),
  },
];

const SystemPromptConfig = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>(promptTemplates);
  const [activeTab, setActiveTab] = useState<string>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(templates.find(t => t.isActive) || null);
  const [editedPrompt, setEditedPrompt] = useState<string>(selectedTemplate?.prompt || '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Omit<PromptTemplate, 'id' | 'lastModified' | 'isActive'>>({
    name: '',
    subject: 'General',
    description: '',
    prompt: '',
    tags: [],
  });
  const [newTag, setNewTag] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  
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
    });
    
    setShowAddDialog(false);
    toast.success("New template added successfully");
  };
  
  const handleCopyPrompt = () => {
    if (!selectedTemplate) return;
    
    navigator.clipboard.writeText(editedPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    
    toast.success("Prompt copied to clipboard");
  };
  
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
            <h2 className="text-xl font-semibold">Available Templates</h2>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-studywhiz-600 hover:bg-studywhiz-700">
                  <Plus className="mr-2 h-4 w-4" /> New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Prompt Template</DialogTitle>
                  <DialogDescription>
                    Create a new system prompt template for the AI tutor.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="templateName" className="text-right text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="templateName"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="col-span-3"
                      placeholder="e.g., History Tutor"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="templateSubject" className="text-right text-sm font-medium">
                      Subject
                    </label>
                    <Select 
                      value={newTemplate.subject} 
                      onValueChange={(value) => setNewTemplate({ ...newTemplate, subject: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Language Arts">Language Arts</SelectItem>
                        <SelectItem value="History">History</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                        <SelectItem value="Programming">Programming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="templateDescription" className="text-right text-sm font-medium">
                      Description
                    </label>
                    <Input
                      id="templateDescription"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      className="col-span-3"
                      placeholder="Brief description of the template's purpose"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-start gap-4">
                    <label htmlFor="templatePrompt" className="text-right text-sm font-medium pt-2">
                      Prompt
                    </label>
                    <Textarea
                      id="templatePrompt"
                      value={newTemplate.prompt}
                      onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                      className="col-span-3 min-h-32"
                      placeholder="Enter the system prompt instructions..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-start gap-4">
                    <label className="text-right text-sm font-medium pt-2">
                      Tags
                    </label>
                    <div className="col-span-3 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag"
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={handleAddTag}
                        >
                          Add
                        </Button>
                      </div>
                      
                      {newTemplate.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newTemplate.tags.map((tag, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary"
                              className="px-2 py-1 flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                                onClick={() => handleRemoveTag(tag)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-studywhiz-600 hover:bg-studywhiz-700"
                    onClick={handleAddTemplate}
                  >
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className={`glass cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-studywhiz-500' : ''
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.name}
                        {template.isActive && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">
                            Active
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{template.subject}</CardDescription>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Prompt Preview:</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">{template.prompt}</p>
                  </div>
                  
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {template.lastModified.toLocaleDateString()}
                  </p>
                  
                  {!template.isActive && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActiveChange(template.id);
                      }}
                    >
                      Set Active
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="editor" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass lg:col-span-1">
              <CardHeader>
                <CardTitle>Active Template</CardTitle>
                <CardDescription>
                  Currently active system prompt that guides the AI tutor's behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">{selectedTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Subject</p>
                      <Badge variant="outline" className="mt-1">
                        {selectedTemplate.subject}
                      </Badge>
                    </div>
                    
                    {selectedTemplate.tags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Tags</p>
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
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-sm">
                        {selectedTemplate.lastModified.toLocaleDateString()} at {' '}
                        {selectedTemplate.lastModified.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-center">
                      No template selected. Please select a template from the Templates tab.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="glass lg:col-span-2">
              <CardHeader>
                <CardTitle>Edit Prompt</CardTitle>
                <CardDescription>
                  Modify the system prompt to customize the AI tutor's behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <Textarea
                      ref={promptTextareaRef}
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
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
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-center">
                      No template selected. Please select a template from the Templates tab.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (selectedTemplate) {
                        setEditedPrompt(selectedTemplate.prompt);
                      }
                    }}
                    disabled={!selectedTemplate}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleCopyPrompt}
                    disabled={!selectedTemplate}
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
                  onClick={handleSavePrompt}
                  disabled={!selectedTemplate || editedPrompt === selectedTemplate.prompt}
                  className="bg-studywhiz-600 hover:bg-studywhiz-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemPromptConfig;
