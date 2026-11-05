import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminAccessControlProps {
  userId: string;
}

/** The legacy admin capability, exposed as a simple promote/revoke control. */
export function AdminAccessControl({ userId }: AdminAccessControlProps) {
  const { isAdmin } = useAdminAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setHasAccess(false);
    void supabase.from('user_roles').select('role')
      .eq('user_id', userId).eq('role', 'admin')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error('Unable to load administrator access');
        else setHasAccess((data?.length ?? 0) > 0);
        setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  if (!isAdmin) return null;

  const setAccess = async () => {
    if (loading || saving) return;
    setSaving(true);
    const { error } = await supabase.rpc('admin_set_role', {
      _target_user: userId,
      _role: hasAccess ? null : 'admin',
    });

    if (error) {
      toast.error(error.message || 'Unable to update administrator access');
    } else {
      const { data, error: verifyError } = await supabase.from('user_roles').select('role')
        .eq('user_id', userId).eq('role', 'admin');
      if (verifyError) {
        toast.error('Could not verify administrator access');
      } else {
        const enabled = (data?.length ?? 0) > 0;
        setHasAccess(enabled);
        toast.success(enabled ? 'Administrator access enabled' : 'Administrator access revoked');
      }
    }
    setSaving(false);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-semibold">Administrator access</p>
        <p className="text-xs text-muted-foreground">
          {loading ? 'Checking access…' : hasAccess ? 'Enabled — full admin access' : 'Disabled — normal access only'}
        </p>
      </div>
      <Button type="button" variant={hasAccess ? 'outline' : 'default'}
        disabled={loading || saving} onClick={() => void setAccess()}>
        {saving ? 'Saving…' : hasAccess ? 'Revoke Admin' : 'Promote to Admin'}
      </Button>
    </div>
  );
}
