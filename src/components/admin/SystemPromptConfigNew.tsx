import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Eye, Settings } from 'lucide-react';
import { usePromptManagement } from '@/hooks/usePromptManagement';
import { PromptTemplate, NewPromptTemplate } from '@/types/admin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { NewTemplateDialog } from './prompts/NewTemplateDialog';
import { EditTemplateDialog } from './prompts/EditTemplateDialog';
import { ViewTemplateDialog } from './prompts/ViewTemplateDialog';

const SystemPromptConfigNew = () => {
  const {
    templates,
    loading,
    getActiveTemplate,
    setActiveTemplate,
    deleteTemplate,
    addTemplate,
    updateTemplate
  } = usePromptManagement();

  const [selectedUsageType, setSelectedUsageType] = useState<string>('chat');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  
  // New template form state
  const [newTemplate, setNewTemplate] = useState<NewPromptTemplate>({
    name: '',
    subject: '',
    description: '',
    prompt_content: '',
    tags: [],
    is_active: false,
    usage_type: 'chat',
    auto_activate: false,
    priority: 0
  });
  const [newTag, setNewTag] = useState('');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const usageTypes = [
    { value: 'chat', label: 'Chat Assistant', description: 'General assistant with cross-subject support, including math specialist' },
    { value: 'grading', label: 'Exercise Grader', description: 'Prompts for grading student answers' },
    { value: 'explanation', label: 'Explanation System', description: 'Prompts for generating step-by-step explanations' }
  ];

  const filteredTemplates = templates.filter(t => t.usage_type === selectedUsageType);
  const activeTemplate = getActiveTemplate(selectedUsageType);

  const handleActivate = async (templateId: string) => {
    await setActiveTemplate(templateId, selectedUsageType);
  };

  const handleDelete = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate(templateId);
    }
  };

  const handleAddTemplate = async () => {
    await addTemplate(newTemplate);
    setShowNewDialog(false);
    resetNewTemplate();
  };

  const handleEditTemplate = async (updates: Partial<PromptTemplate>) => {
    if (selectedTemplate) {
      await updateTemplate(selectedTemplate.id, updates);
    }
  };

  const handleView = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setShowViewDialog(true);
  };

  const handleEdit = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      name: '',
      subject: '',
      description: '',
      prompt_content: '',
      tags: [],
      is_active: false,
      usage_type: selectedUsageType as 'chat' | 'grading' | 'explanation',
      auto_activate: false,
      priority: 0
    });
    setNewTag('');
  };

  const addTag = () => {
    if (newTag.trim() && !newTemplate.tags.includes(newTag.trim())) {
      setNewTemplate({
        ...newTemplate,
        tags: [...newTemplate.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewTemplate({
      ...newTemplate,
      tags: newTemplate.tags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Prompt Management</h2>
          <p className="text-muted-foreground">
            Manage AI prompts centrally for all system interactions
          </p>
        </div>
        <Button onClick={() => {
          resetNewTemplate();
          setShowNewDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      <Tabs value={selectedUsageType} onValueChange={setSelectedUsageType}>
        <TabsList className="grid w-full grid-cols-3">
          {usageTypes.map((type) => (
            <TabsTrigger key={type.value} value={type.value} className="text-xs">
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {usageTypes.map((type) => (
          <TabsContent key={type.value} value={type.value} className="space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                {type.description}
                {activeTemplate && (
                  <span className="ml-2 font-medium">
                    Active: {activeTemplate.name}
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className={template.is_active ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.is_active && (
                            <Badge variant="default">Active</Badge>
                          )}
                          {template.auto_activate && (
                            <Badge variant="secondary">Auto-activate</Badge>
                          )}
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Subject: {template.subject}</span>
                          <span>•</span>
                          <span>Priority: {template.priority}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!template.is_active && (
                          <Button
                            size="sm"
                            onClick={() => handleActivate(template.id)}
                          >
                            Activate
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleView(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="bg-muted p-3 rounded text-sm font-mono max-h-32 overflow-y-auto">
                        {template.prompt_content.slice(0, 200)}
                        {template.prompt_content.length > 200 && '...'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredTemplates.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      No templates found for {type.label.toLowerCase()}
                    </p>
                    <Button 
                      className="mt-4"
                      onClick={() => {
                        resetNewTemplate();
                        setShowNewDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Template
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <NewTemplateDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        newTemplate={newTemplate}
        onNewTemplateChange={setNewTemplate}
        onAddTemplate={handleAddTemplate}
        newTag={newTag}
        onNewTagChange={setNewTag}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />

      <EditTemplateDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        template={selectedTemplate}
        onSave={handleEditTemplate}
      />

      <ViewTemplateDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        template={selectedTemplate}
      />
    </div>
  );
};

export default SystemPromptConfigNew;