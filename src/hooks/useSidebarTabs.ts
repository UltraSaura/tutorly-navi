
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SidebarTab {
  id: string;
  title: string;
  path: string;
  icon_name: string;
  is_visible: boolean;
  user_type: string;
  sort_order: number;
}

export const useSidebarTabs = (userType: string = 'user') => {
  return useQuery({
    queryKey: ['sidebar-tabs', userType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sidebar_tabs')
        .select('*')
        .eq('user_type', userType)
        .eq('is_visible', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as SidebarTab[];
    },
  });
};
