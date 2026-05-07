import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountriesAndLevels } from '@/hooks/useCountriesAndLevels';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

interface EditChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: {
    id: string; // children.id
    user_id: string;
    grade?: string | null;
    curriculum_country_code?: string | null;
    curriculum_level_code?: string | null;
    users: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      username?: string | null;
      email?: string | null;
      country?: string | null;
      level?: string | null;
    };
  } | null;
}

export default function EditChildDialog({ open, onOpenChange, child }: EditChildDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');

  const { countries, loading: countriesLoading, getSchoolLevelsByCountry } = useCountriesAndLevels(country);
  const filteredLevels = country ? getSchoolLevelsByCountry(country) : [];

  // Pre-fill when child changes
  useEffect(() => {
    if (child) {
      setFirstName(child.users?.first_name || '');
      setLastName(child.users?.last_name || '');
      setEmail(child.users?.email || '');
      setCountry(child.users?.country || child.curriculum_country_code || '');
      setSchoolLevel(child.users?.level || child.curriculum_level_code || '');
    }
  }, [child]);

  // Reset school level when country changes
  useEffect(() => {
    if (country && filteredLevels.length > 0 && !filteredLevels.some(l => l.level_code === schoolLevel)) {
      setSchoolLevel('');
    }
  }, [country, filteredLevels, schoolLevel]);

  const handleSave = async () => {
    if (!child) return;
    setSaving(true);

    try {
      // Normalize curriculum codes to lowercase for consistent matching
      const normalizedCountry = country?.toLowerCase() || '';
      const normalizedLevel = schoolLevel?.toLowerCase() || '';

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          country: normalizedCountry,
          level: normalizedLevel,
          curriculum_country_code: normalizedCountry,
          curriculum_level_code: normalizedLevel,
        })
        .eq('id', child.user_id);

      if (userError) throw userError;

      // Update children table
      const { error: childError } = await supabase
        .from('children')
        .update({
          curriculum_country_code: normalizedCountry,
          curriculum_level_code: normalizedLevel,
          contact_email: email,
        })
        .eq('id', child.id);

      if (childError) throw childError;

      queryClient.invalidateQueries({ queryKey: ['guardian-children'] });
      toast({ title: 'Success', description: 'Child details updated successfully' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Child</DialogTitle>
          <DialogDescription>Update your child's information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={child?.users?.username || ''} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry} disabled={countriesLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>School Level</Label>
            <Select value={schoolLevel} onValueChange={setSchoolLevel} disabled={!country || filteredLevels.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={country ? 'Select level' : 'Select country first'} />
              </SelectTrigger>
              <SelectContent>
                {filteredLevels.map(l => (
                  <SelectItem key={l.level_code} value={l.level_code}>{l.level_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Child
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Child Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently remove this child's profile and unlink them from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!child) return;
                setDeleting(true);
                try {
                  const { error: linkError } = await supabase
                    .from('guardian_child_links')
                    .delete()
                    .eq('child_id', child.id);
                  if (linkError) throw linkError;

                  const { error: childError } = await supabase
                    .from('children')
                    .delete()
                    .eq('id', child.id);
                  if (childError) throw childError;

                  queryClient.invalidateQueries({ queryKey: ['guardian-children'] });
                  toast({ title: 'Deleted', description: 'Child account has been removed' });
                  setShowDeleteConfirm(false);
                  onOpenChange(false);
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message || 'Failed to delete', variant: 'destructive' });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
