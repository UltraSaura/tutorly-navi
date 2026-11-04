import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';

type AdminRole = 'content_manager' | 'curriculum_manager' | 'super_admin';
type AdminAccount = { user_id: string; email: string | null; first_name: string | null; last_name: string | null; roles: string[] };

const ROLE_OPTIONS: Array<{ value: AdminRole; label: string }> = [
  { value: 'content_manager', label: 'Content Manager' },
  { value: 'curriculum_manager', label: 'Curriculum Manager' },
  { value: 'super_admin', label: 'Super Admin' },
];

export function AdministratorAccessManagement() {
  const { hasPermission, refreshPermissions } = useAdminAuth();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_accounts');
    if (error) toast.error(error.message || 'Unable to load administrator access');
    else setAccounts((data ?? []) as AdminAccount[]);
    setLoading(false);
  };

  useEffect(() => { void loadAccounts(); }, []);

  if (!hasPermission('roles.manage')) return null;

  const currentAdminRole = (roles: string[]) => {
    if (roles.includes('super_admin')) return 'super_admin';
    if (roles.includes('content_manager')) return 'content_manager';
    if (roles.includes('curriculum_manager')) return 'curriculum_manager';
    if (roles.includes('admin')) return 'legacy_admin';
    return 'none';
  };

  const changeRole = async (account: AdminAccount, role: string) => {
    if (role === 'none') {
      if (!window.confirm('Revoke this administrator access?')) return;
    } else if (!window.confirm(`Assign ${ROLE_OPTIONS.find(option => option.value === role)?.label ?? role}?`)) {
      return;
    }
    setSavingUser(account.user_id);
    const { error } = await supabase.rpc('admin_set_role', { _target_user: account.user_id, _role: role === 'none' ? null : role });
    if (error) toast.error(error.message || 'Unable to update administrator role');
    else {
      toast.success('Administrator role updated');
      await loadAccounts();
      await refreshPermissions();
    }
    setSavingUser(null);
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Administrator access</CardTitle>
        <CardDescription>Assign or revoke administrator roles. Existing legacy administrators remain full-access until explicitly changed.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading administrator accounts…</p> : (
          <div className="space-y-3">
            {accounts.map(account => {
              const role = currentAdminRole(account.roles);
              const label = [account.first_name, account.last_name].filter(Boolean).join(' ') || account.email || account.user_id;
              return (
                <div key={account.user_id} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                  <div><p className="font-medium">{label}</p><p className="text-xs text-muted-foreground">{account.email}</p></div>
                  <div className="flex items-center gap-2">
                    <Select value={role} onValueChange={(value) => void changeRole(account, value)} disabled={savingUser === account.user_id}>
                      <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {role === 'legacy_admin' && <SelectItem value="legacy_admin">Legacy Admin (full access)</SelectItem>}
                        <SelectItem value="none">No administrator access</SelectItem>
                        {ROLE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
