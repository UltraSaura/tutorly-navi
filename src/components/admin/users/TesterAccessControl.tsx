import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';

interface TesterAccessControlProps {
  userId: string;
}

/** Tester is a capability attached to an existing account, never an admin promotion. */
export function TesterAccessControl({ userId }: TesterAccessControlProps) {
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setHasAccess(false);
    void supabase.from('user_roles').select('role')
      .eq('user_id', userId).eq('role', 'tester')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error('Unable to load Tester access');
        else setHasAccess((data?.length ?? 0) > 0);
        setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  if (!isAdmin) return null;

  const setAccess = async () => {
    if (loading || saving) return;
    setSaving(true);
    const result = hasAccess
      ? await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'tester')
      : await supabase.from('user_roles').insert({ user_id: userId, role: 'tester' });
    if (result.error) {
      toast.error('Unable to update Tester access');
    } else {
      // Re-read the server rather than trusting an optimistic permission update.
      const { data, error } = await supabase.from('user_roles').select('role')
        .eq('user_id', userId).eq('role', 'tester');
      if (error) toast.error('Could not verify Tester access');
      else {
        const enabled = (data?.length ?? 0) > 0;
        setHasAccess(enabled);
        void queryClient.invalidateQueries({ queryKey: ['tester-role-list'] });
        toast.success(enabled ? 'Tester access enabled' : 'Tester access revoked');
      }
    }
    setSaving(false);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-semibold">Tester access</p>
        <p className="text-xs text-muted-foreground">
          {loading ? 'Checking access…' : hasAccess ? 'Enabled — can preview school levels' : 'Disabled — normal access only'}
        </p>
        <p className="text-xs text-muted-foreground">Does not grant administrator permissions.</p>
      </div>
      <Button type="button" variant={hasAccess ? 'outline' : 'default'}
        disabled={loading || saving} onClick={() => void setAccess()}>
        {saving ? 'Saving…' : hasAccess ? 'Revoke Tester' : 'Grant Tester'}
      </Button>
    </div>
  );
}
