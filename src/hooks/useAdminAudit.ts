import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  action: string;
  target_table?: string;
  target_id?: string;
  details?: Record<string, any>;
}

export const useAdminAudit = () => {
  const logAction = async (entry: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Cannot log action: No authenticated user');
        return;
      }

      const { error } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: entry.action,
          target_table: entry.target_table,
          target_id: entry.target_id,
          details: entry.details,
        });

      if (error) {
        console.error('Failed to log admin action:', error);
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  return { logAction };
};
