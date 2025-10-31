import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PromptTemplate, NewPromptTemplate, SubjectPromptAssignment } from '@/types/admin';
import { toast } from 'sonner';

export const usePromptManagement = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [assignments, setAssignments] = useState<SubjectPromptAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all prompt templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      
      // Convert database dates to Date objects and ensure proper typing
      const formattedTemplates = data?.map(template => ({
        ...template,
        created_at: new Date(template.created_at),
        updated_at: new Date(template.updated_at),
        usage_type: template.usage_type as 'chat' | 'grading' | 'explanation' | 'math_enhanced',
        tags: template.tags || [],
        is_active: template.is_active || false,
        auto_activate: template.auto_activate || false,
        priority: template.priority || 0,
        description: template.description || '',
        subject: template.subject || ''
      })) || [];

      setTemplates(formattedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load prompt templates');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subject-prompt assignments
  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_prompt_assignments')
        .select('*');

      if (error) throw error;

      const formattedAssignments = data?.map(assignment => ({
        ...assignment,
        created_at: new Date(assignment.created_at)
      })) || [];

      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load subject assignments');
    }
  };

  // Get active template by usage type and subject
  const getActiveTemplate = (usageType: string, subject?: string): PromptTemplate | null => {
    const activeTemplates = templates.filter(template => 
      template.is_active && 
      template.usage_type === usageType &&
      (subject ? template.subject === subject || template.subject === 'All Subjects' : true)
    );

    // Return highest priority template
    return activeTemplates.sort((a, b) => b.priority - a.priority)[0] || null;
  };

  // Get templates for a specific subject
  const getTemplatesForSubject = (subjectId: string, usageType?: string): PromptTemplate[] => {
    const subjectAssignments = assignments.filter(a => 
      a.subject_id === subjectId && 
      (usageType ? a.usage_type === usageType : true)
    );
    
    const templateIds = subjectAssignments.map(a => a.prompt_template_id);
    
    return templates.filter(t => 
      templateIds.includes(t.id) ||
      (t.auto_activate && (t.subject === subjectId || t.subject === 'All Subjects'))
    );
  };

  // Set active template
  const setActiveTemplate = async (templateId: string, usageType: string) => {
    try {
      // First, deactivate all templates of the same usage type
      await supabase
        .from('prompt_templates')
        .update({ is_active: false })
        .eq('usage_type', usageType);

      // Then activate the selected template
      const { error } = await supabase
        .from('prompt_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (error) throw error;

      await fetchTemplates();
      toast.success('Active prompt updated');
    } catch (error) {
      console.error('Error setting active template:', error);
      toast.error('Failed to update active prompt');
    }
  };

  // Add new template
  const addTemplate = async (template: NewPromptTemplate) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .insert([template]);

      if (error) throw error;

      await fetchTemplates();
      toast.success('Template added successfully');
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Failed to add template');
    }
  };

  // Update template
  const updateTemplate = async (id: string, updates: Partial<PromptTemplate>) => {
    try {
      // Convert dates to strings for database
      const dbUpdates = {
        ...updates,
        created_at: undefined, // Don't update created_at
        updated_at: undefined, // Will be handled by trigger
      };

      const { error } = await supabase
        .from('prompt_templates')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      await fetchTemplates();
      toast.success('Template updated successfully');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchTemplates();
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Auto-activate prompts for subject
  const autoActivateForSubject = async (subjectId: string) => {
    try {
      const subjectTemplates = templates.filter(t => 
        t.auto_activate && 
        (t.subject === subjectId || t.subject === 'All Subjects')
      );

      // Group by usage type and activate highest priority
      const usageTypes = ['chat', 'grading', 'explanation', 'math_enhanced'];
      
      for (const usageType of usageTypes) {
        const typeTemplates = subjectTemplates.filter(t => t.usage_type === usageType);
        if (typeTemplates.length > 0) {
          const highestPriority = typeTemplates.sort((a, b) => b.priority - a.priority)[0];
          await setActiveTemplate(highestPriority.id, usageType);
        }
      }
    } catch (error) {
      console.error('Error auto-activating templates:', error);
    }
  };

  // Assign template to subject
  const assignToSubject = async (templateId: string, subjectId: string, usageType: string, isPrimary = false) => {
    try {
      const { error } = await supabase
        .from('subject_prompt_assignments')
        .insert([{
          prompt_template_id: templateId,
          subject_id: subjectId,
          usage_type: usageType,
          is_primary: isPrimary
        }]);

      if (error) throw error;

      await fetchAssignments();
      toast.success('Template assigned to subject');
    } catch (error) {
      console.error('Error assigning template:', error);
      toast.error('Failed to assign template');
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchTemplates();
    fetchAssignments();
  }, []);

  return {
    templates,
    assignments,
    loading,
    getActiveTemplate,
    getTemplatesForSubject,
    setActiveTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    autoActivateForSubject,
    assignToSubject,
    refetch: () => {
      fetchTemplates();
      fetchAssignments();
    }
  };
};