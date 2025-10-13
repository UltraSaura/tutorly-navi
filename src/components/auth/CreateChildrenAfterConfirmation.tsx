import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CreateChildrenAfterConfirmation = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const createChildrenAccounts = async () => {
      console.log('=== CreateChildrenAfterConfirmation: Starting ===');
      console.log('User authenticated:', !!user);
      console.log('User ID:', user?.id);
      
      const pendingChildren = localStorage.getItem('pending_children');
      console.log('Pending children from localStorage:', pendingChildren);
      
      if (!pendingChildren) {
        console.log('No pending children found');
        return;
      }
      
      if (!user) {
        console.log('User not authenticated yet');
        return;
      }

      try {
        const { children, sharedPassword } = JSON.parse(pendingChildren);
        console.log('Parsed children data:', children);
        console.log('Shared password:', sharedPassword);

        for (const child of children) {
          console.log(`=== Creating account for child: ${child.firstName} (${child.username}) ===`);
          const childPassword = child.password || sharedPassword;
          
          console.log('Calling Edge Function with data:', {
            username: child.username,
            password: childPassword ? '[REDACTED]' : 'NO_PASSWORD',
            firstName: child.firstName,
            email: child.email || null,
            schoolLevel: child.schoolLevel,
            relation: 'parent'
          });
          
          // Call Edge Function to create child account
          const { data, error } = await supabase.functions.invoke('create-child-account', {
            body: {
              username: child.username,
              password: childPassword,
              firstName: child.firstName,
              email: child.email || null,
              schoolLevel: child.schoolLevel,
              relation: 'parent'
            }
          });

          console.log('Edge Function response:', { data, error });

          if (error) {
            console.error('Edge Function error:', error);
            toast({
              title: 'Error creating child account',
              description: `Failed to create account for ${child.firstName}: ${error.message}`,
              variant: 'destructive'
            });
          } else {
            console.log('Child account created successfully:', data);
          }
        }

        console.log('All children processed, removing from localStorage');
        localStorage.removeItem('pending_children');
        toast({
          title: 'Children accounts created',
          description: 'All child accounts have been set up successfully'
        });
      } catch (error) {
        console.error('Error in createChildrenAccounts:', error);
      }
    };

    // Only run if user is authenticated
    if (user) {
      createChildrenAccounts();
    }
  }, [user, toast]);

  return null;
};
