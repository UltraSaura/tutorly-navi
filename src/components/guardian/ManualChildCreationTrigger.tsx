import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const ManualChildCreationTrigger: React.FC = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [hasPendingChildren, setHasPendingChildren] = useState(false);

  useEffect(() => {
    // Check for pending children on component mount
    const pendingChildren = localStorage.getItem('pending_children');
    setHasPendingChildren(!!pendingChildren);
    console.log('ManualChildCreationTrigger: Checking for pending children:', !!pendingChildren);
  }, []);

  const handleCreatePendingChildren = async () => {
    const pendingChildrenData = localStorage.getItem('pending_children');
    
    if (!pendingChildrenData) {
      toast({
        title: 'No Pending Children',
        description: 'No pending children data found in localStorage.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      const { children, sharedPassword } = JSON.parse(pendingChildrenData);
      
      console.log('=== Manual Child Creation: Starting ===');
      console.log('Pending children data:', { children, sharedPassword });

      for (const child of children) {
        console.log(`=== Creating account for child: ${child.firstName} (${child.username}) ===`);
        const childPassword = child.password || sharedPassword;
        
        if (!childPassword) {
          console.error(`Child ${child.username} is missing a password.`);
          toast({
            title: 'Child Creation Error',
            description: `Child ${child.firstName} is missing a password. Please provide one.`,
            variant: 'destructive',
          });
          continue;
        }

        console.log('Calling Edge Function with data:', {
          username: child.username,
          password: childPassword ? '[REDACTED]' : 'NO_PASSWORD',
          firstName: child.firstName,
          lastName: '',
          email: child.email || null,
          schoolLevel: child.schoolLevel,
          relation: 'parent'
        });

        const requestBody = {
          username: child.username,
          password: childPassword,
          firstName: child.firstName,
          lastName: '',
          email: child.email || null,
          schoolLevel: child.schoolLevel,
          relation: 'parent'
        };

        const { data, error } = await supabase.functions.invoke('create-child-account', {
          body: requestBody
        });

        console.log('Edge Function response:', { data, error });

        if (error) {
          console.error(`Error creating child ${child.username}:`, error);
          toast({
            title: 'Child Creation Error',
            description: `Failed to create account for ${child.firstName}: ${error.message}`,
            variant: 'destructive',
          });
        } else if (data && data.success) {
          toast({
            title: 'Child Account Created',
            description: `Account for ${child.firstName} created successfully!`,
          });
        } else {
          console.error(`Unknown error creating child ${child.username}:`, data);
          toast({
            title: 'Child Creation Error',
            description: `Failed to create account for ${child.firstName}: ${data?.error || 'Unknown error'}`,
            variant: 'destructive',
          });
        }
      }

      // Clear the pending children data
      localStorage.removeItem('pending_children');
      setHasPendingChildren(false);
      toast({
        title: 'Child Creation Complete',
        description: 'All pending child accounts have been processed.',
      });

    } catch (error) {
      console.error('Error in manual child creation:', error);
      toast({
        title: 'Child Creation Error',
        description: `An error occurred: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Don't render if no pending children
  if (!hasPendingChildren) {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
      <h3 className="font-medium text-yellow-800 mb-2">Pending Child Accounts</h3>
      <p className="text-sm text-yellow-700 mb-3">
        You have pending child accounts that need to be created. Click the button below to create them.
      </p>
      <Button 
        onClick={handleCreatePendingChildren} 
        disabled={isCreating}
        className="bg-yellow-600 hover:bg-yellow-700"
      >
        {isCreating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Accounts...
          </>
        ) : (
          'Create Pending Child Accounts'
        )}
      </Button>
    </div>
  );
};
